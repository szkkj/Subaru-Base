"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCallNode = parseCallNode;
const call_1 = require("../../protocol/call");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
const KNOWN_CALL_PAYLOAD_TAGS = new Set(Object.values(call_1.WA_CALL_PAYLOAD_TAGS));
function parseGroupInfo(node) {
    const children = (0, helpers_1.getNodeChildren)(node);
    if (children.length === 0) {
        return undefined;
    }
    const out = [];
    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        const jid = child.attrs.jid;
        if (!jid)
            continue;
        out.push({
            jid,
            userPnJid: child.attrs[call_1.WA_CALL_NODE_ATTRS.USER_PN],
            username: child.attrs[call_1.WA_CALL_NODE_ATTRS.USERNAME],
            guestName: child.attrs[call_1.WA_CALL_NODE_ATTRS.GUEST_NAME]
        });
    }
    return out.length > 0 ? out : undefined;
}
function parseCallNode(node) {
    const payload = (0, helpers_1.getFirstNodeChild)(node);
    if (!payload) {
        return { type: 'unknown', isVideo: false };
    }
    const payloadTag = payload.tag;
    const type = KNOWN_CALL_PAYLOAD_TAGS.has(payloadTag)
        ? payloadTag
        : 'unknown';
    const groupInfoNode = (0, helpers_1.findNodeChild)(payload, call_1.WA_CALL_CHILD_TAGS.GROUP_INFO);
    const silenceNode = (0, helpers_1.findNodeChild)(payload, call_1.WA_CALL_CHILD_TAGS.SILENCE);
    return {
        type,
        payloadTag,
        callId: payload.attrs[call_1.WA_CALL_NODE_ATTRS.CALL_ID],
        callCreatorJid: payload.attrs[call_1.WA_CALL_NODE_ATTRS.CALL_CREATOR],
        senderLidJid: node.attrs[call_1.WA_CALL_NODE_ATTRS.SENDER_LID],
        callerPnJid: payload.attrs[call_1.WA_CALL_NODE_ATTRS.CALLER_PN],
        groupJid: payload.attrs[call_1.WA_CALL_NODE_ATTRS.GROUP_JID],
        isVideo: (0, helpers_1.hasNodeChild)(payload, call_1.WA_CALL_CHILD_TAGS.VIDEO),
        callerUsername: payload.attrs[call_1.WA_CALL_NODE_ATTRS.USERNAME],
        callerCountryCode: payload.attrs[call_1.WA_CALL_NODE_ATTRS.CALLER_COUNTRY_CODE],
        callerPushName: payload.attrs[call_1.WA_CALL_NODE_ATTRS.NOTIFY],
        peerPlatform: node.attrs[call_1.WA_CALL_NODE_ATTRS.PLATFORM],
        peerAppVersion: node.attrs[call_1.WA_CALL_NODE_ATTRS.VERSION],
        timestampSeconds: (0, primitives_1.parseOptionalInt)(node.attrs.t),
        endTimestampSeconds: (0, primitives_1.parseOptionalInt)(node.attrs.e),
        silenceReason: silenceNode?.attrs[call_1.WA_CALL_NODE_ATTRS.REASON],
        groupInfo: groupInfoNode ? parseGroupInfo(groupInfoNode) : undefined
    };
}
