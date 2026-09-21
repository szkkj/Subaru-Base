"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMexQuery = runMexQuery;
exports.dispatchMexQuery = dispatchMexQuery;
const _mex_1 = require("../../../mex");
const constants_1 = require("../../../protocol/constants");
const helpers_1 = require("../../node/helpers");
const argo_decoder_1 = require("../../node/mex/argo-decoder");
const query_1 = require("../../node/query");
const bytes_1 = require("../../../util/bytes");
const primitives_1 = require("../../../util/primitives");
const MEX_DEFAULT_TIMEOUT_MS = 32000;
/**
 * Typed wrapper around `dispatchMexQuery` that resolves persist IDs from the
 * generated `WA_MEX_PERSIST_IDS` table. The op key constrains the `variables`
 * shape via `WaMexOperationVariables` and defaults the response to
 * `WaMexOperationResponses[K] | null` (the response tree the extractor walked
 * from the Relay `operation.selections`; leaves are `unknown` since Relay
 * strips scalar types at codegen).
 */
async function runMexQuery(socket, opKey, variables) {
    const persist = _mex_1.WA_MEX_PERSIST_IDS[opKey];
    if (!persist) {
        throw new Error(`mex/${String(opKey)} persist IDs not found`);
    }
    const { data } = await dispatchMexQuery(socket, {
        docId: persist.docId,
        clientDocId: persist.clientDocId,
        opName: opKey,
        variables: variables
    });
    return data;
}
async function dispatchMexQuery(socket, args) {
    const body = JSON.stringify({
        queryId: args.clientDocId,
        variables: args.variables
    });
    const node = {
        tag: constants_1.WA_NODE_TAGS.IQ,
        attrs: {
            ...(args.iqId ? { id: args.iqId } : {}),
            to: constants_1.WA_DEFAULTS.HOST_DOMAIN,
            type: constants_1.WA_IQ_TYPES.GET,
            xmlns: constants_1.WA_XMLNS.MEX
        },
        content: [
            {
                tag: 'query',
                attrs: { query_id: args.docId },
                content: body
            }
        ]
    };
    const response = await socket.query(node, args.timeoutMs ?? MEX_DEFAULT_TIMEOUT_MS);
    (0, query_1.assertIqResult)(response, `mex/${args.opName}`);
    const data = await parseMexResultPayload(response, args.opName);
    return { raw: response, data };
}
async function parseMexResultPayload(node, opName) {
    const result = (0, helpers_1.findNodeChild)(node, 'result');
    if (!result) {
        throw new Error(`mex/${opName} response missing <result>`);
    }
    const format = result.attrs.format ?? 'json';
    const rawBytes = (0, helpers_1.decodeNodeContentUtf8OrBytes)(result.content, `mex/${opName}/result`);
    if (format === 'argo') {
        if (!(await (0, argo_decoder_1.isMexArgoDecoderAvailable)())) {
            throw new Error(`mex/${opName} argo response received but 'argo-codec' not installed; ${rawBytes.length}B; ` +
                `strings: ${extractVisibleStrings(rawBytes)}`);
        }
        let decoded;
        try {
            decoded = await (0, argo_decoder_1.decodeMexArgoResponse)(rawBytes);
        }
        catch (error) {
            throw new Error(`mex/${opName} argo decode failed: ${(0, primitives_1.toError)(error).message}; ` +
                `${rawBytes.length}B; strings: ${extractVisibleStrings(rawBytes)}`);
        }
        if (decoded.errors.length > 0) {
            const summary = decoded.errors
                .map((e) => {
                const code = e.extensions?.error_code ?? e.extensions?.code ?? '?';
                const sev = e.extensions?.severity;
                return `${code}${sev ? `/${String(sev)}` : ''}: ${e.message} @${e.path ?? ''}`;
            })
                .join('; ');
            throw new Error(`mex/${opName} errors: ${summary}`);
        }
        return decoded.data;
    }
    return extractGraphQlData(JSON.parse(bytes_1.TEXT_DECODER.decode(rawBytes)), opName);
}
function extractVisibleStrings(bytes) {
    return bytes_1.TEXT_DECODER.decode(bytes)
        .replace(/[\x00-\x1f\x7f-\xff]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function extractGraphQlData(payload, opName) {
    const json = (payload ?? {});
    if (json.errors && json.errors.length > 0) {
        const summary = json.errors
            .map((e) => `${e.extensions?.error_code ?? '?'}: ${e.message ?? '?'} @${(e.path ?? []).join('.')}`)
            .join('; ');
        throw new Error(`mex/${opName} errors: ${summary}`);
    }
    return json.data ?? null;
}
