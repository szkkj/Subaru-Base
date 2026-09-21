import { isGroupJid } from '../../protocol/jid.js';
import { WA_PRESENCE_LAST_SENTINELS, WA_PRESENCE_TYPES } from '../../protocol/presence.js';
import { parseOptionalInt } from '../../util/primitives.js';
function parseLastSeen(value) {
    if (value === WA_PRESENCE_LAST_SENTINELS.DENY) {
        return { kind: 'privacy_denied' };
    }
    if (value === WA_PRESENCE_LAST_SENTINELS.NONE) {
        return { kind: 'never_online' };
    }
    if (value === WA_PRESENCE_LAST_SENTINELS.ERROR) {
        return { kind: 'unknown' };
    }
    const unixSeconds = parseOptionalInt(value);
    if (unixSeconds === undefined) {
        return { kind: 'unknown' };
    }
    return { kind: 'timestamp', unixSeconds };
}
export function parsePresenceNode(node) {
    const from = node.attrs.from;
    const isGroup = from !== undefined && isGroupJid(from);
    const type = node.attrs.type === WA_PRESENCE_TYPES.UNAVAILABLE
        ? WA_PRESENCE_TYPES.UNAVAILABLE
        : WA_PRESENCE_TYPES.AVAILABLE;
    const result = { type };
    if (isGroup) {
        const count = parseOptionalInt(node.attrs.count);
        if (count !== undefined) {
            result.groupOnlineCount = count;
        }
        else if (type === WA_PRESENCE_TYPES.UNAVAILABLE) {
            result.groupOnlineCount = 0;
        }
        return result;
    }
    if (type === WA_PRESENCE_TYPES.UNAVAILABLE && node.attrs.last !== undefined) {
        result.lastSeen = parseLastSeen(node.attrs.last);
    }
    return result;
}
