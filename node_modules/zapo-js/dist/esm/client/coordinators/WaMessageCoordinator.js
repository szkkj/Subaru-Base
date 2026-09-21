import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { aggregateReceiptTargets } from '../events/receipt.js';
import { assertReadableFile, downloadMediaMessage, isReadableStream } from '../media.js';
import { uploadMedia } from '../messaging/messages.js';
import { MEDIA_UPLOAD_PATHS } from '../../media/constants.js';
import { buildAddonSenderPairs, collectUniqueUserJids, decodeAddonPlaintext, decryptAddonPayloadWithSenderFallback, identifyEncryptedAddon, resolveAddonParentSenderFromKey, resolveParentMessageSecret, resolvePollOptionNames } from '../../message/crypto/addon-crypto.js';
import { unwrapMessage } from '../../message/encode/content.js';
import { resolveMediaPayload } from '../../message/encode/media-payload.js';
import { encodeGroupHistoryBundle } from '../../message/kinds/group-history.js';
import { proto } from '../../proto.js';
import { applyDeviceToJid, isGroupJid, normalizeRecipientJid } from '../../protocol/jid.js';
import { runMexQuery } from '../../transport/node/mex/client.js';
import { readAllBytes } from '../../util/bytes.js';
import { resolveOptionalPositive, resolvePositive, tryAsNumber, tryAsString } from '../../util/coercion.js';
import { longToNumber, toError } from '../../util/primitives.js';
/** MIME type the group-history bundle is uploaded and advertised under. */
const GROUP_HISTORY_BUNDLE_MIMETYPE = 'application/protobuf';
/** Oldest `messageTimestamp` across `messages`, in seconds; `undefined` when none carries one. */
function oldestTimestampSeconds(messages) {
    let oldest;
    for (let index = 0; index < messages.length; index += 1) {
        const timestamp = longToNumber(messages[index].messageTimestamp);
        if (timestamp > 0 && (oldest === undefined || timestamp < oldest)) {
            oldest = timestamp;
        }
    }
    return oldest;
}
function parseReachoutTimelockMexResponse(data) {
    const root = data?.xwa2_fetch_account_reachout_timelock;
    return {
        isActive: root?.is_active === true,
        enforcementType: tryAsString(root?.enforcement_type),
        enforcementEndsAt: tryAsNumber(root?.time_enforcement_ends)
    };
}
function parseMessageCappingMexResponse(data) {
    const root = data?.xwa2_message_capping_info;
    return {
        totalQuota: tryAsNumber(root?.total_quota),
        usedQuota: tryAsNumber(root?.used_quota),
        cycleStartAt: tryAsNumber(root?.cycle_start_timestamp),
        cycleEndAt: tryAsNumber(root?.cycle_end_timestamp),
        serverSentAt: tryAsNumber(root?.server_sent_timestamp),
        oteStatus: tryAsString(root?.ote_status),
        mvStatus: tryAsString(root?.mv_status),
        cappingStatus: tryAsString(root?.capping_status)
    };
}
const SIDECAR_UPLOAD_TYPES = new Set([
    'video',
    'ptv',
    'audio',
    'gif',
    'ptt'
]);
async function normalizeUploadSource(source) {
    if (source instanceof Uint8Array) {
        return source;
    }
    if (typeof source === 'string') {
        await assertReadableFile(source);
        return createReadStream(source);
    }
    if (isReadableStream(source)) {
        return source;
    }
    throw new Error('media upload received unsupported source type');
}
/**
 * Coordinates outbound message sending, receipts, addon decryption, media
 * upload/download, and the related MEX account queries. Accessed via
 * {@link WaClient.message}.
 */
