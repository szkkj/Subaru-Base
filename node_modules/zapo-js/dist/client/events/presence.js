"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePresenceNode = parsePresenceNode;
const jid_1 = require("../../protocol/jid");
const presence_1 = require("../../protocol/presence");
const primitives_1 = require("../../util/primitives");
function parseLastSeen(value) {
    if (value === presence_1.WA_PRESENCE_LAST_SENTINELS.DENY) {
        return { kind: 'privacy_denied' };
    }
    if (value === presence_1.WA_PRESENCE_LAST_SENTINELS.NONE) {
        return { kind: 'never_online' };
    }
    if (value === presence_1.WA_PRESENCE_LAST_SENTINELS.ERROR) {
        return { kind: 'unknown' };
    }
    const unixSeconds = (0, primitives_1.parseOptionalInt)(value);
    if (unixSeconds === undefined) {
        return { kind: 'unknown' };
    }
    return { kind: 'timestamp', unixSeconds };
}
function parsePresenceNode(node) {
    const from = node.attrs.from;
    const isGroup = from !== undefined && (0, jid_1.isGroupJid)(from);
    const type = node.attrs.type === presence_1.WA_PRESENCE_TYPES.UNAVAILABLE
        ? presence_1.WA_PRESENCE_TYPES.UNAVAILABLE
        : presence_1.WA_PRESENCE_TYPES.AVAILABLE;
    const result = { type };
    if (isGroup) {
        const count = (0, primitives_1.parseOptionalInt)(node.attrs.count);
        if (count !== undefined) {
            result.groupOnlineCount = count;
        }
        else if (type === presence_1.WA_PRESENCE_TYPES.UNAVAILABLE) {
            result.groupOnlineCount = 0;
        }
        return result;
    }
    if (type === presence_1.WA_PRESENCE_TYPES.UNAVAILABLE && node.attrs.last !== undefined) {
        result.lastSeen = parseLastSeen(node.attrs.last);
    }
    return result;
}
