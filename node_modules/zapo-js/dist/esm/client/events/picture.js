import { findNodeChild } from '../../transport/node/helpers.js';
import { parseOptionalInt } from '../../util/primitives.js';
const PICTURE_ACTION_TAGS = [
    'set',
    'delete',
    'request',
    'set_avatar'
];
export function parsePictureNotificationEvents(node) {
    for (const action of PICTURE_ACTION_TAGS) {
        const actionNode = findNodeChild(node, action);
        if (!actionNode)
            continue;
        const event = {
            rawNode: node,
            stanzaId: node.attrs.id,
            chatJid: node.attrs.from,
            stanzaType: node.attrs.type,
            offline: node.attrs.offline !== undefined,
            action,
            targetJid: actionNode.attrs.jid,
            authorJid: actionNode.attrs.author,
            timestampSeconds: parseOptionalInt(node.attrs.t),
            pictureId: action === 'set' ? parseOptionalInt(actionNode.attrs.id) : undefined,
            contactHash: actionNode.attrs.hash
        };
        return { events: [event], unhandled: [] };
    }
    return { events: [], unhandled: [] };
}
