import { WA_NODE_TAGS } from '../../protocol/nodes.js';
import { getFirstNodeChild } from '../../transport/node/helpers.js';
export function parseIdentityChangeNotification(node) {
    const child = getFirstNodeChild(node);
    if (!child || child.tag !== WA_NODE_TAGS.IDENTITY) {
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
