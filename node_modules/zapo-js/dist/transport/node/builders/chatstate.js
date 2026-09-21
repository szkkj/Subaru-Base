"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChatstateNode = buildChatstateNode;
const jid_1 = require("../../../protocol/jid");
const nodes_1 = require("../../../protocol/nodes");
function assertChatstateJid(jid) {
    if ((0, jid_1.isNewsletterJid)(jid) || (0, jid_1.isBroadcastJid)(jid)) {
        throw new Error(`chatstate is not supported for jid: ${jid}`);
    }
    (0, jid_1.splitJid)(jid);
}
function buildChatstateNode(input) {
    assertChatstateJid(input.jid);
    if (input.state !== nodes_1.WA_NODE_TAGS.COMPOSING && input.media !== undefined) {
        throw new Error('chatstate media is only valid with composing state');
    }
    const childAttrs = {};
    if (input.media !== undefined) {
        childAttrs.media = input.media;
    }
    return {
        tag: nodes_1.WA_NODE_TAGS.CHATSTATE,
        attrs: { to: input.jid },
        content: [
            {
                tag: input.state,
                attrs: childAttrs
            }
        ]
    };
}
