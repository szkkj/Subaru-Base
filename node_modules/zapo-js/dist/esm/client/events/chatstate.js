import { WA_NODE_TAGS } from '../../protocol/nodes.js';
import { WA_CHATSTATE_MEDIA } from '../../protocol/presence.js';
import { getFirstNodeChild } from '../../transport/node/helpers.js';
export function parseChatstateNode(node) {
    const child = getFirstNodeChild(node);
    if (!child) {
        return null;
    }
    if (child.tag !== WA_NODE_TAGS.COMPOSING && child.tag !== WA_NODE_TAGS.PAUSED) {
        return null;
    }
    const result = { state: child.tag };
    if (child.tag === WA_NODE_TAGS.COMPOSING && child.attrs.media === WA_CHATSTATE_MEDIA.AUDIO) {
        result.media = WA_CHATSTATE_MEDIA.AUDIO;
    }
    if (node.attrs.participant !== undefined) {
        result.participantJid = node.attrs.participant;
    }
    return result;
}
