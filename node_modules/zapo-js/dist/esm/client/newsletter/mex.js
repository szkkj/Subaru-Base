import { buildTosQueryIq, buildTosUpdateIq, parseTosQueryResponse } from '../../transport/node/builders/tos.js';
import { runMexQuery } from '../../transport/node/mex/client.js';
import { toError } from '../../util/primitives.js';
export async function runMex(deps, opKey, variables) {
    return runMexQuery(deps.mexSocket, opKey, variables);
}
function resolveTosId(deps, kind) {
    if (!deps.getAbPropString)
        return null;
    const propName = kind === 'creation'
        ? 'newsletter_creation_tos_id'
        : kind === 'consumer'
            ? 'newsletter_tos_notice_id'
            : 'newsletter_admin_invite_tos_id';
    const id = deps.getAbPropString(propName);
    return id.length > 0 ? id : null;
}
export async function ensureTosAccepted(deps, kind) {
    const noticeId = resolveTosId(deps, kind);
    if (!noticeId || !deps.queryWithContext)
        return;
    try {
        const response = await deps.queryWithContext('newsletter.query_tos', buildTosQueryIq([noticeId]));
        const parsed = parseTosQueryResponse(response);
        const existing = parsed.notices.find((entry) => entry.id === noticeId);
        if (existing?.accepted)
            return;
        await deps.queryWithContext('newsletter.accept_tos', buildTosUpdateIq([noticeId]));
    }
    catch (error) {
        deps.logger.warn('newsletter tos auto-accept failed', {
            kind,
            noticeId,
            message: toError(error).message
        });
    }
}
