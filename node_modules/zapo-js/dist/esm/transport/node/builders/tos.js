import { WA_DEFAULTS } from '../../../protocol/defaults.js';
import { WA_IQ_TYPES, WA_XMLNS } from '../../../protocol/nodes.js';
import { buildIqNode } from '../../node/query.js';
import { parseOptionalInt } from '../../../util/primitives.js';
function noticeNodes(noticeIds) {
    return noticeIds.map((id) => ({
        tag: 'notice',
        attrs: { id }
    }));
}
export function buildTosQueryIq(noticeIds) {
    if (noticeIds.length === 0) {
        throw new Error('tos query requires at least one notice id');
    }
    return buildIqNode(WA_IQ_TYPES.GET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.TOS, [
        {
            tag: 'request',
            attrs: {},
            content: noticeNodes(noticeIds)
        }
    ]);
}
export function buildTosUpdateIq(noticeIds) {
    if (noticeIds.length === 0) {
        throw new Error('tos update requires at least one notice id');
    }
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.TOS, [
        {
            tag: 'request',
            attrs: { type: 'session_update' },
            content: noticeNodes(noticeIds)
        }
    ]);
}
export function parseTosQueryResponse(node) {
    const tosNode = Array.isArray(node.content)
        ? node.content.find((child) => child.tag === 'tos')
        : undefined;
    if (!tosNode) {
        throw new Error('tos response missing <tos> node');
    }
    const refreshSeconds = parseOptionalInt(tosNode.attrs.refresh) ?? 0;
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
