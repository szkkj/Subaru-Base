"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTosQueryIq = buildTosQueryIq;
exports.buildTosUpdateIq = buildTosUpdateIq;
exports.parseTosQueryResponse = parseTosQueryResponse;
const defaults_1 = require("../../../protocol/defaults");
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
const primitives_1 = require("../../../util/primitives");
function noticeNodes(noticeIds) {
    return noticeIds.map((id) => ({
        tag: 'notice',
        attrs: { id }
    }));
}
function buildTosQueryIq(noticeIds) {
    if (noticeIds.length === 0) {
        throw new Error('tos query requires at least one notice id');
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.TOS, [
        {
            tag: 'request',
            attrs: {},
            content: noticeNodes(noticeIds)
        }
    ]);
}
function buildTosUpdateIq(noticeIds) {
    if (noticeIds.length === 0) {
        throw new Error('tos update requires at least one notice id');
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.TOS, [
        {
            tag: 'request',
            attrs: { type: 'session_update' },
            content: noticeNodes(noticeIds)
        }
    ]);
}
function parseTosQueryResponse(node) {
    const tosNode = Array.isArray(node.content)
        ? node.content.find((child) => child.tag === 'tos')
        : undefined;
    if (!tosNode) {
        throw new Error('tos response missing <tos> node');
    }
    const refreshSeconds = (0, primitives_1.parseOptionalInt)(tosNode.attrs.refresh) ?? 0;
    const notices = [];
    if (Array.isArray(tosNode.content)) {
        for (const child of tosNode.content) {
            if (child.tag !== 'notice')
                continue;
            const id = child.attrs.id;
            if (!id)
                continue;
            notices.push({
                id,
                accepted: child.attrs.state !== 'false'
            });
        }
    }
    return { refreshSeconds, notices };
}
