"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPresenceNode = buildPresenceNode;
exports.buildPresenceSubscribeNode = buildPresenceSubscribeNode;
const jid_1 = require("../../../protocol/jid");
const nodes_1 = require("../../../protocol/nodes");
const presence_1 = require("../../../protocol/presence");
function buildPresenceNode(input) {
    const attrs = {};
    if (input?.type) {
        attrs.type = input.type;
    }
    if (input?.name) {
        attrs.name = input.name;
    }
    return {
        tag: nodes_1.WA_NODE_TAGS.PRESENCE,
        attrs
    };
}
function assertSubscribeJid(jid) {
    if ((0, jid_1.isNewsletterJid)(jid) || (0, jid_1.isBroadcastJid)(jid)) {
        throw new Error(`presence subscribe is not supported for jid: ${jid}`);
    }
    (0, jid_1.splitJid)(jid);
}
function buildPresenceSubscribeNode(input) {
    assertSubscribeJid(input.jid);
    const attrs = {
        type: presence_1.WA_PRESENCE_TYPES.SUBSCRIBE,
        to: input.jid
    };
    if (input.name !== undefined) {
        attrs.name = input.name;
    }
    if (input.context !== undefined) {
        attrs.context = input.context;
    }
    return {
        tag: nodes_1.WA_NODE_TAGS.PRESENCE,
        attrs,
        ...(input.privacyTokenNode ? { content: [input.privacyTokenNode] } : {})
    };
}
