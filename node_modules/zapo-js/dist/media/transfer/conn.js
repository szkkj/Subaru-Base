"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMediaConnResponse = parseMediaConnResponse;
const constants_1 = require("../../protocol/constants");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
const primitives_1 = require("../../util/primitives");
/**
 * Parses a `media_conn` IQ response into a {@link WaMediaConn} (auth token,
 * absolute expiry, and host list). Throws on missing auth/ttl/hosts.
 */
function parseMediaConnResponse(node, nowMs) {
    (0, query_1.assertIqResult)(node, 'media_conn');
    const mediaConnNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.MEDIA_CONN);
    if (!mediaConnNode) {
        throw new Error('media_conn response is missing media_conn node');
    }
    const auth = mediaConnNode.attrs.auth;
    if (!auth) {
        throw new Error('media_conn response is missing auth');
    }
    const ttlRaw = (0, primitives_1.parseOptionalInt)(mediaConnNode.attrs.ttl) ?? 0;
    if (ttlRaw <= 0) {
        throw new Error('media_conn response has invalid ttl');
    }
    const expiresAtMs = ttlRaw >= 1000000000 ? ttlRaw * 1000 : nowMs + ttlRaw * 1000;
    const hosts = [];
    for (const host of (0, helpers_1.getNodeChildrenByTag)(mediaConnNode, constants_1.WA_NODE_TAGS.HOST)) {
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
