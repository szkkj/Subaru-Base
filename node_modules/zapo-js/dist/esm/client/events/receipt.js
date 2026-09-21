import { WA_MESSAGE_TYPES } from '../../protocol/constants.js';
import { isGroupOrBroadcastJid } from '../../protocol/jid.js';
import { findNodeChild, getNodeChildrenNonEmptyAttrValuesByTag, hasNodeChild } from '../../transport/node/helpers.js';
function needsParticipant(target) {
    if (target.isGroupChat !== undefined || target.isBroadcastChat !== undefined) {
        return target.isGroupChat === true || target.isBroadcastChat === true;
    }
    return isGroupOrBroadcastJid(target.chatJid);
}
export function aggregateReceiptTargets(targets) {
    const groups = new Map();
    for (const target of targets) {
        const participant = needsParticipant(target) && target.senderJid && target.senderJid !== target.chatJid
            ? target.senderJid
            : undefined;
        const key = `${target.chatJid}|${participant ?? ''}`;
        let group = groups.get(key);
        if (!group) {
            group = { jid: target.chatJid, participant, ids: [] };
            groups.set(key, group);
        }
        group.ids.push(target.id);
    }
    return [...groups.values()];
}
/**
 * Resolves every message id a `<receipt>` acknowledges, mirroring WhatsApp
 * Web's `externalIds`. A batch receipt carries the extra ids in a
 * `<list><item id=.../>` block; the top-level `attrs.id` is just one of them.
 *
 * - `<list><item>` ids come first. For `type="view"` receipts the item key is
 *   `server_id` (not `id`), and the top-level id is NOT appended.
 * - Otherwise the top-level `attrs.id` is appended last.
 * - Aggregated receipts (carrying a `<participants>` child) are out of scope:
 *   their ids live in `<user>` children, so this falls back to the single
 *   top-level id for them.
 *
 * No dedup: matches wa-web, which pushes the top id without checking the list.
 */
export function extractReceiptIds(node) {
    const topId = node.attrs.id;
    if (hasNodeChild(node, 'participants')) {
        return topId ? [topId] : [];
    }
    const isView = node.attrs.type === WA_MESSAGE_TYPES.RECEIPT_TYPE_VIEW;
    const list = findNodeChild(node, 'list');
    const ids = list
        ? [...getNodeChildrenNonEmptyAttrValuesByTag(list, 'item', isView ? 'server_id' : 'id')]
        : [];
    if (!isView && topId) {
        ids.push(topId);
    }
    return ids;
}
