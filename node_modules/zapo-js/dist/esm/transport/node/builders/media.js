import { WA_DEFAULTS, WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../../protocol/constants.js';
import { buildIqNode } from '../../node/query.js';
export function buildMediaConnIq() {
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.MEDIA, [
        {
            tag: WA_NODE_TAGS.MEDIA_CONN,
            attrs: {}
        }
    ]);
}
