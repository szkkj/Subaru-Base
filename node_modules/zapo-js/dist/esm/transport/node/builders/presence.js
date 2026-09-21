import { isBroadcastJid, isNewsletterJid, splitJid } from '../../../protocol/jid.js';
import { WA_NODE_TAGS } from '../../../protocol/nodes.js';
import { WA_PRESENCE_TYPES } from '../../../protocol/presence.js';
export function buildPresenceNode(input) {
    const attrs = {};
    if (input?.type) {
        attrs.type = input.type;
    }
    if (input?.name) {
        attrs.name = input.name;
    }
    return {
        tag: WA_NODE_TAGS.PRESENCE,
        attrs
    };
}
function assertSubscribeJid(jid) {
    if (isNewsletterJid(jid) || isBroadcastJid(jid)) {
        throw new Error(`presence subscribe is not supported for jid: ${jid}`);
    }
    splitJid(jid);
}
export function buildPresenceSubscribeNode(input) {
    assertSubscribeJid(input.jid);
    const attrs = {
        type: WA_PRESENCE_TYPES.SUBSCRIBE,
        to: input.jid
    };
    if (input.name !== undefined) {
        attrs.name = input.name;
    }
    if (input.context !== undefined) {
        attrs.context = input.context;
    }
    return {
        tag: WA_NODE_TAGS.PRESENCE,
        attrs,
        ...(input.privacyTokenNode ? { content: [input.privacyTokenNode] } : {})
    };
}
