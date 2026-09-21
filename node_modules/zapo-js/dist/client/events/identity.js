"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIdentityChangeNotification = parseIdentityChangeNotification;
const nodes_1 = require("../../protocol/nodes");
const helpers_1 = require("../../transport/node/helpers");
function parseIdentityChangeNotification(node) {
    const child = (0, helpers_1.getFirstNodeChild)(node);
    if (!child || child.tag !== nodes_1.WA_NODE_TAGS.IDENTITY) {
        return null;
    }
    const fromJid = node.attrs.from;
    const stanzaId = node.attrs.id;
    if (!fromJid || !stanzaId) {
        return null;
    }
    return {
        fromJid,
        stanzaId,
        displayName: node.attrs.display_name,
        lid: node.attrs.lid,
        offline: node.attrs.offline
    };
}
