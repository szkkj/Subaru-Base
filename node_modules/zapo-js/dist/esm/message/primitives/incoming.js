import { pickIncomingExpirationSeconds } from '../context-info.js';
import { unwrapDeviceSentMessage } from '../encode/device-sent.js';
import { unpadPkcs7 } from '../encode/padding.js';
import { processIncomingNewsletterMessage } from '../kinds/newsletter.js';
import { proto } from '../../proto.js';
import { WA_MESSAGE_TAGS, WA_MESSAGE_TYPES } from '../../protocol/constants.js';
import { canonicalizeOwnAccountJid, isBroadcastJid, isGroupJid, isNewsletterJid, isOwnAccountJid, parseJidFull, parseSignalAddressFromJid, toUserJid } from '../../protocol/jid.js';
import { normalizeUsername } from '../../protocol/username.js';
import { buildAckNode, buildReceiptNode } from '../../transport/node/builders/global.js';
import { decodeNodeContentBase64OrBytes, findNodeChild } from '../../transport/node/helpers.js';
import { longToNumber, parseOptionalInt, toError } from '../../util/primitives.js';
// Addressing fields use conditional includes so they're absent (not own-undefined) when
// the source attr isn't present — the `...keyIdentity` spread then only injects defined
// keys into the event's `key`. `pushName` is destructured straight to the event top-level
// and stays present-as-undefined there.
function extractMessageIdentityAttrs(attrs) {
    const rawRemoteJidAlt = attrs.sender_pn ?? attrs.sender_lid;
    const rawParticipantAlt = attrs.participant_pn ?? attrs.participant_lid;
    const rawRecipientAlt = attrs.peer_recipient_pn ?? attrs.peer_recipient_lid;
    const rawRecipient = attrs.recipient;
    const rawSenderUsername = attrs.participant_username ?? attrs.username;
    const rawRecipientUsername = attrs.recipient_username ?? attrs.peer_recipient_username;
    const senderUsername = rawSenderUsername !== undefined ? normalizeUsername(rawSenderUsername) : undefined;
    const recipientUsername = rawRecipientUsername !== undefined ? normalizeUsername(rawRecipientUsername) : undefined;
    return {
        ...(rawRemoteJidAlt ? { remoteJidAlt: toUserJid(rawRemoteJidAlt) } : {}),
        ...(rawParticipantAlt ? { participantAlt: toUserJid(rawParticipantAlt) } : {}),
        ...(senderUsername !== undefined ? { senderUsername } : {}),
        ...(rawRecipient ? { recipientJid: toUserJid(rawRecipient) } : {}),
        ...(rawRecipientAlt ? { recipientAlt: toUserJid(rawRecipientAlt) } : {}),
        ...(recipientUsername !== undefined ? { recipientUsername } : {}),
        pushName: attrs.notify
    };
}
/**
 * Self-authored 1:1 chat is the recipient, so its alternate addressing is the
 * `recipient*` attrs (the `sender*` attrs describe me). Promotes `recipientAlt`
 * to `remoteJidAlt` and drops the stale sender/recipient fields. Applied
 * whenever the stanza is self-authored 1:1, even when the chat itself did not
 * resolve: the sender attrs always describe the own account there, so letting
 * them through would address the message to the connection's own number.
 * `senderUsername` goes with them; the peer's is in `recipientUsername`.
 */
function promoteRecipientAddressing(identity) {
    return {
        ...(identity.recipientAlt ? { remoteJidAlt: identity.recipientAlt } : {}),
        ...(identity.recipientUsername !== undefined
            ? { recipientUsername: identity.recipientUsername }
            : {})
    };
}
/**
 * Resolves the {@link WaIncomingMessageKey} for a decrypted stanza. `remoteJid`
 * is the chat: the `from`, or the recipient (`recipient` attr, then the
 * deviceSentMessage `destinationJid`) when the message is `fromMe`.
 */
