import type { Logger } from '../../infra/log/types';
import { WA_IQ_TYPES } from '../../protocol/constants';
import type { BinaryNode } from '../types';
/**
 * Builds an IQ stanza (`<iq type="get|set" to="..." xmlns="..."/>`) with the
 * given children/attrs. The caller is responsible for the `id` attribute
 * (the transport assigns one automatically when omitted).
 */
export declare function buildIqNode(type: typeof WA_IQ_TYPES.GET | typeof WA_IQ_TYPES.SET, to: string, xmlns: string, content?: BinaryNode['content'], attrs?: Readonly<Record<string, string>>): BinaryNode;
/**
 * Reads the standard error envelope from an IQ stanza, returning the string
 * `code`/`text` and (when parseable) the numeric `code`.
 */
export declare function parseIqError(node: BinaryNode): {
    readonly code: string;
    readonly text: string;
    readonly numericCode?: number;
};
/**
 * Throws when `node` is not a successful IQ result, embedding the parsed
 * error envelope and the `context` label in the message.
 */
export declare function assertIqResult(node: BinaryNode, context: string): void;
/**
 * Wraps `query(...)` so failures are logged with a `context` label and the
 * stanza's tag/id/type, then rethrown. Used by every coordinator's IQ call.
 */
export declare function queryWithContext(query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>, logger: Logger, context: string, node: BinaryNode, timeoutMs: number, contextData?: Readonly<Record<string, unknown>>): Promise<BinaryNode>;
