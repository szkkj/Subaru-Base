"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUsyncUserNode = buildUsyncUserNode;
exports.iterateUsyncUsers = iterateUsyncUsers;
exports.parseUsyncResultEnvelope = parseUsyncResultEnvelope;
exports.buildUsyncIq = buildUsyncIq;
const constants_1 = require("../../../protocol/constants");
const helpers_1 = require("../../node/helpers");
const query_1 = require("../../node/query");
const primitives_1 = require("../../../util/primitives");
function buildUsyncUserNode(input) {
    return {
        tag: constants_1.WA_NODE_TAGS.USER,
        attrs: {
            ...input.attrs,
            ...(input.jid !== undefined ? { jid: input.jid } : {})
        },
        ...(input.content !== undefined ? { content: input.content } : {})
    };
}
function iterateUsyncUsers(result) {
    const usyncNode = (0, helpers_1.findNodeChild)(result, constants_1.WA_NODE_TAGS.USYNC);
    if (!usyncNode)
        return null;
    const listNode = (0, helpers_1.findNodeChild)(usyncNode, constants_1.WA_NODE_TAGS.LIST);
    if (!listNode)
        return null;
    return (0, helpers_1.getNodeChildrenByTag)(listNode, constants_1.WA_NODE_TAGS.USER);
}
const EMPTY_USYNC_RESULT_ENVELOPE = Object.freeze({
    errors: Object.freeze({}),
    refresh: Object.freeze({})
});
/**
 * Walks a `usync` IQ result and extracts per-protocol error envelopes plus
 * `refresh` hints. Returns an empty envelope when the result has no `usync`
 * payload.
 */
function parseUsyncResultEnvelope(result) {
    const usyncNode = (0, helpers_1.findNodeChild)(result, constants_1.WA_NODE_TAGS.USYNC);
    if (!usyncNode)
        return EMPTY_USYNC_RESULT_ENVELOPE;
    const resultNode = (0, helpers_1.findNodeChild)(usyncNode, 'result');
    if (!resultNode)
        return EMPTY_USYNC_RESULT_ENVELOPE;
    if (!Array.isArray(resultNode.content))
        return EMPTY_USYNC_RESULT_ENVELOPE;
    const errors = {};
    const refresh = {};
    for (let i = 0; i < resultNode.content.length; i += 1) {
        const protoNode = resultNode.content[i];
        const errorNode = (0, helpers_1.findNodeChild)(protoNode, constants_1.WA_NODE_TAGS.ERROR);
        if (errorNode) {
            errors[protoNode.tag] = {
                code: (0, primitives_1.parseOptionalInt)(errorNode.attrs.code) ?? null,
                text: errorNode.attrs.text ?? null,
                backoffSeconds: (0, primitives_1.parseOptionalInt)(errorNode.attrs.backoff) ?? null
            };
            continue;
        }
        const refreshSeconds = (0, primitives_1.parseOptionalInt)(protoNode.attrs.refresh);
        if (refreshSeconds !== undefined) {
            refresh[protoNode.tag] = refreshSeconds;
        }
    }
    return { errors, refresh };
}
function buildUsyncIq(input) {
    if (input.queryProtocolNodes.length === 0) {
        throw new Error('usync query must include at least one protocol node');
    }
    const users = new Array(input.users.length);
    for (let index = 0; index < input.users.length; index += 1) {
        users[index] = buildUsyncUserNode(input.users[index]);
    }
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, input.hostDomain ?? constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.USYNC, [
        {
            tag: constants_1.WA_NODE_TAGS.USYNC,
            attrs: {
                sid: input.sid,
                index: input.index ?? constants_1.WA_USYNC_DEFAULTS.INDEX,
                last: input.last ?? constants_1.WA_USYNC_DEFAULTS.LAST,
                mode: input.mode ?? constants_1.WA_USYNC_MODES.QUERY,
                context: input.context ?? constants_1.WA_USYNC_CONTEXTS.INTERACTIVE
            },
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.QUERY,
                    attrs: {},
                    content: input.queryProtocolNodes
                },
                {
                    tag: constants_1.WA_NODE_TAGS.LIST,
                    attrs: {},
                    content: users
                }
            ]
        }
    ]);
}