function buildIncomingMessageKey(node, sender, options, destinationJid) {
    const fromUserJid = node.attrs.from ? toUserJid(node.attrs.from) : node.attrs.from;
    const isGroup = fromUserJid ? isGroupJid(fromUserJid) : false;
    const isBroadcast = fromUserJid ? isBroadcastJid(fromUserJid) : false;
    const fromMe = sender
        ? isOwnAccountJid(sender.userJid, options.getMeJid?.(), options.getMeLid?.())
        : false;
    const isSelfSentDirect = fromMe && !isGroup && !isBroadcast;
    const selfSentChat = isSelfSentDirect
        ? (node.attrs.recipient ?? destinationJid ?? undefined)
        : undefined;
    const chatJid = selfSentChat ? toUserJid(selfSentChat) : fromUserJid;
    const { pushName, ...identity } = extractMessageIdentityAttrs(node.attrs);
    const keyIdentity = isSelfSentDirect ? promoteRecipientAddressing(identity) : identity;
    return {
        pushName,
        key: {
            remoteJid: chatJid ?? '',
            id: node.attrs.id ?? '',
            fromMe,
            isGroup,
            isBroadcast,
            isNewsletter: false,
            ...keyIdentity,
            senderDevice: sender?.device ?? 0,
            ...((isGroup || isBroadcast) && sender ? { participant: sender.userJid } : {})
        }
    };
}
function pickNextRetryCount(node) {
    const retryNode = findNodeChild(node, 'retry');
    const parsed = parseOptionalInt(retryNode?.attrs.count);
    if (!parsed || parsed < 1) {
        return 1;
    }
    return parsed + 1;
}
function buildIncomingEventRawNode(node) {
    const nodeContent = node.content;
    if (!Array.isArray(nodeContent) || nodeContent.length === 0) {
        return node;
    }
    let children = null;
    for (let index = 0; index < nodeContent.length; index += 1) {
        const child = nodeContent[index];
        const shouldRedact = child.tag === WA_MESSAGE_TAGS.ENC &&
            (typeof child.content === 'string' || child.content instanceof Uint8Array);
        if (!shouldRedact) {
            if (children) {
                children.push(child);
            }
            continue;
        }
        if (!children) {
            children = nodeContent.slice(0, index);
        }
        children.push({
            tag: child.tag,
            attrs: child.attrs
        });
    }
    if (!children) {
        return node;
    }
    // Strip heavy encrypted payload from event snapshots to reduce retention.
    return {
        tag: node.tag,
        attrs: node.attrs,
        content: children
    };
}
/**
 * Resolves who authored a {@link proto.IWebMessageInfo}. The top-level
 * `participant` wins over `key.participant` - history sync carries the group
 * sender in the former and leaves the latter empty on a large share of records.
 * A self-sent group/broadcast message with neither falls back to this account,
 * preferring `originalSelfAuthorUserJidString` over `meJid` (the current account
 * user JID) so a message authored under a previous identity keeps its author.
 *
 * The participant fields are read whatever the thread type is, matching how
 * WhatsApp Web builds the author: only the self-sent fallback is gated on
 * group/broadcast. A 1:1 record normally carries neither, so this returns
 * `undefined` there and the caller supplies the thread JID instead.
 *
 * `threadJid` overrides `key.remoteJid` for carriers that know the thread out
 * of band, such as a group history bundle whose records may omit it.
 */
export function resolveWebMessageInfoAuthor(webMessageInfo, meJid, threadJid) {
    const key = webMessageInfo.key ?? {};
    const chatJid = threadJid ?? key.remoteJid ?? undefined;
    const isGroupOrBroadcast = chatJid ? isGroupJid(chatJid) || isBroadcastJid(chatJid) : false;
    const rawSelfAuthor = webMessageInfo.originalSelfAuthorUserJidString ?? meJid ?? undefined;
    const selfAuthor = key.fromMe === true && isGroupOrBroadcast && rawSelfAuthor
        ? toUserJid(rawSelfAuthor)
        : undefined;
    return webMessageInfo.participant ?? key.participant ?? selfAuthor ?? undefined;
}
/**
 * Rebuilds a `message` event from a recovered {@link proto.IWebMessageInfo}
 * (placeholder resend). `meJid` is the current account user JID, used as the
 * author fallback for self-sent group messages when the proto carries no
 * participant and no `originalSelfAuthorUserJidString`.
 */
