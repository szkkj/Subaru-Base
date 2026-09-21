import { WA_IQ_TYPES, WA_NODE_TAGS } from '../../protocol/constants.js';
import { findNodeChild } from '../node/helpers.js';
import { toError } from '../../util/primitives.js';
/**
 * Builds an IQ stanza (`<iq type="get|set" to="..." xmlns="..."/>`) with the
 * given children/attrs. The caller is responsible for the `id` attribute
 * (the transport assigns one automatically when omitted).
 */
export function buildIqNode(type, to, xmlns, content, attrs = {}) {
    return {
        tag: WA_NODE_TAGS.IQ,
        attrs: {
            ...attrs,
            to,
            type,
            xmlns
        },
        ...(content !== undefined ? { content } : {})
    };
}
/**
 * Reads the standard error envelope from an IQ stanza, returning the string
 * `code`/`text` and (when parseable) the numeric `code`.
 */
export function parseIqError(node) {
    const errorNode = findNodeChild(node, WA_NODE_TAGS.ERROR);
    const code = errorNode?.attrs.code ?? node.attrs.type ?? 'unknown';
    const text = errorNode?.attrs.text ?? errorNode?.attrs.type ?? 'unknown';
    const parsedCode = Number.parseInt(code, 10);
    return {
        code,
        text,
        ...(Number.isSafeInteger(parsedCode) ? { numericCode: parsedCode } : {})
    };
}
/**
 * Throws when `node` is not a successful IQ result, embedding the parsed
 * error envelope and the `context` label in the message.
 */
export function assertIqResult(node, context) {
    if (node.tag !== WA_NODE_TAGS.IQ) {
        throw new Error(`${context} returned non-iq node (${node.tag})`);
    }
    if (node.attrs.type === WA_IQ_TYPES.RESULT) {
        return;
    }
    const error = parseIqError(node);
    throw new Error(`${context} iq failed (${error.code}: ${error.text})`);
}
/**
 * Wraps `query(...)` so failures are logged with a `context` label and the
 * stanza's tag/id/type, then rethrown. Used by every coordinator's IQ call.
 */
export async function queryWithContext(query, logger, context, node, timeoutMs, contextData = {}) {
    try {
        return await query(node, timeoutMs);
    }
    catch (error) {
        const normalized = toError(error);
        logger.warn('query failed', {
            context,
            message: normalized.message,
            tag: node.tag,
            id: node.attrs.id,
            type: node.attrs.type,
            ...contextData
        });
        throw normalized;
    }
}
