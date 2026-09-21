"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePictureNotificationEvents = parsePictureNotificationEvents;
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
const PICTURE_ACTION_TAGS = [
    'set',
    'delete',
    'request',
    'set_avatar'
];
function parsePictureNotificationEvents(node) {
    for (const action of PICTURE_ACTION_TAGS) {
        const actionNode = (0, helpers_1.findNodeChild)(node, action);
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
            timestampSeconds: (0, primitives_1.parseOptionalInt)(node.attrs.t),
            pictureId: action === 'set' ? (0, primitives_1.parseOptionalInt)(actionNode.attrs.id) : undefined,
            contactHash: actionNode.attrs.hash
        };
        return { events: [event], unhandled: [] };
    }
    return { events: [], unhandled: [] };
}
