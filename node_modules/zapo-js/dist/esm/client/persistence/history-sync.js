import { flushPendingWrites, openHistoryBlobStream } from '../persistence/history-blob.js';
import { resolveWebMessageInfoAuthor } from '../../message/primitives/incoming.js';
import { proto } from '../../proto.js';
import { isBroadcastJid, isGroupJid, isUserJid } from '../../protocol/jid.js';
import { normalizeEphemeralSettingSeconds } from '../../protocol/message.js';
import { normalizeUsername } from '../../protocol/username.js';
import { concatBytes, TEXT_DECODER } from '../../util/bytes.js';
import { longToNumber, toError } from '../../util/primitives.js';
import { PROTO_STREAM_EVENT_KINDS, streamProtoFields } from '../../util/proto-stream.js';
import { PROTO_WIRE_TYPES } from '../../util/protoscan.js';
const HANDLED_SYNC_TYPES = new Set([
    proto.Message.HistorySyncType.INITIAL_BOOTSTRAP,
    proto.Message.HistorySyncType.RECENT,
    proto.Message.HistorySyncType.FULL,
    proto.Message.HistorySyncType.PUSH_NAME,
    proto.Message.HistorySyncType.ON_DEMAND,
    proto.Message.HistorySyncType.NON_BLOCKING_DATA
]);
const HISTORY_SYNC_MAX_PENDING_WRITES = 1024;
const HISTORY_SYNC_MAX_RECORD_BYTES = 16 * 1024 * 1024;
/**
 * Ceiling on messages held while waiting for their `Conversation.id`. Field order
 * puts the id first, so this only fills if a serializer reverses it, and letting
 * it grow would rebuild the very peak the streaming pass removes. Exceeding it
 * fails the chunk rather than dropping records: an aborted chunk stays unacked
 * and gets resent, while a dropped one would be acked and lost for good.
 */
const HISTORY_SYNC_MAX_PARKED_MESSAGES = 1024;
export const HISTORY_SYNC_FIELDS = Object.freeze({
    CONVERSATIONS: 2,
    CHUNK_ORDER: 5,
    PROGRESS: 6,
    PUSHNAMES: 7,
    PHONE_NUMBER_TO_LID_MAPPINGS: 15,
    NCT_SALT: 19,
    INLINE_CONTACTS: 20
});
export const CONVERSATION_FIELDS = Object.freeze({
    ID: 1,
    MESSAGES: 2
});
export async function runHistorySyncNotification(deps, notification) {
    try {
        await processHistorySyncNotification(deps, notification);
    }
    catch (error) {
        deps.logger.warn('failed to process history sync notification', {
            syncType: notification.syncType,
            chunkOrder: notification.chunkOrder,
            message: toError(error).message
        });
    }
}
/**
 * Applies one history sync chunk while it downloads, descending into
 * `conversations` so peak memory tracks the largest single message and not the
 * chunk. Chunk-wide records settle after the stream, once every LID mapping is in.
 */