export function buildRecoveredIncomingEvent(webMessageInfo, meJid) {
    const key = webMessageInfo.key ?? {};
    const chatJid = key.remoteJid ?? undefined;
    const fromMe = key.fromMe === true;
    const isGroup = chatJid ? isGroupJid(chatJid) : false;
    const isBroadcast = chatJid ? isBroadcastJid(chatJid) : false;
    const participant = resolveWebMessageInfoAuthor(webMessageInfo, meJid);
    const pushName = webMessageInfo.pushName ?? undefined;
    const rawSender = fromMe ? undefined : isGroup || isBroadcast ? participant : chatJid;
    const sender = rawSender ? parseJidFull(rawSender) : null;
    const senderDevice = sender?.address.device;
    const timestampSeconds = webMessageInfo.messageTimestamp !== null && webMessageInfo.messageTimestamp !== undefined
        ? longToNumber(webMessageInfo.messageTimestamp)
        : undefined;
    const stanzaId = key.id ?? undefined;
    const message = webMessageInfo.message ?? undefined;
    const expirationSeconds = pickIncomingExpirationSeconds(message);
    const rawNode = {
        tag: WA_MESSAGE_TAGS.MESSAGE,
        attrs: {
            ...(stanzaId !== undefined ? { id: stanzaId } : {}),
            ...(chatJid !== undefined ? { from: chatJid } : {}),
            ...(participant !== undefined ? { participant } : {}),
            ...(pushName !== undefined ? { notify: pushName } : {})
        }
    };
    return {
        rawNode,
        key: {
            remoteJid: chatJid ?? '',
            id: stanzaId ?? '',
            fromMe,
            isGroup,
            isBroadcast,
            isNewsletter: false,
            ...(participant !== undefined ? { participant } : {}),
            senderDevice: senderDevice ?? 0
        },
        timestampSeconds,
        ...(expirationSeconds !== undefined ? { expirationSeconds } : {}),
        ...(pushName !== undefined ? { pushName } : {}),
        message
    };
}
function pickSenderKeyDistributionPayload(message) {
    const direct = pickDirectSenderKeyDistributionPayload(message);
    if (direct) {
        return direct;
    }
    const nestedMessage = message.deviceSentMessage?.message ?? undefined;
    if (nestedMessage) {
        return pickSenderKeyDistributionPayload(nestedMessage);
    }
    return null;
}
function pickDirectSenderKeyDistributionPayload(message) {
    const senderKeyDistribution = message.senderKeyDistributionMessage;
    if (senderKeyDistribution?.groupId &&
        senderKeyDistribution.axolotlSenderKeyDistributionMessage) {
        return {
            groupId: senderKeyDistribution.groupId,
            payload: senderKeyDistribution.axolotlSenderKeyDistributionMessage
        };
    }
    const fastRatchetSenderKeyDistribution = message.fastRatchetKeySenderKeyDistributionMessage;
    if (fastRatchetSenderKeyDistribution?.groupId &&
        fastRatchetSenderKeyDistribution.axolotlSenderKeyDistributionMessage) {
        return {
            groupId: fastRatchetSenderKeyDistribution.groupId,
            payload: fastRatchetSenderKeyDistribution.axolotlSenderKeyDistributionMessage
        };
    }
    return null;
}
function shouldEmitIncomingMessage(message) {
    if (!pickDirectSenderKeyDistributionPayload(message)) {
        return true;
    }
    const messageRecord = message;
    for (const field in messageRecord) {
        if (field === 'senderKeyDistributionMessage' ||
            field === 'fastRatchetKeySenderKeyDistributionMessage' ||
            field === '$$unknownFieldCount') {
            continue;
        }
        const value = messageRecord[field];
        if (value === null || value === undefined) {
            continue;
        }
        return true;
    }
    return false;
}
async function sendRetryReceiptForDecryptFailure(node, options, error, encType) {
    const stanzaId = node.attrs.id;
    const from = node.attrs.from;
    if (!stanzaId || !from) {
        return false;
    }
    const retryContext = {
        messageNode: node,
        stanzaId,
        from,
        participant: node.attrs.participant,
        recipient: node.attrs.recipient,
        t: node.attrs.t
    };
    if (options.onDecryptFailure) {
        return options.onDecryptFailure(retryContext, error);
    }
    const retryReceiptNode = buildReceiptNode({
        kind: 'retry',
        node,
        id: stanzaId,
        to: from,
        retryCount: pickNextRetryCount(node)
    });
    try {
        await options.sendNode(retryReceiptNode);
        options.logger.trace('sent retry receipt for undecryptable incoming message', {
            id: stanzaId,
            to: from,
            participant: retryReceiptNode.attrs.participant,
            encType
        });
        return true;
    }
    catch (retryError) {
        options.logger.warn('failed to send retry receipt for incoming message', {
            id: stanzaId,
            from,
            participant: node.attrs.participant,
            encType,
            message: toError(retryError).message
        });
        return false;
    }
}
function processMsmsgEncNode(node, encNode, senderJid, options) {
    try {
        const payload = decodeNodeContentBase64OrBytes(encNode.content, 'message.enc');
        const decoded = proto.MessageSecretMessage.decode(payload);
        if (!decoded.encIv || !decoded.encPayload) {
            options.logger.warn('msmsg payload missing encIv/encPayload', {
                id: node.attrs.id,
                from: node.attrs.from
            });
            options.emitUnhandledStanza?.({
                rawNode: buildIncomingEventRawNode(node),
                stanzaId: node.attrs.id,
                chatJid: node.attrs.from,
                stanzaType: node.attrs.type,
                offline: node.attrs.offline !== undefined,
                reason: 'message.msmsg.missing_payload'
            });
            return { success: false, encType: 'msmsg' };
        }
        const message = {
            secretEncryptedMessage: {
                encIv: decoded.encIv,
                encPayload: decoded.encPayload
            }
        };
        const sender = senderJid ? parseJidFull(senderJid) : null;
        const { key, pushName } = buildIncomingMessageKey(node, sender ? { userJid: sender.userJid, device: sender.address.device } : null, options);
        options.emitIncomingMessage?.({
            rawNode: buildIncomingEventRawNode(node),
            key,
            stanzaType: node.attrs.type,
            offline: node.attrs.offline !== undefined,
            timestampSeconds: parseOptionalInt(node.attrs.t),
            pushName,
            message
        });
        return { success: true, encType: 'msmsg' };
    }
    catch (error) {
        options.logger.warn('failed to decode msmsg payload', {
            id: node.attrs.id,
            from: node.attrs.from,
            message: toError(error).message
        });
        options.emitUnhandledStanza?.({
            rawNode: buildIncomingEventRawNode(node),
            stanzaId: node.attrs.id,
            chatJid: node.attrs.from,
            stanzaType: node.attrs.type,
            offline: node.attrs.offline !== undefined,
            reason: 'message.msmsg.decode_failed'
        });
        return { success: false, encType: 'msmsg', error };
    }
}
/**
 * Hand a decrypted payload to the observer, before the library decodes it.
 *
 * Separate from the decrypt path in three ways that all matter. It hands over a
 * builder rather than an event, so the copy below is only paid where something
 * is subscribed. It swallows the observer's failures, because a listener that
 * throws would otherwise land in the decrypt `catch` and send a message that
 * decrypted perfectly into retry handling. And it copies the plaintext, because
 * the caller hands the same buffer to `decode` on the next line: an observer
 * that trimmed it in place would change the message the library delivers.
 */
