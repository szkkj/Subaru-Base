"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGroupHistoryBundle = runGroupHistoryBundle;
exports.processGroupHistoryBundle = processGroupHistoryBundle;
const history_blob_1 = require("../persistence/history-blob");
const group_history_1 = require("../../message/kinds/group-history");
const incoming_1 = require("../../message/primitives/incoming");
const _proto_1 = require("../../proto");
const jid_1 = require("../../protocol/jid");
const primitives_1 = require("../../util/primitives");
const GROUP_HISTORY_MAX_PENDING_WRITES = 1024;
const GROUP_HISTORY_MAX_RECORD_BYTES = 16 * 1024 * 1024;
async function runGroupHistoryBundle(deps, input) {
    try {
        await processGroupHistoryBundle(deps, input);
    }
    catch (error) {
        deps.logger.warn('failed to process group history bundle', {
            groupJid: input.groupJid,
            id: input.bundleMessageId,
            message: (0, primitives_1.toError)(error).message
        });
    }
}
async function processGroupHistoryBundle(deps, input) {
    const logger = deps.logger.child({
        groupJid: input.groupJid,
        id: input.bundleMessageId
    });
    if (!(0, jid_1.isGroupJid)(input.groupJid)) {
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
    const blob = await (0, history_blob_1.openHistoryBlobStream)(deps.mediaTransfer, input.bundle, 'group-history', 'group history bundle');
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
        const timestampSeconds = (0, primitives_1.longToNumber)(webMsg.messageTimestamp);
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
        const authorJid = (0, incoming_1.resolveWebMessageInfoAuthor)(webMsg, deps.meJid, input.groupJid);
        const write = deps.writeBehind.persistMessageAsync({
            id: webMsg.key.id,
            threadJid: input.groupJid,
            senderJid: authorJid,
            participantJid: authorJid,
            fromMe: webMsg.key.fromMe === true,
            timestampMs: timestampMs || undefined,
            messageBytes: _proto_1.proto.Message.encode(webMsg.message).finish()
        });
        write.catch(() => undefined);
        pendingWrites[pendingWrites.length] = write;
        messagesCount += 1;
        if (pendingWrites.length >= GROUP_HISTORY_MAX_PENDING_WRITES) {
            return (0, history_blob_1.flushPendingWrites)(pendingWrites);
        }
        return undefined;
    };
    try {
        await (0, group_history_1.streamGroupHistoryBundle)(blob.inflated, onMessage, GROUP_HISTORY_MAX_RECORD_BYTES);
    }
    catch (error) {
        blob.inflated.destroy((0, primitives_1.toError)(error));
        await Promise.allSettled(pendingWrites);
        await blob.verified.catch(() => undefined);
        throw (0, primitives_1.toError)(error);
    }
    await blob.verified;
    await (0, history_blob_1.flushPendingWrites)(pendingWrites);
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
    const meUserJid = deps.meJid ? (0, jid_1.toUserJid)(deps.meJid) : null;
    const meUserLid = deps.meLid ? (0, jid_1.toUserJid)(deps.meLid) : null;
    if (!meUserJid && !meUserLid) {
        return false;
    }
    for (let index = 0; index < receivers.length; index += 1) {
        const receiver = (0, jid_1.toUserJid)(receivers[index]);
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
    const startSeconds = (0, primitives_1.longToNumber)(webMsg.ephemeralStartTimestamp) || timestampSeconds;
    if (startSeconds <= 0) {
        return false;
    }
    return (startSeconds + duration) * 1000 <= nowMs;
}