export async function processHistorySyncNotification(deps, notification) {
    const syncType = notification.syncType;
    if (syncType === null || syncType === undefined) {
        deps.logger.debug('skipping history sync notification without syncType');
        return;
    }
    if (!HANDLED_SYNC_TYPES.has(syncType)) {
        deps.logger.debug('skipping unhandled history sync type', { syncType });
        if (syncType === proto.Message.HistorySyncType.INITIAL_STATUS_V3 && deps.onProcessed) {
            await deps.onProcessed(syncType);
        }
        return;
    }
    const blob = await openHistoryBlobStream(deps.mediaTransfer, notification, 'history', 'history sync', notification.initialHistBootstrapInlinePayload);
    const state = {
        nowMs: Date.now(),
        pendingWrites: [],
        pushnames: [],
        inlineContacts: [],
        pnToLid: new Map(),
        tokenConversations: [],
        nctSalt: null,
        chunkOrder: null,
        progress: null,
        conversationsCount: 0,
        messagesCount: 0
    };
    try {
        await consumeHistorySyncStream(deps, blob.inflated, state);
    }
    catch (error) {
        blob.inflated.destroy(toError(error));
        await Promise.allSettled(state.pendingWrites);
        await blob.verified.catch(() => undefined);
        throw toError(error);
    }
    await blob.verified;
    await settleHistorySyncChunk(deps, state);
    deps.logger.info('decoded history sync chunk', {
        syncType,
        chunkOrder: state.chunkOrder,
        progress: state.progress,
        conversations: state.conversationsCount,
        messages: state.messagesCount,
        pushnames: state.pushnames.length,
        inlineContacts: state.inlineContacts.length
    });
    const event = {
        syncType,
        messagesCount: state.messagesCount,
        conversationsCount: state.conversationsCount,
        pushnamesCount: state.pushnames.length,
        inlineContactsCount: state.inlineContacts.length,
        chunkOrder: state.chunkOrder ?? undefined,
        progress: state.progress ?? undefined
    };
    await flushPendingWrites(state.pendingWrites);
    deps.emitEvent('history_sync_chunk', event);
    if (deps.onProcessed) {
        await deps.onProcessed(syncType);
    }
}
async function consumeHistorySyncStream(deps, inflated, state) {
    let headerParts = null;
    let threadJid = null;
    let parked = null;
    const onEvent = (event) => {
        if (event.kind === PROTO_STREAM_EVENT_KINDS.ENTER) {
            headerParts = [];
            threadJid = null;
            parked = null;
            state.conversationsCount += 1;
            return undefined;
        }
        if (event.kind === PROTO_STREAM_EVENT_KINDS.LEAVE) {
            const parts = headerParts;
            const jid = threadJid;
            const pending = parked;
            headerParts = null;
            threadJid = null;
            parked = null;
            return parts ? closeConversation(deps, state, parts, jid, pending) : undefined;
        }
        if (event.depth === 1) {
            if (event.fieldNumber === CONVERSATION_FIELDS.MESSAGES &&
                event.wireType === PROTO_WIRE_TYPES.LEN) {
                const message = readHistoryMessage(event.value);
                if (!message) {
                    return undefined;
                }
                if (!threadJid) {
                    parked ?? (parked = []);
                    if (parked.length >= HISTORY_SYNC_MAX_PARKED_MESSAGES) {
                        throw new Error(`history sync parked ${parked.length} messages with no thread jid, exceeding the ${HISTORY_SYNC_MAX_PARKED_MESSAGES} limit`);
                    }
                    parked[parked.length] = message;
                    return undefined;
                }
                persistHistoryMessage(deps, state, message, threadJid);
                return maybeFlush(state);
            }
            if (headerParts) {
                if (event.fieldNumber === CONVERSATION_FIELDS.ID &&
                    event.wireType === PROTO_WIRE_TYPES.LEN) {
                    threadJid = TEXT_DECODER.decode(event.value);
                }
                headerParts[headerParts.length] = event.raw.slice();
            }
            return undefined;
        }
        if (event.depth !== 0) {
            return undefined;
        }
        if (event.wireType === PROTO_WIRE_TYPES.VARINT) {
            if (event.fieldNumber === HISTORY_SYNC_FIELDS.CHUNK_ORDER) {
                state.chunkOrder = event.varintValue;
            }
            else if (event.fieldNumber === HISTORY_SYNC_FIELDS.PROGRESS) {
                state.progress = event.varintValue;
            }
            return undefined;
        }
        if (event.wireType !== PROTO_WIRE_TYPES.LEN) {
            return undefined;
        }
        if (event.fieldNumber === HISTORY_SYNC_FIELDS.PUSHNAMES) {
            state.pushnames[state.pushnames.length] = proto.Pushname.decode(event.value);
        }
        else if (event.fieldNumber === HISTORY_SYNC_FIELDS.PHONE_NUMBER_TO_LID_MAPPINGS) {
            const map = proto.PhoneNumberToLIDMapping.decode(event.value);
            if (map.pnJid && map.lidJid) {
                state.pnToLid.set(map.pnJid, map.lidJid);
            }
        }
        else if (event.fieldNumber === HISTORY_SYNC_FIELDS.INLINE_CONTACTS) {
            const contact = proto.InlineContact.decode(event.value);
            state.inlineContacts[state.inlineContacts.length] = contact;
            if (contact.pnJid && contact.lidJid) {
                state.pnToLid.set(contact.pnJid, contact.lidJid);
            }
        }
        else if (event.fieldNumber === HISTORY_SYNC_FIELDS.NCT_SALT) {
            state.nctSalt = event.value.slice();
        }
        return undefined;
    };
    await streamProtoFields(inflated, onEvent, {
        shouldDescend: (fieldNumber, depth) => depth === 0 && fieldNumber === HISTORY_SYNC_FIELDS.CONVERSATIONS,
        maxFieldBytes: HISTORY_SYNC_MAX_RECORD_BYTES
    });
}
async function closeConversation(deps, state, headerParts, threadJid, parked) {
    const conversation = proto.Conversation.decode(concatBytes(headerParts));
    const resolvedJid = threadJid ?? conversation.id;
    if (!resolvedJid) {
        deps.logger.debug('skipping history sync conversation without thread jid');
        return;
    }
    if (conversation.pnJid) {
        const lidJid = conversation.lidJid ?? conversation.accountLid;
        if (lidJid) {
            state.pnToLid.set(conversation.pnJid, lidJid);
        }
    }
    if (deps.onPrivacyTokens &&
        (conversation.tcToken ||
            conversation.tcTokenTimestamp ||
            conversation.tcTokenSenderTimestamp)) {
        state.tokenConversations[state.tokenConversations.length] = {
            jid: resolvedJid,
            tcToken: conversation.tcToken ? new Uint8Array(conversation.tcToken) : undefined,
            tcTokenTimestamp: longToNumber(conversation.tcTokenTimestamp) || undefined,
            tcTokenSenderTimestamp: longToNumber(conversation.tcTokenSenderTimestamp) || undefined
        };
    }
    const ephemeralExpiration = conversation.ephemeralExpiration ?? undefined;
    const ephemeralSettingTimestamp = normalizeEphemeralSettingSeconds(longToNumber(conversation.ephemeralSettingTimestamp)) ||
        undefined;
    if (deps.chatMetadataStore && ephemeralExpiration !== undefined) {
        pushWrite(state, deps.chatMetadataStore
            .upsertChatMetadata({
            chatJid: resolvedJid,
            ephemeralExpiration,
            ...(ephemeralSettingTimestamp !== undefined
                ? { ephemeralSettingTimestamp }
                : {}),
            updatedAtMs: state.nowMs
        })
            .catch((error) => {
            deps.logger.debug('failed to cache history sync chat metadata', {
                jid: resolvedJid,
                message: toError(error).message
            });
        }));
    }
    pushWrite(state, deps.writeBehind.persistThreadAsync({
        jid: resolvedJid,
        name: conversation.name ?? undefined,
        unreadCount: conversation.unreadCount ?? undefined,
        archived: conversation.archived ?? undefined,
        pinned: conversation.pinned ?? undefined,
        muteEndMs: longToNumber(conversation.muteEndTime) || undefined,
        markedAsUnread: conversation.markedAsUnread ?? undefined,
        ephemeralExpiration,
        ephemeralSettingTimestamp
    }));
    if (isUserJid(resolvedJid) || (conversation.lidJid ?? conversation.accountLid)) {
        const contactDisplay = conversation.displayName || undefined;
        const contactUsername = conversation.username
            ? normalizeUsername(conversation.username)
            : undefined;
        const contactPn = conversation.pnJid ?? undefined;
        const contactLid = conversation.lidJid ?? conversation.accountLid ?? undefined;
        if (contactDisplay || contactUsername || contactPn || contactLid) {
            pushWrite(state, deps.writeBehind.persistContactAsync({
                jid: contactLid ?? resolvedJid,
                displayName: contactDisplay,
                username: contactUsername,
                phoneNumber: contactPn,
                lastUpdatedMs: state.nowMs
            }));
        }
    }
    for (const message of parked ?? []) {
        persistHistoryMessage(deps, state, message, resolvedJid);
    }
    await maybeFlush(state);
}
/**
 * Resolves the author here rather than at decode time because a message may be
 * read before its `Conversation.id`, and the thread type decides both the
 * self-sent fallback and the shape of the record.
 *
 * `participantJid` carries the group/broadcast author and stays absent in 1:1
 * threads, where `senderJid` falls back to the thread JID - the same shape the
 * live message path persists. A group author that stays unresolved leaves both
 * fields empty: writing the group JID there would read downstream as if the
 * group itself had sent the message.
 */
