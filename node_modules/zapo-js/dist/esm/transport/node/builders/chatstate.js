import { isBroadcastJid, isNewsletterJid, splitJid } from '../../../protocol/jid.js';
import { WA_NODE_TAGS } from '../../../protocol/nodes.js';
function assertChatstateJid(jid) {
    if (isNewsletterJid(jid) || isBroadcastJid(jid)) {
        throw new Error(`chatstate is not supported for jid: ${jid}`);
    }
    splitJid(jid);
}
export function buildChatstateNode(input) {
    assertChatstateJid(input.jid);
    if (input.state !== WA_NODE_TAGS.COMPOSING && input.media !== undefined) {
        throw new Error('chatstate media is only valid with composing state');
    }
    const childAttrs = {};
    if (input.media !== undefined) {
        childAttrs.media = input.media;
    }
    return {
        tag: WA_NODE_TAGS.CHATSTATE,
        attrs: { to: input.jid },
        content: [
            {
                tag: input.state,
                attrs: childAttrs
            }
        ]
    };
}
