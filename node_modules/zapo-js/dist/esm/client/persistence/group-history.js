import { flushPendingWrites, openHistoryBlobStream } from '../persistence/history-blob.js';
import { streamGroupHistoryBundle } from '../../message/kinds/group-history.js';
import { resolveWebMessageInfoAuthor } from '../../message/primitives/incoming.js';
import { proto } from '../../proto.js';
import { isGroupJid, toUserJid } from '../../protocol/jid.js';
import { longToNumber, toError } from '../../util/primitives.js';
const GROUP_HISTORY_MAX_PENDING_WRITES = 1024;
const GROUP_HISTORY_MAX_RECORD_BYTES = 16 * 1024 * 1024;
export async function runGroupHistoryBundle(deps, input) {
    try {
        await processGroupHistoryBundle(deps, input);
    }
    catch (error) {
        deps.logger.warn('failed to process group history bundle', {
            groupJid: input.groupJid,
            id: input.bundleMessageId,
            message: toError(error).message
        });
    }
}
export async function processGroupHistoryBundle(deps, input) {
    const logger = deps.logger.child({
        groupJid: input.groupJid,
        id: input.bundleMessageId
    });
    if (!isGroupJid(input.groupJid)) {
        logger.debug('skipping group history bundle outside a group');
        return;
    }
    if (!isHistoryReceiver(deps, input.bundle)) {
        logger.debug('skipping group history bundle not addressed to this account');
        return;
    }
    const nowMs = Date.now();
    const bundleTtlSeconds = deps.getAbPropNumber('group_history_bundle_time_limit_receiver_enforcement_secs');
    if (input.sentAtSeconds !== undefined &&
        nowMs > (input.sentAtSeconds + bundleTtlSeconds) * 1000) {
        logger.debug('skipping expired group history bundle', {
            sentAtSeconds: input.sentAtSeconds,
            bundleTtlSeconds
        });
        return;
    }
    const blob = await openHistoryBlobStream(deps.mediaTransfer, input.bundle, 'group-history', 'group history bundle');
    const messageTtlSeconds = deps.getAbPropNumber('group_history_messages_time_limit_receiver_enforcement_secs');
    const pendingWrites = [];
    const dropped = { foreignChat: 0, ephemeralExpired: 0, tooOld: 0, stub: 0 };
    let messagesCount = 0;
    let outOfWindowPinsCount = 0;
    let oldestTimestampMs;
    const onMessage = (webMsg, outOfWindow) => {
        if (outOfWindow) {
            outOfWindowPinsCount += 1;
        }
        if (!webMsg.key?.id || !webMsg.message) {
            dropped.stub += 1;
            return undefined;
        }
        if (webMsg.key.remoteJid && webMsg.key.remoteJid !== input.groupJid) {
            dropped.foreignChat += 1;
            return undefined;
        }
        const timestampSeconds = longToNumber(webMsg.messageTimestamp);
        if (isEphemeralExpired(webMsg, timestampSeconds, nowMs)) {
            dropped.ephemeralExpired += 1;
            return undefined;
        }
        if (!outOfWindow &&
            timestampSeconds > 0 &&
            (timestampSeconds + 2 * messageTtlSeconds) * 1000 < nowMs) {
            dropped.tooOld += 1;
            return undefined;
        }
        const timestampMs = timestampSeconds * 1000;
        if (timestampMs > 0 &&
            (oldestTimestampMs === undefined || timestampMs < oldestTimestampMs)) {
            oldestTimestampMs = timestampMs;
        }
        const authorJid = resolveWebMessageInfoAuthor(webMsg, deps.meJid, input.groupJid);
        const write = deps.writeBehind.persistMessageAsync({
            id: webMsg.key.id,
            threadJid: input.groupJid,
            senderJid: authorJid,
            participantJid: authorJid,
            fromMe: webMsg.key.fromMe === true,
            timestampMs: timestampMs || undefined,
            messageBytes: proto.Message.encode(webMsg.message).finish()
        });
        write.catch(() => undefined);
        pendingWrites[pendingWrites.length] = write;
        messagesCount += 1;
        if (pendingWrites.length >= GROUP_HISTORY_MAX_PENDING_WRITES) {
            return flushPendingWrites(pendingWrites);
        }
        return undefined;
    };
    try {
        await streamGroupHistoryBundle(blob.inflated, onMessage, GROUP_HISTORY_MAX_RECORD_BYTES);
    }
    catch (error) {
        blob.inflated.destroy(toError(error));
        await Promise.allSettled(pendingWrites);
        await blob.verified.catch(() => undefined);
        throw toError(error);
    }
    await blob.verified;
    await flushPendingWrites(pendingWrites);
    const droppedCount = dropped.foreignChat + dropped.ephemeralExpired + dropped.tooOld + dropped.stub;
    logger.debug('processed group history bundle', {
        messagesCount,
        outOfWindowPinsCount,
        droppedCount,
        dropped
    });
    const event = {
        groupJid: input.groupJid,
        senderJid: input.senderJid,
        bundleMessageId: input.bundleMessageId,
        messagesCount,
        outOfWindowPinsCount,
        droppedCount,
        oldestTimestampMs,
        historyReceivers: [...(input.bundle.messageHistoryMetadata?.historyReceivers ?? [])]
    };
    deps.emitEvent('group_history_bundle', event);
}
/**
 * A bundle is only ours to process when this account is listed in
 * `historyReceivers`. The list may address us by either PN or LID, so both
 * forms of the local identity are compared.
 */
function isHistoryReceiver(deps, bundle) {
    const receivers = bundle.messageHistoryMetadata?.historyReceivers;
    if (!receivers || receivers.length === 0) {
        return false;
    }
    const meUserJid = deps.meJid ? toUserJid(deps.meJid) : null;
    const meUserLid = deps.meLid ? toUserJid(deps.meLid) : null;
    if (!meUserJid && !meUserLid) {
        return false;
    }
    for (let index = 0; index < receivers.length; index += 1) {
        const receiver = toUserJid(receivers[index]);
        if (receiver === meUserJid || receiver === meUserLid) {
            return true;
        }
    }
    return false;
}
function isEphemeralExpired(webMsg, timestampSeconds, nowMs) {
    const duration = webMsg.ephemeralDuration;
    if (!duration) {
        return false;
    }
    const startSeconds = longToNumber(webMsg.ephemeralStartTimestamp) || timestampSeconds;
    if (startSeconds <= 0) {
        return false;
    }
    return (startSeconds + duration) * 1000 <= nowMs;
}
