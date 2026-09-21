import { WA_USYNC_CONTEXTS, WA_USYNC_MODES } from '../../../protocol/constants';
import type { BinaryNode } from '../../types';
export type WaUsyncMode = (typeof WA_USYNC_MODES)[keyof typeof WA_USYNC_MODES];
export type WaUsyncContext = (typeof WA_USYNC_CONTEXTS)[keyof typeof WA_USYNC_CONTEXTS];
export interface BuildUsyncUserNodeInput {
    /** Omitted only by username lookups, which identify by handle instead. */
    readonly jid?: string;
    readonly attrs?: Readonly<Record<string, string>>;
    readonly content?: BinaryNode['content'];
}
export interface BuildUsyncIqInput {
    readonly sid: string;
    readonly queryProtocolNodes: readonly BinaryNode[];
    readonly users: readonly BuildUsyncUserNodeInput[];
    readonly mode?: WaUsyncMode;
    readonly context?: WaUsyncContext;
    readonly index?: string;
    readonly last?: string;
    readonly hostDomain?: string;
}
export declare function buildUsyncUserNode(input: BuildUsyncUserNodeInput): BinaryNode;
export declare function iterateUsyncUsers(result: BinaryNode): readonly BinaryNode[] | null;
export interface WaUsyncProtocolError {
    readonly code: number | null;
    readonly text: string | null;
    readonly backoffSeconds: number | null;
}
export interface WaUsyncResultEnvelope {
    readonly errors: Readonly<Record<string, WaUsyncProtocolError>>;
    readonly refresh: Readonly<Record<string, number>>;
}
/**
 * Walks a `usync` IQ result and extracts per-protocol error envelopes plus
 * `refresh` hints. Returns an empty envelope when the result has no `usync`
 * payload.
 */
export declare function parseUsyncResultEnvelope(result: BinaryNode): WaUsyncResultEnvelope;
export declare function buildUsyncIq(input: BuildUsyncIqInput): BinaryNode;