function persistHistoryMessage(deps, state, message, threadJid) {
    state.messagesCount += 1;
    const authorJid = resolveWebMessageInfoAuthor(message.authorInfo, deps.meJid, threadJid);
    const isGroupOrBroadcast = isGroupJid(threadJid) || isBroadcastJid(threadJid);
    pushWrite(state, deps.writeBehind.persistMessageAsync({
        id: message.id,
        threadJid,
        senderJid: isGroupOrBroadcast ? authorJid : (authorJid ?? threadJid),
        participantJid: isGroupOrBroadcast ? authorJid : undefined,
        fromMe: message.fromMe,
        timestampMs: message.timestampMs,
        messageBytes: message.messageBytes
    }));
}
async function settleHistorySyncChunk(deps, state) {
    for (const pushname of state.pushnames) {
        if (!pushname.id) {
            continue;
        }
        const lidJid = state.pnToLid.get(pushname.id);
        pushWrite(state, deps.writeBehind.persistContactAsync(lidJid
            ? {
                jid: lidJid,
                pushName: pushname.pushname ?? undefined,
                phoneNumber: pushname.id,
                lastUpdatedMs: state.nowMs
            }
            : {
                jid: pushname.id,
                pushName: pushname.pushname ?? undefined,
                lastUpdatedMs: state.nowMs
            }));
        await maybeFlush(state);
    }
    for (const contact of state.inlineContacts) {
        const jid = contact.lidJid ?? contact.pnJid;
        if (!jid) {
            continue;
        }
        const displayName = contact.fullName || contact.firstName || undefined;
        if (!displayName && !contact.pnJid) {
            continue;
        }
        pushWrite(state, deps.writeBehind.persistContactAsync({
            jid,
            displayName,
            phoneNumber: contact.pnJid ?? undefined,
            lastUpdatedMs: state.nowMs
        }));
        await maybeFlush(state);
    }
    for (const [pnJid, lidJid] of state.pnToLid) {
        pushWrite(state, deps.writeBehind.persistContactAsync({
            jid: lidJid,
            phoneNumber: pnJid,
            lastUpdatedMs: state.nowMs
        }));
        await maybeFlush(state);
    }
    if (deps.onPrivacyTokens && state.tokenConversations.length > 0) {
        pushWrite(state, deps.onPrivacyTokens(state.tokenConversations));
    }
    if (deps.onNctSalt && state.nctSalt) {
        pushWrite(state, deps.onNctSalt(state.nctSalt));
    }
}
/** `null` for content-less stubs, which duplicate live notification stanzas. */
function readHistoryMessage(record) {
    const webMsg = proto.HistorySyncMsg.decode(record).message;
    if (!webMsg?.key?.id || !webMsg.message) {
        return null;
    }
    const timestampMs = longToNumber(webMsg.messageTimestamp) * 1000;
    return {
        id: webMsg.key.id,
        authorInfo: {
            key: { fromMe: webMsg.key.fromMe, participant: webMsg.key.participant },
            participant: webMsg.participant,
            originalSelfAuthorUserJidString: webMsg.originalSelfAuthorUserJidString
        },
        fromMe: webMsg.key.fromMe === true,
        timestampMs: timestampMs || undefined,
        messageBytes: proto.Message.encode(webMsg.message).finish()
    };
}
/** The no-op handler keeps a queued rejection observed until the flush rejects on it. */
function pushWrite(state, write) {
    write.catch(() => undefined);
    state.pendingWrites[state.pendingWrites.length] = write;
}
function maybeFlush(state) {
    if (state.pendingWrites.length >= HISTORY_SYNC_MAX_PENDING_WRITES) {
        return flushPendingWrites(state.pendingWrites);
    }
    return undefined;
}
