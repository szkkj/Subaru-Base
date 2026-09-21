import { WA_CALL_CHILD_TAGS, WA_CALL_NODE_ATTRS, WA_CALL_PAYLOAD_TAGS } from '../../protocol/call.js';
import { findNodeChild, getFirstNodeChild, getNodeChildren, hasNodeChild } from '../../transport/node/helpers.js';
import { parseOptionalInt } from '../../util/primitives.js';
const KNOWN_CALL_PAYLOAD_TAGS = new Set(Object.values(WA_CALL_PAYLOAD_TAGS));
function parseGroupInfo(node) {
    const children = getNodeChildren(node);
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
            userPnJid: child.attrs[WA_CALL_NODE_ATTRS.USER_PN],
            username: child.attrs[WA_CALL_NODE_ATTRS.USERNAME],
            guestName: child.attrs[WA_CALL_NODE_ATTRS.GUEST_NAME]
        });
    }
    return out.length > 0 ? out : undefined;
}
export function parseCallNode(node) {
    const payload = getFirstNodeChild(node);
    if (!payload) {
        return { type: 'unknown', isVideo: false };
    }
    const payloadTag = payload.tag;
    const type = KNOWN_CALL_PAYLOAD_TAGS.has(payloadTag)
        ? payloadTag
        : 'unknown';
    const groupInfoNode = findNodeChild(payload, WA_CALL_CHILD_TAGS.GROUP_INFO);
    const silenceNode = findNodeChild(payload, WA_CALL_CHILD_TAGS.SILENCE);
    return {
        type,
        payloadTag,
        callId: payload.attrs[WA_CALL_NODE_ATTRS.CALL_ID],
        callCreatorJid: payload.attrs[WA_CALL_NODE_ATTRS.CALL_CREATOR],
        senderLidJid: node.attrs[WA_CALL_NODE_ATTRS.SENDER_LID],
        callerPnJid: payload.attrs[WA_CALL_NODE_ATTRS.CALLER_PN],
        groupJid: payload.attrs[WA_CALL_NODE_ATTRS.GROUP_JID],
        isVideo: hasNodeChild(payload, WA_CALL_CHILD_TAGS.VIDEO),
        callerUsername: payload.attrs[WA_CALL_NODE_ATTRS.USERNAME],
        callerCountryCode: payload.attrs[WA_CALL_NODE_ATTRS.CALLER_COUNTRY_CODE],
        callerPushName: payload.attrs[WA_CALL_NODE_ATTRS.NOTIFY],
        peerPlatform: node.attrs[WA_CALL_NODE_ATTRS.PLATFORM],
        peerAppVersion: node.attrs[WA_CALL_NODE_ATTRS.VERSION],
        timestampSeconds: parseOptionalInt(node.attrs.t),
        endTimestampSeconds: parseOptionalInt(node.attrs.e),
        silenceReason: silenceNode?.attrs[WA_CALL_NODE_ATTRS.REASON],
        groupInfo: groupInfoNode ? parseGroupInfo(groupInfoNode) : undefined
    };
}