export class WaMessageCoordinator {
    constructor(deps) {
        this.messageDispatch = deps.messageDispatch;
        this.mediaTransfer = deps.mediaTransfer;
        this.mediaRetry = deps.mediaRetry;
        this.mediaUploadOptions = deps.mediaUploadOptions;
        this.logger = deps.logger;
        this.messageStore = deps.messageStore;
        this.messageSecretStore = deps.messageSecretStore;
        this.trustedContactToken = deps.trustedContactToken;
        this.emitAddon = deps.emitAddon;
        this.mexSocket = deps.mexSocket;
        this.peerDataOperation = deps.peerDataOperation;
        this.isGroupHistorySendEnabled = deps.isGroupHistorySendEnabled;
        this.getAbPropNumber = deps.getAbPropNumber;
    }
    /**
     * Asks the server to backfill older messages for `chatJid` beyond what
     * arrived in the initial history-sync. Implemented as a
     * `PeerDataOperationRequestMessage` (type `HISTORY_SYNC_ON_DEMAND`)
     * sent to this account's own user JID; the response arrives later as
     * a `history_sync_chunk` event the same way the bootstrap chunks do -
     * subscribe before calling if you need to react to the chunk.
     *
     * The method returns once the request is dispatched (with the protocol
     * message id), **not** when the chunk arrives. Pair `oldestMsgId` +
     * `oldestMsgTimestampMs` + `oldestMsgFromMe` from the topmost message
     * currently visible to page backwards correctly.
     */
    async requestHistorySync(input) {
        const chatJid = normalizeRecipientJid(input.chatJid);
        const onDemandMsgCount = resolveOptionalPositive(input.count, 'count');
        if (input.oldestMsgTimestampMs !== undefined) {
            if (!Number.isFinite(input.oldestMsgTimestampMs) ||
                !Number.isSafeInteger(input.oldestMsgTimestampMs) ||
                input.oldestMsgTimestampMs < 0) {
                throw new Error(`invalid oldestMsgTimestampMs: ${input.oldestMsgTimestampMs}`);
            }
        }
        const historySyncOnDemandRequest = {
            chatJid,
            supportInlineResponse: true,
            ...(input.oldestMsgId === undefined ? {} : { oldestMsgId: input.oldestMsgId }),
            ...(input.oldestMsgFromMe === undefined
                ? {}
                : { oldestMsgFromMe: input.oldestMsgFromMe }),
            ...(input.oldestMsgTimestampMs === undefined
                ? {}
                : { oldestMsgTimestampMs: input.oldestMsgTimestampMs }),
            ...(onDemandMsgCount === undefined ? {} : { onDemandMsgCount })
        };
        return this.peerDataOperation.send(proto.Message.PeerDataOperationRequestType.HISTORY_SYNC_ON_DEMAND, { historySyncOnDemandRequest });
    }
    /**
     * Shares recent group history with members who joined after the fact - the
     * counterpart of the `group_history_bundle` event on the receiving side.
     *
     * Sends two messages: the bundle itself, encrypted per device and fanned
     * out **only** to `toJids` (never to the whole group), followed by a hidden
     * notice addressed to everyone so other clients can render the "history was
     * shared" marker.
     *
     * WhatsApp gates the sender side per account through the `group_history_send`
     * AB-prop and rejects the stanza with SMAX_INVALID when it is off, so this
     * throws up front rather than spending an upload. Admin-only groups
     * (`memberShareGroupHistoryMode: 'admin_share'`) reject a share from a
     * regular member server-side - read `client.group.queryGroupMetadata()`
     * first if you want to check that too.
     *
     * @throws when the account is not allowed to share group history, when
     * `groupJid` is not a group, when any of `toJids` is not a current member
     * (or is this account), or when there is nothing to bundle.
     * @example
     * ```ts
     * await client.message.shareGroupHistory('12036@g.us', {
     *     toJids: ['5511999999999@s.whatsapp.net'],
     *     count: 50
     * })
     * ```
     */
    async shareGroupHistory(groupJid, input) {
        const normalizedGroupJid = normalizeRecipientJid(groupJid);
        if (!isGroupJid(normalizedGroupJid)) {
            throw new Error(`shareGroupHistory requires a group jid: ${normalizedGroupJid}`);
        }
        if (input.toJids.length === 0) {
            throw new Error('shareGroupHistory requires at least one recipient');
        }
        const messageLimit = resolvePositive(input.count, this.getAbPropNumber('group_history_message_count_limit'), 'count');
        if (!this.isGroupHistorySendEnabled()) {
            throw new Error('shareGroupHistory is disabled for this account (group_history_send is off)');
        }
        const audience = await this.messageDispatch.resolveGroupHistoryAudience(normalizedGroupJid, input.toJids);
        if (audience.requestedSelf) {
            throw new Error('shareGroupHistory cannot share history with this account itself');
        }
        if (audience.unknownJids.length > 0) {
            throw new Error(`shareGroupHistory recipients are not members of the group (addressing mode: ${audience.addressingMode}): ${audience.unknownJids.join(', ')}`);
        }
        if (audience.historyReceivers.length === 0) {
            throw new Error('shareGroupHistory resolved no recipients');
        }
        const messages = input.messages ??
            (await this.loadGroupHistoryMessages(normalizedGroupJid, messageLimit, input.sinceMs));
        if (messages.length === 0) {
            throw new Error('shareGroupHistory found no messages to share');
        }
        const { compressed } = await encodeGroupHistoryBundle(messages, input.outOfWindowPinnedMessages);
        const upload = await uploadMedia(this.mediaUploadOptions, {
            source: compressed,
            cryptoType: 'group-history',
            uploadPath: MEDIA_UPLOAD_PATHS['group-history'],
            contentType: GROUP_HISTORY_BUNDLE_MIMETYPE,
            sidecar: false,
            logLabel: 'group history bundle upload'
        });
        const oldestInWindow = oldestTimestampSeconds(messages);
        const oldestPin = oldestTimestampSeconds(input.outOfWindowPinnedMessages ?? []);
        const oldestInBundle = oldestPin === undefined
            ? oldestInWindow
            : oldestInWindow === undefined
                ? oldestPin
                : Math.min(oldestInWindow, oldestPin);
        const metadata = {
            historyReceivers: audience.historyReceivers,
            nonHistoryReceivers: audience.nonHistoryReceivers,
            messageCount: messages.length,
            oldestMessageTimestampInWindow: oldestInWindow,
            oldestMessageTimestampInBundle: oldestInBundle
        };
        const bundleResult = await this.send(normalizedGroupJid, {
            messageHistoryBundle: {
                mimetype: GROUP_HISTORY_BUNDLE_MIMETYPE,
                fileSha256: upload.fileSha256,
                fileEncSha256: upload.fileEncSha256,
                mediaKey: upload.mediaKey,
                directPath: upload.directPath,
                mediaKeyTimestamp: this.mediaUploadOptions.serverClock.nowSeconds(),
                messageHistoryMetadata: metadata
            }
        });
        let noticeMessageId;
        try {
            noticeMessageId = (await this.send(normalizedGroupJid, {
                messageHistoryNotice: { messageHistoryMetadata: metadata }
            })).id;
        }
        catch (error) {
            this.logger.warn('group history notice failed after the bundle was delivered', {
                groupJid: normalizedGroupJid,
                id: bundleResult.id,
                receiverCount: audience.historyReceivers.length,
                message: toError(error).message
            });
        }
        this.logger.debug('shared group history', {
            groupJid: normalizedGroupJid,
            id: bundleResult.id,
            messagesCount: messages.length,
            receiverCount: audience.historyReceivers.length
        });
        return {
            bundleMessageId: bundleResult.id,
            noticeMessageId,
            messagesCount: messages.length,
            historyReceivers: audience.historyReceivers,
            nonHistoryReceivers: audience.nonHistoryReceivers
        };
    }
    /**
     * Reads the most recent messages of a group back out of the mailbox store
     * and rebuilds the `WebMessageInfo` shape a bundle carries. Yields nothing
     * when the `messages` store domain is `'none'`.
     */
    async loadGroupHistoryMessages(groupJid, limit, sinceMs) {
        const records = await this.messageStore.listByThread(groupJid, limit);
        const messages = [];
        for (let index = 0; index < records.length; index += 1) {
            const record = records[index];
            if (!record.messageBytes) {
                continue;
            }
            if (sinceMs !== undefined && (record.timestampMs ?? 0) < sinceMs) {
                continue;
            }
            messages[messages.length] = {
                key: {
                    id: record.id,
                    remoteJid: groupJid,
                    fromMe: record.fromMe,
                    participant: record.participantJid ?? record.senderJid
                },
                message: proto.Message.decode(record.messageBytes),
                messageTimestamp: Math.floor((record.timestampMs ?? 0) / 1000)
            };
        }
        return messages;
    }
    /**
     * Fetches the server-side "reachout" timelock that throttles cold outreach
     * to non-contacts, returning the active window when enforcement is on.
     */
    async getReachoutTimelock() {
        const data = await runMexQuery(this.mexSocket, 'FetchReachoutTimelock', {});
        return parseReachoutTimelockMexResponse(data);
    }
    /**
     * Fetches the per-cycle message capping info applied to new-chat threads
     * (quota, used, cycle boundaries, status flags).
     */
    async getNewChatMessageCapping(type = 'INDIVIDUAL_NEW_CHAT_THREAD') {
        const data = await runMexQuery(this.mexSocket, 'FetchNewChatMessageCappingInfo', {
            input: { type }
        });
        return parseMessageCappingMexResponse(data);
    }
    /**
     * Force-refreshes the Signal session(s) for `jid`. Set `reasonIdentity` to
     * `true` when the trigger was an identity change – this also queues a
     * trusted-contact-token reissue.
     */
    async syncSignalSession(jid, reasonIdentity = false) {
        await this.messageDispatch.syncSignalSession(jid, reasonIdentity);
        if (reasonIdentity) {
            this.trustedContactToken.reissueOnIdentityChange(jid).catch((err) => this.logger.warn('tc token reissue on identity change failed', {
                jid,
                message: toError(err).message
            }));
        }
    }
    /**
     * Sends a message (any {@link WaSendMessageContent} kind – text, media,
     * poll, reaction, edit, revoke, etc.) to `to` and returns the publish
     * result containing the stanza id and ack metadata.
     *
     * `to` accepts any JID accepted by {@link normalizeRecipientJid}: bare
     * digits (`'5511999999999'`), a phone JID (`'5511…@s.whatsapp.net'`),
     * a group JID (`'…@g.us'`), or a LID. See the {@link WaSendMessageContent}
     * union for the full kind list.
     *
     * **Gotchas:**
     * - The stanza id is auto-generated unless you set `options.id`. Reusing
     *   an id manually makes the send idempotent on the server but is also how
     *   internal retries (`maxAttempts`) work – don't reuse ids across
     *   logically distinct messages.
     * - Sending to a `@newsletter` JID routes through a separate code path
     *   that ignores most of `options` (no quote/forward/edit semantics).
     * - Addon-crypto kinds (poll-vote, reaction, message-edit, ...) require an
     *   authenticated session (`meJid` present) – throws otherwise.
     * - Group sends fan out to every cached member device. If your
     *   `groupMetadata` cache is empty/disabled, this triggers a metadata IQ
     *   per send (rate-limited server-side, see {@link WaCreateStoreOptions}).
     *
     * @example
     * ```ts
     * // 1. Plain text (string shorthand)
     * await client.message.send('5511999999999', 'hello!')
     *
     * // 2. Reply with mention
     * await client.message.send(groupJid, {
     *     type: 'text',
     *     text: '@5511999999999 ping',
     *     contextInfo: {
     *         mentionedJid: ['5511999999999@s.whatsapp.net'],
     *         quoted: { key: { remoteJid: groupJid, fromMe: false, id: incomingId } }
     *     }
     * })
     *
     * // 3. Image from a file path (the encoder opens + streams it for you)
     * await client.message.send(jid, {
     *     type: 'image',
     *     media: '/tmp/photo.jpg',
     *     mimetype: 'image/jpeg',
     *     caption: 'check this out'
     * })
     *
     * // 4. React to an incoming message (empty emoji = unreact)
     * await client.message.send(event.key.remoteJid, {
     *     type: 'reaction',
     *     emoji: '👍',
     *     target: event.key // or pass the whole event
     * })
     *
     * // 5. Poll
     * const result = await client.message.send(jid, {
     *     type: 'poll',
     *     name: 'lunch?',
     *     options: ['pizza', 'sushi', 'burger'],
     *     selectableCount: 1
     * })
     * console.log('sent as', result.id)
     * ```
     */
    send(to, content, options = {}) {
        return this.messageDispatch.sendMessage(to, content, options);
    }
    async sendReceipt(first, second, third) {
        if (typeof first === 'string') {
            const ids = second;
            await this.dispatchReceipt(first, ids, third ?? {});
            return;
        }
        const events = Array.isArray(first) ? first : [first];
        const options = second ?? {};
        const targets = events.map((event) => {
            if (!event.key.remoteJid || !event.key.id) {
                throw new Error('sendReceipt event is missing key.remoteJid or key.id');
            }
            const senderJid = event.key.participant ?? event.key.remoteJid;
            return {
                chatJid: event.key.remoteJid,
                id: event.key.id,
                senderJid: senderJid
                    ? applyDeviceToJid(senderJid, event.key.senderDevice)
                    : undefined,
                isGroupChat: event.key.isGroup,
                isBroadcastChat: event.key.isBroadcast
            };
        });
        for (const group of aggregateReceiptTargets(targets)) {
            await this.dispatchReceipt(group.jid, group.ids, {
                ...options,
                participant: group.participant
            });
        }
    }
    /**
     * Encrypts and uploads standalone media to the WhatsApp CDN and returns the
     * reusable descriptor, without sending a message - pre-upload once and
     * reference it across sends, or build custom protos. Needs a connected
     * session (the host token comes from a `media_conn` IQ). `source` is bytes,
     * a file path, or a `Readable`. To send the result, spread its fields onto
     * the matching proto message and pass that to {@link send}.
     *
     * @throws when `source` is unsupported, the file is unreadable, or the upload fails.
     * @example
     * ```ts
     * const media = await client.message.upload(await readFile('photo.jpg'), {
     *     type: 'image',
     *     mimetype: 'image/jpeg'
     * })
     * await client.message.send(jid, {
     *     imageMessage: {
     *         url: media.url,
     *         directPath: media.directPath,
     *         mediaKey: media.mediaKey,
     *         fileSha256: media.fileSha256,
     *         fileEncSha256: media.fileEncSha256,
     *         fileLength: media.fileLength,
     *         mediaKeyTimestamp: media.mediaKeyTimestamp,
     *         mimetype: media.mimetype
     *     }
     * })
     * ```
     */
    async upload(source, options) {
        const uploadPath = MEDIA_UPLOAD_PATHS[options.type];
        if (!uploadPath) {
            throw new Error(`unknown media upload type: ${String(options.type)}`);
        }
        const result = await uploadMedia(this.mediaUploadOptions, {
            source: await normalizeUploadSource(source),
            cryptoType: options.type,
            uploadPath,
            contentType: options.mimetype,
            mediaKey: options.mediaKey,
            sidecar: options.sidecar ?? SIDECAR_UPLOAD_TYPES.has(options.type),
            firstFrameLength: options.firstFrameLength,
            timeoutMs: options.timeoutMs,
            signal: options.signal,
            logLabel: 'user media upload'
        });
        return {
            ...result,
            mediaKeyTimestamp: this.mediaUploadOptions.serverClock.nowSeconds(),
            mimetype: options.mimetype
        };
    }
    /**
     * Resolves the media payload inside `source` and returns a `Readable`
     * stream of the decrypted bytes. Throws when the message has no
     * downloadable media.
     *
     * **Caller owns the stream** - pipe it somewhere or call `.destroy()` to
     * release the underlying socket; an unconsumed stream leaks the connection.
     * MAC + SHA-256 verification runs **as bytes are consumed**, so if you
     * abort mid-read you've consumed unverified bytes. Pass `options.signal`
     * to cancel cleanly, or use {@link downloadBytes} / {@link downloadToFile}
     * for one-shot verified downloads.
     */
    async download(source, options = {}) {
        return downloadMediaMessage(source, { ...options, transfer: this.mediaTransfer });
    }
    /**
     * Convenience wrapper around {@link download} that streams the decrypted
     * media directly to `filePath`. On failure the **partial file is not
     * cleaned up** - delete it yourself in the error handler if you don't
     * want to leak corrupted artifacts.
     */
    async downloadToFile(source, filePath, options = {}) {
        const stream = await this.download(source, options);
        await pipeline(stream, createWriteStream(filePath));
    }
    /**
     * Convenience wrapper around {@link download} that buffers the decrypted
     * media into a single `Uint8Array`. Use only for small media – caps via
     * `options.maxBytes`.
     */
    async downloadBytes(source, options = {}) {
        const stream = await this.download(source, options);
        return readAllBytes(stream, { maxBytes: options.maxBytes });
    }
    requestMediaReupload(source, options) {
        if (!('key' in source)) {
            return this.mediaRetry.request(source);
        }
        const key = source.key;
        if (!key.id || !key.remoteJid) {
            throw new Error('requestMediaReupload event is missing key.remoteJid or key.id');
        }
        if (key.isNewsletter) {
            throw new Error('requestMediaReupload is not supported on newsletter messages');
        }
        const payload = resolveMediaPayload(source.message);
        if (!payload) {
            throw new Error('message has no downloadable media');
        }
        return this.mediaRetry.request({
            messageId: key.id,
            chatJid: key.remoteJid,
            mediaKey: payload.mediaKey,
            fromMe: key.fromMe,
            participant: key.participant,
            timeoutMs: options?.timeoutMs
        });
    }
    /**
     * Attempts to decrypt an addon payload (poll vote, reaction, edit, ...)
     * attached to `event` and, on success, emits a typed
     * `WaIncomingAddonEvent`. Silently returns when the parent message
     * secret is missing or the payload is not an addon.
     *
     * Called automatically by the client unless `options.addons.autoDecrypt`
     * is explicitly `false` - you rarely need to invoke it directly. The
     * parent secret is looked up in the in-memory `messageSecret` cache
     * first, then in the `messages` store. If both are `'none'`/missing,
     * decryption fails and the event never fires; failures are logged at
     * `warn` for `secretEncryptedMessage` addons (whose parent can be
     * any message type, so the secret is only available when the
     * `messages` mailbox is active) and at `debug` for the dedicated
     * addon types (reactions, poll votes, event responses, comments)
     * whose parent always carries a persisted secret or is itself
     * short-lived.
     */
    async tryDecryptAddon(event) {
        const message = event.message;
        if (!message)
            return;
        const addon = identifyEncryptedAddon(message);
        if (!addon)
            return;
        const targetMessageId = addon.targetMessageKey.id;
        if (!targetMessageId)
            return;
        const parentEntry = await resolveParentMessageSecret(targetMessageId, this.messageSecretStore, this.messageStore);
        if (!parentEntry) {
            const logCtx = {
                id: event.key.id,
                targetId: targetMessageId,
                kind: addon.kind
            };
            if (unwrapMessage(message).secretEncryptedMessage) {
                this.logger.warn('addon parent message secret not found - enable the `messages` mailbox to support decryption of secretEncryptedMessage addons on arbitrary parents', logCtx);
            }
            else {
                this.logger.debug('addon parent message secret not found', logCtx);
            }
            return;
        }
        const modificationSenderRaw = event.key.participant ?? event.key.remoteJid;
        if (!modificationSenderRaw)
            return;
        const modificationSenderCandidates = collectUniqueUserJids(event.key.fromMe ? event.rawNode.attrs.from : undefined, modificationSenderRaw, event.key.participantAlt, event.key.remoteJidAlt, event.rawNode.attrs.participant_pn, event.rawNode.attrs.sender_pn, event.rawNode.attrs.participant, event.key.isGroup ? undefined : event.rawNode.attrs.from);
        const keyParentSender = resolveAddonParentSenderFromKey(addon.targetMessageKey, event.key.isGroup);
        const parentMsgOriginalSenderCandidates = collectUniqueUserJids(keyParentSender, parentEntry.senderJid);
        const senderPairs = buildAddonSenderPairs({
            parentCandidates: parentMsgOriginalSenderCandidates,
            modificationCandidates: modificationSenderCandidates
        });
        const plaintext = await decryptAddonPayloadWithSenderFallback({
            messageSecret: parentEntry.secret,
            stanzaId: targetMessageId,
            senderPairs,
            modificationType: addon.modificationType,
            ciphertext: addon.encPayload,
            iv: addon.encIv
        });
        let decrypted = decodeAddonPlaintext(addon.kind, plaintext);
        if (decrypted.kind === 'poll_vote' && decrypted.pollVote.selectedOptions) {
            const names = await resolvePollOptionNames(decrypted.pollVote.selectedOptions, targetMessageId, this.messageStore);
            if (names) {
                decrypted = { ...decrypted, selectedOptionNames: names };
            }
        }
        this.emitAddon({
            rawNode: event.rawNode,
            key: event.key,
            stanzaType: event.stanzaType,
            offline: event.offline,
            kind: addon.kind,
            targetMessageId,
            decrypted,
            raw: message
        });
    }
    dispatchReceipt(jid, ids, options) {
        const idArray = typeof ids === 'string' ? [ids] : ids;
        if (idArray.length === 0) {
            throw new Error('sendReceipt requires at least one message id');
        }
        const [id, ...rest] = idArray;
        const input = {
            ...options,
            to: jid,
            id,
            listIds: rest.length > 0 ? rest : undefined
        };
        return this.messageDispatch.sendReceipt(input);
    }
}
