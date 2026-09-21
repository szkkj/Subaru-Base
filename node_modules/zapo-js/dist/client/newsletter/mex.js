"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMex = runMex;
exports.ensureTosAccepted = ensureTosAccepted;
const tos_1 = require("../../transport/node/builders/tos");
const client_1 = require("../../transport/node/mex/client");
const primitives_1 = require("../../util/primitives");
async function runMex(deps, opKey, variables) {
    return (0, client_1.runMexQuery)(deps.mexSocket, opKey, variables);
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
async function ensureTosAccepted(deps, kind) {
    const noticeId = resolveTosId(deps, kind);
    if (!noticeId || !deps.queryWithContext)
        return;
    try {
        const response = await deps.queryWithContext('newsletter.query_tos', (0, tos_1.buildTosQueryIq)([noticeId]));
        const parsed = (0, tos_1.parseTosQueryResponse)(response);
        const existing = parsed.notices.find((entry) => entry.id === noticeId);
        if (existing?.accepted)
            return;
        await deps.queryWithContext('newsletter.accept_tos', (0, tos_1.buildTosUpdateIq)([noticeId]));
    }
    catch (error) {
        deps.logger.warn('newsletter tos auto-accept failed', {
            kind,
            noticeId,
            message: (0, primitives_1.toError)(error).message
        });
    }
}
