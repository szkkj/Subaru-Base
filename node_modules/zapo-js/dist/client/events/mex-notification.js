"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMexNotification = parseMexNotification;
const nodes_1 = require("../../protocol/nodes");
const helpers_1 = require("../../transport/node/helpers");
const coercion_1 = require("../../util/coercion");
function normalizeUsernameSet(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_username_on_change);
    if (!payload)
        return null;
    const username = (0, coercion_1.tryAsString)(payload.username);
    const lidJid = (0, coercion_1.tryAsString)(payload.lid);
    if (!username || !lidJid)
        return null;
    return {
        kind: 'username_set',
        operationName: 'UsernameSetNotification',
        username,
        lidJid
    };
}
function normalizeUsernameDelete(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_username_delete);
    if (!payload)
        return null;
    const lidJid = (0, coercion_1.tryAsString)(payload.lid);
    if (!lidJid)
        return null;
    return {
        kind: 'username_delete',
        operationName: 'UsernameDeleteNotification',
        lidJid,
        displayName: (0, coercion_1.tryAsString)(payload.display_name)
    };
}
function normalizeUsernameUpdateHint(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_username_on_update_side_sub);
    if (!payload)
        return null;
    const contactHash = (0, coercion_1.tryAsString)(payload.hash);
    if (!contactHash)
        return null;
    return {
        kind: 'username_update_hint',
        operationName: 'UsernameUpdateNotification',
        contactHash
    };
}
function normalizeOwnUsernameSync(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_wa_user);
    if (!payload)
        return null;
    const ownLidJid = (0, coercion_1.tryAsString)(payload.lid_jid);
    if (!ownLidJid)
        return null;
    const info = (0, coercion_1.tryAsRecord)(payload.username_info);
    return {
        kind: 'own_username_sync',
        operationName: 'AccountSyncUsernameNotification',
        ownLidJid,
        username: info ? (0, coercion_1.tryAsString)(info.username) : null,
        state: info ? (0, coercion_1.tryAsString)(info.state) : null,
        pin: info ? (0, coercion_1.tryAsString)(info.pin) : null
    };
}
function normalizeTextStatusUpdate(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_text_status_on_update);
    if (!payload)
        return null;
    const jid = (0, coercion_1.tryAsString)(payload.jid);
    if (!jid)
        return null;
    const emojiNode = (0, coercion_1.tryAsRecord)(payload.emoji);
    return {
        kind: 'text_status_update',
        operationName: 'TextStatusUpdateNotification',
        jid,
        text: (0, coercion_1.tryAsString)(payload.text),
        emoji: emojiNode ? (0, coercion_1.tryAsString)(emojiNode.content) : null,
        ephemeralDurationSec: (0, coercion_1.tryAsNumber)(payload.ephemeral_duration_sec),
        lastUpdateTime: (0, coercion_1.tryAsNumber)(payload.last_update_time)
    };
}
function normalizeTextStatusUpdateHint(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_text_status_on_update_side_sub);
    if (!payload)
        return null;
    const contactHash = (0, coercion_1.tryAsString)(payload.hash);
    if (!contactHash)
        return null;
    return {
        kind: 'text_status_update_hint',
        operationName: 'TextStatusUpdateNotificationSideSub',
        contactHash
    };
}
function normalizeLidChange(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_lid_change);
    if (!payload)
        return null;
    const oldLidJid = (0, coercion_1.tryAsString)(payload.old);
    const newLidJid = (0, coercion_1.tryAsString)(payload.new);
    if (!oldLidJid || !newLidJid)
        return null;
    return {
        kind: 'lid_change',
        operationName: 'LidChangeNotification',
        oldLidJid,
        newLidJid
    };
}
function normalizeMessageCapping(data) {
    const payload = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data)?.xwa2_notify_new_chat_messages_capping_info_update);
    if (!payload)
        return null;
    const cappingStatus = (0, coercion_1.tryAsString)(payload.capping_status);
    if (!cappingStatus)
        return null;
    return {
        kind: 'message_capping',
        operationName: 'MessageCappingInfoNotification',
        cappingStatus,
        oteStatus: (0, coercion_1.tryAsString)(payload.ote_status),
        mvStatus: (0, coercion_1.tryAsString)(payload.mv_status),
        totalQuota: (0, coercion_1.tryAsNumber)(payload.total_quota),
        usedQuota: (0, coercion_1.tryAsNumber)(payload.used_quota),
        cycleStartTimestamp: (0, coercion_1.tryAsNumber)(payload.cycle_start_timestamp),
        cycleEndTimestamp: (0, coercion_1.tryAsNumber)(payload.cycle_end_timestamp),
        serverSentTimestamp: (0, coercion_1.tryAsNumber)(payload.server_sent_timestamp)
    };
}
const OP_NORMALIZERS = {
    UsernameSetNotification: normalizeUsernameSet,
    UsernameDeleteNotification: normalizeUsernameDelete,
    UsernameUpdateNotification: normalizeUsernameUpdateHint,
    AccountSyncUsernameNotification: normalizeOwnUsernameSync,
    TextStatusUpdateNotification: normalizeTextStatusUpdate,
    TextStatusUpdateNotificationSideSub: normalizeTextStatusUpdateHint,
    LidChangeNotification: normalizeLidChange,
    MessageCappingInfoNotification: normalizeMessageCapping
};
function parseMexNotification(node) {
    if (node.tag !== nodes_1.WA_NODE_TAGS.NOTIFICATION || node.attrs.type !== 'mex')
        return null;
    const updateNode = (0, helpers_1.findNodeChild)(node, 'update');
    if (!updateNode)
        return null;
    const operationName = updateNode.attrs.op_name;
    if (!operationName)
        return null;
    const payload = (0, helpers_1.getNodeTextContent)(updateNode);
    if (payload === undefined)
        return null;
    let parsedRaw;
    try {
        parsedRaw = JSON.parse(payload);
    }
    catch {
        return null;
    }
    const parsed = (0, coercion_1.tryAsRecord)(parsedRaw);
    if (!parsed)
        return null;
    const errors = Array.isArray(parsed.errors)
        ? parsed.errors
        : [];
    const data = parsed.data ?? null;
    const normalizer = OP_NORMALIZERS[operationName];
    if (normalizer) {
        const normalized = normalizer(data);
        if (normalized) {
            return { ...normalized, errors };
        }
    }
    return {
        kind: 'unknown',
        operationName,
        data,
        errors
    };
}
