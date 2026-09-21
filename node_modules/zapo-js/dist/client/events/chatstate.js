"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChatstateNode = parseChatstateNode;
const nodes_1 = require("../../protocol/nodes");
const presence_1 = require("../../protocol/presence");
const helpers_1 = require("../../transport/node/helpers");
function parseChatstateNode(node) {
    const child = (0, helpers_1.getFirstNodeChild)(node);
    if (!child) {
        return null;
    }
    if (child.tag !== nodes_1.WA_NODE_TAGS.COMPOSING && child.tag !== nodes_1.WA_NODE_TAGS.PAUSED) {
        return null;
    }
    const result = { state: child.tag };
    if (child.tag === nodes_1.WA_NODE_TAGS.COMPOSING && child.attrs.media === presence_1.WA_CHATSTATE_MEDIA.AUDIO) {
        result.media = presence_1.WA_CHATSTATE_MEDIA.AUDIO;
    }
    if (node.attrs.participant !== undefined) {
        result.participantJid = node.attrs.participant;
    }
    return result;
}
