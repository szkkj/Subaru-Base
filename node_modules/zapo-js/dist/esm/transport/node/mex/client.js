import { WA_MEX_PERSIST_IDS } from '../../../mex.js';
import { WA_DEFAULTS, WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../../protocol/constants.js';
import { decodeNodeContentUtf8OrBytes, findNodeChild } from '../../node/helpers.js';
import { decodeMexArgoResponse, isMexArgoDecoderAvailable } from '../../node/mex/argo-decoder.js';
import { assertIqResult } from '../../node/query.js';
import { TEXT_DECODER } from '../../../util/bytes.js';
import { toError } from '../../../util/primitives.js';
const MEX_DEFAULT_TIMEOUT_MS = 32000;
/**
 * Typed wrapper around `dispatchMexQuery` that resolves persist IDs from the
 * generated `WA_MEX_PERSIST_IDS` table. The op key constrains the `variables`
 * shape via `WaMexOperationVariables` and defaults the response to
 * `WaMexOperationResponses[K] | null` (the response tree the extractor walked
 * from the Relay `operation.selections`; leaves are `unknown` since Relay
 * strips scalar types at codegen).
 */
export async function runMexQuery(socket, opKey, variables) {
    const persist = WA_MEX_PERSIST_IDS[opKey];
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
export async function dispatchMexQuery(socket, args) {
    const body = JSON.stringify({
        queryId: args.clientDocId,
        variables: args.variables
    });
    const node = {
        tag: WA_NODE_TAGS.IQ,
        attrs: {
            ...(args.iqId ? { id: args.iqId } : {}),
            to: WA_DEFAULTS.HOST_DOMAIN,
            type: WA_IQ_TYPES.GET,
            xmlns: WA_XMLNS.MEX
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
    assertIqResult(response, `mex/${args.opName}`);
    const data = await parseMexResultPayload(response, args.opName);
    return { raw: response, data };
}
async function parseMexResultPayload(node, opName) {
    const result = findNodeChild(node, 'result');
    if (!result) {
        throw new Error(`mex/${opName} response missing <result>`);
    }
    const format = result.attrs.format ?? 'json';
    const rawBytes = decodeNodeContentUtf8OrBytes(result.content, `mex/${opName}/result`);
    if (format === 'argo') {
        if (!(await isMexArgoDecoderAvailable())) {
            throw new Error(`mex/${opName} argo response received but 'argo-codec' not installed; ${rawBytes.length}B; ` +
                `strings: ${extractVisibleStrings(rawBytes)}`);
        }
        let decoded;
        try {
            decoded = await decodeMexArgoResponse(rawBytes);
        }
        catch (error) {
            throw new Error(`mex/${opName} argo decode failed: ${toError(error).message}; ` +
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
    return extractGraphQlData(JSON.parse(TEXT_DECODER.decode(rawBytes)), opName);
}
function extractVisibleStrings(bytes) {
    return TEXT_DECODER.decode(bytes)
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
