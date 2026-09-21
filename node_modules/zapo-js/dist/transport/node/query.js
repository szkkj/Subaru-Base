"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIqNode = buildIqNode;
exports.parseIqError = parseIqError;
exports.assertIqResult = assertIqResult;
exports.queryWithContext = queryWithContext;
const constants_1 = require("../../protocol/constants");
const helpers_1 = require("../node/helpers");
const primitives_1 = require("../../util/primitives");
/**
 * Builds an IQ stanza (`<iq type="get|set" to="..." xmlns="..."/>`) with the
 * given children/attrs. The caller is responsible for the `id` attribute
 * (the transport assigns one automatically when omitted).
 */
function buildIqNode(type, to, xmlns, content, attrs = {}) {
    return {
        tag: constants_1.WA_NODE_TAGS.IQ,
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
function parseIqError(node) {
    const errorNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.ERROR);
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
function assertIqResult(node, context) {
    if (node.tag !== constants_1.WA_NODE_TAGS.IQ) {
        throw new Error(`${context} returned non-iq node (${node.tag})`);
    }
    if (node.attrs.type === constants_1.WA_IQ_TYPES.RESULT) {
        return;
    }
    const error = parseIqError(node);
    throw new Error(`${context} iq failed (${error.code}: ${error.text})`);
}
/**
 * Wraps `query(...)` so failures are logged with a `context` label and the
 * stanza's tag/id/type, then rethrown. Used by every coordinator's IQ call.
 */
async function queryWithContext(query, logger, context, node, timeoutMs, contextData = {}) {
    try {
        return await query(node, timeoutMs);
    }
    catch (error) {
        const normalized = (0, primitives_1.toError)(error);
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
