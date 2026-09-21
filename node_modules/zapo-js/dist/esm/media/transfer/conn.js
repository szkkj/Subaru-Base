import { WA_NODE_TAGS } from '../../protocol/constants.js';
import { findNodeChild, getNodeChildrenByTag } from '../../transport/node/helpers.js';
import { assertIqResult } from '../../transport/node/query.js';
import { parseOptionalInt } from '../../util/primitives.js';
/**
 * Parses a `media_conn` IQ response into a {@link WaMediaConn} (auth token,
 * absolute expiry, and host list). Throws on missing auth/ttl/hosts.
 */
export function parseMediaConnResponse(node, nowMs) {
    assertIqResult(node, 'media_conn');
    const mediaConnNode = findNodeChild(node, WA_NODE_TAGS.MEDIA_CONN);
    if (!mediaConnNode) {
        throw new Error('media_conn response is missing media_conn node');
    }
    const auth = mediaConnNode.attrs.auth;
    if (!auth) {
        throw new Error('media_conn response is missing auth');
    }
    const ttlRaw = parseOptionalInt(mediaConnNode.attrs.ttl) ?? 0;
    if (ttlRaw <= 0) {
        throw new Error('media_conn response has invalid ttl');
    }
    const expiresAtMs = ttlRaw >= 1000000000 ? ttlRaw * 1000 : nowMs + ttlRaw * 1000;
    const hosts = [];
    for (const host of getNodeChildrenByTag(mediaConnNode, WA_NODE_TAGS.HOST)) {
        const hostname = host.attrs.hostname;
        if (hostname) {
            hosts.push({
                hostname,
                isFallback: host.attrs.type === 'fallback'
            });
        }
    }
    if (hosts.length === 0) {
        throw new Error('media_conn response contains no hosts');
    }
    return {
        auth,
        expiresAtMs,
        hosts
    };
}