function emitDecryptedPayload(node, options, encIndex, encType, plaintext) {
    if (options.emitDecryptedPayload === undefined) {
        return;
    }
    try {
        options.emitDecryptedPayload(() => ({
            rawNode: buildIncomingEventRawNode(node),
            stanzaId: node.attrs.id,
            chatJid: node.attrs.from,
            stanzaType: node.attrs.type,
            offline: node.attrs.offline !== undefined,
            encIndex,
            encType,
            plaintext: plaintext.slice()
        }));
    }
    catch (error) {
        options.logger.warn('decrypted payload observer threw', {
            id: node.attrs.id,
            encType,
            message: toError(error).message
        });
    }
}
async function decryptAndProcessEncNode(node, encNode, encType, encIndex, senderJid, options, decrypt) {
    const logContext = () => ({
        id: node.attrs.id,
        from: node.attrs.from,
        participant: node.attrs.participant
    });
    try {
        const senderAddress = parseSignalAddressFromJid(senderJid);
        const decryptedPayload = await decrypt(decodeNodeContentBase64OrBytes(encNode.content, 'message.enc'), senderAddress);
        const unpaddedPlaintext = unpadPkcs7(decryptedPayload);
        emitDecryptedPayload(node, options, encIndex, encType, unpaddedPlaintext);
        const decodedMessage = proto.Message.decode(unpaddedPlaintext);
        const message = unwrapDeviceSentMessage(decodedMessage) ?? decodedMessage;
        const senderKeyDistribution = pickSenderKeyDistributionPayload(message);
        if (senderKeyDistribution && options.senderKeyManager) {
            try {
                await options.senderKeyManager.processSenderKeyDistributionPayload(senderKeyDistribution.groupId, senderAddress, senderKeyDistribution.payload);
                options.logger.trace('processed incoming sender key distribution', {
                    ...logContext(),
                    groupId: senderKeyDistribution.groupId
                });
            }
            catch (error) {
                options.logger.warn('failed to process incoming sender key distribution', {
                    ...logContext(),
                    groupId: senderKeyDistribution.groupId,
                    message: toError(error).message
                });
            }
        }
        if (shouldEmitIncomingMessage(message)) {
            const { key, pushName } = buildIncomingMessageKey(node, {
                userJid: `${senderAddress.user}@${senderAddress.server}`,
                device: senderAddress.device
            }, options, decodedMessage.deviceSentMessage?.destinationJid ?? undefined);
            const expirationSeconds = pickIncomingExpirationSeconds(message);
            options.emitIncomingMessage?.({
                rawNode: buildIncomingEventRawNode(node),
                key,
                stanzaType: node.attrs.type,
                offline: node.attrs.offline !== undefined,
                timestampSeconds: parseOptionalInt(node.attrs.t),
                ...(expirationSeconds !== undefined ? { expirationSeconds } : {}),
                pushName,
                message
            });
        }
        return { success: true, encType };
    }
    catch (error) {
        options.logger.warn('failed to decrypt incoming message', {
            ...logContext(),
            encType,
            message: toError(error).message
        });
        options.emitUnhandledStanza?.({
            rawNode: buildIncomingEventRawNode(node),
            stanzaId: node.attrs.id,
            chatJid: node.attrs.from,
            stanzaType: node.attrs.type,
            offline: node.attrs.offline !== undefined,
            reason: `message.decrypt_failed.${encType}`
        });
        return { success: false, encType, error };
    }
}
export async function handleIncomingMessageAck(node, options) {
    if (node.tag !== WA_MESSAGE_TAGS.MESSAGE) {
        return false;
    }
    const from = node.attrs.from;
    if (from && isNewsletterJid(from)) {
        return handleIncomingNewsletterMessage(node, options);
    }
    let shouldSendStandardReceipt = true;
    const nodeContent = node.content;
    if (Array.isArray(nodeContent) && nodeContent.length > 0) {
        const senderJid = node.attrs.participant ?? node.attrs.from;
        let hasSuccessfulDecrypt = false;
        let firstDecryptFailure = null;
        let encCount = 0;
        let firstEncType;
        for (const child of nodeContent) {
            if (child.tag !== WA_MESSAGE_TAGS.ENC) {
                continue;
            }
            encCount += 1;
            if (firstEncType === undefined) {
                firstEncType = child.attrs.type;
            }
            let result = null;
            switch (child.attrs.type) {
                case 'skmsg': {
                    if (!senderJid || !node.attrs.from || !options.senderKeyManager) {
                        options.emitUnhandledStanza?.({
                            rawNode: buildIncomingEventRawNode(node),
                            stanzaId: node.attrs.id,
                            chatJid: node.attrs.from,
                            stanzaType: node.attrs.type,
                            offline: node.attrs.offline !== undefined,
                            reason: 'message.skmsg.missing_group_context'
                        });
                        continue;
                    }
                    const groupId = node.attrs.from;
                    result = await decryptAndProcessEncNode(node, child, 'skmsg', encCount - 1, senderJid, options, (ciphertext, senderAddress) => options.senderKeyManager.decryptGroupMessage({
                        groupId,
                        sender: senderAddress,
                        ciphertext
                    }));
                    break;
                }
                case 'msg':
                case 'pkmsg': {
                    if (!senderJid || !options.signalProtocol) {
                        continue;
                    }
                    const encType = child.attrs.type === 'msg' ? 'msg' : 'pkmsg';
                    result = await decryptAndProcessEncNode(node, child, encType, encCount - 1, senderJid, options, (ciphertext, senderAddress) => {
                        const sessionJid = canonicalizeOwnAccountJid(senderJid, options.getMeJid?.(), options.getMeLid?.());
                        return options.signalProtocol.decryptMessage(sessionJid === senderJid
                            ? senderAddress
                            : parseSignalAddressFromJid(sessionJid), {
                            type: encType,
                            ciphertext
                        });
                    });
                    break;
                }
                case 'msmsg': {
                    // Bot streaming chunk: payload is a MessageSecretMessage proto
                    // (encIv + encPayload), not a Signal envelope. The actual
                    // decryption uses the parent prompt's messageSecret and is
                    // performed downstream by `tryDecryptBotChunk`.
                    result = processMsmsgEncNode(node, child, senderJid, options);
                    break;
                }
                default:
                    continue;
            }
            if (result.success)
                hasSuccessfulDecrypt = true;
            else if (!firstDecryptFailure)
                firstDecryptFailure = result;
        }
        if (encCount > 1 && firstEncType === 'skmsg') {
            options.logger.warn('incoming message enc order is unexpected: skmsg first', {
                id: node.attrs.id,
                from: node.attrs.from,
                participant: node.attrs.participant,
                encCount
            });
        }
        if (encCount > 0 && !hasSuccessfulDecrypt && firstDecryptFailure) {
            await sendRetryReceiptForDecryptFailure(node, options, firstDecryptFailure.error, firstDecryptFailure.encType);
            shouldSendStandardReceipt = false;
        }
    }
    const id = node.attrs.id;
    if (!id || !from) {
        options.logger.warn('incoming message missing required attrs for ack/receipt', {
            hasId: Boolean(id),
            hasFrom: Boolean(from),
            type: node.attrs.type
        });
        return true;
    }
    if (node.attrs.type === WA_MESSAGE_TYPES.MEDIA_NOTIFY) {
        const ackNode = buildAckNode({
            kind: 'message',
            node,
            id,
            to: from,
            from: options.getMeJid?.()
        });
        options.logger.trace('sending inbound message ack', {
            id,
            to: from,
            type: ackNode.attrs.type,
            participant: ackNode.attrs.participant
        });
        await options.sendNode(ackNode);
        return true;
    }
    const unavailableNode = findNodeChild(node, 'unavailable');
    if (unavailableNode) {
        const kind = findNodeChild(node, 'bot')
            ? 'bot'
            : unavailableNode.attrs.hosted === 'true'
                ? 'hosted'
                : unavailableNode.attrs.type === 'view_once'
                    ? 'view_once'
                    : 'other';
        const senderJid = node.attrs.participant ?? node.attrs.from;
        const sender = senderJid ? parseJidFull(senderJid) : null;
        const { key, pushName } = buildIncomingMessageKey(node, sender ? { userJid: sender.userJid, device: sender.address.device } : null, options);
        const resendRequested = options.requestPlaceholderResend?.({
            messageNode: node,
            stanzaId: id,
            from,
            participant: node.attrs.participant,
            recipient: node.attrs.recipient,
            t: node.attrs.t
        }) === true;
        options.emitUnavailableMessage?.({
            rawNode: buildIncomingEventRawNode(node),
            key,
            kind,
            resendRequested,
            stanzaType: node.attrs.type,
            offline: node.attrs.offline !== undefined,
            timestampSeconds: parseOptionalInt(node.attrs.t),
            pushName
        });
        const ackNode = buildAckNode({
            kind: 'message',
            node,
            id,
            to: from,
            from: options.getMeJid?.()
        });
        options.logger.trace('acking unavailable incoming message', {
            id,
            to: from,
            type: ackNode.attrs.type,
            participant: ackNode.attrs.participant,
            unavailableKind: kind,
            resendRequested
        });
        await options.sendNode(ackNode);
        return true;
    }
    if (!shouldSendStandardReceipt) {
        return true;
    }
    const receiptNode = buildReceiptNode({
        kind: 'delivery',
        node,
        id,
        to: from
    });
    options.logger.trace('sending inbound message receipt', {
        id,
        to: from,
        type: receiptNode.attrs.type,
        participant: receiptNode.attrs.participant
    });
    await options.sendNode(receiptNode);
    return true;
}
async function handleIncomingNewsletterMessage(node, options) {
    processIncomingNewsletterMessage(node, {
        logger: options.logger,
        emitIncomingMessage: options.emitIncomingMessage,
        emitNewsletterMessageUpdate: options.emitNewsletterMessageUpdate,
        emitUnhandledStanza: options.emitUnhandledStanza
    });
    const id = node.attrs.id;
    const from = node.attrs.from;
    if (!id || !from) {
        options.logger.warn('incoming newsletter message missing required attrs for ack', {
            hasId: Boolean(id),
            hasFrom: Boolean(from),
            type: node.attrs.type
        });
        return true;
    }
    const ackNode = buildAckNode({
        kind: 'message',
        node,
        id,
        to: from
    });
    options.logger.trace('sending inbound newsletter message ack', {
        id,
        to: from,
        type: ackNode.attrs.type
    });
    await options.sendNode(ackNode);
    return true;
}
