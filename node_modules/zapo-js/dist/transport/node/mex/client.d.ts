import { type WaMexOperationResponses, type WaMexOperationVariables } from '../../../mex';
import type { BinaryNode } from '../../types';
export interface WaMexQuerySocket {
    readonly query: (node: BinaryNode, timeoutMs: number) => Promise<BinaryNode>;
}
export interface WaMexQueryArgs {
    readonly docId: string;
    readonly clientDocId: string;
    /** Passed verbatim – caller wraps under `input` only when the op's schema requires it. */
    readonly variables: Readonly<Record<string, unknown>>;
    readonly opName: string;
    readonly timeoutMs?: number;
    readonly iqId?: string;
}
export interface WaMexResponse {
    readonly raw: BinaryNode;
    readonly data: unknown;
}
export type WaMexOpKey = keyof WaMexOperationVariables;
/**
 * Typed wrapper around `dispatchMexQuery` that resolves persist IDs from the
 * generated `WA_MEX_PERSIST_IDS` table. The op key constrains the `variables`
 * shape via `WaMexOperationVariables` and defaults the response to
 * `WaMexOperationResponses[K] | null` (the response tree the extractor walked
 * from the Relay `operation.selections`; leaves are `unknown` since Relay
 * strips scalar types at codegen).
 */
export declare function runMexQuery<K extends WaMexOpKey, T = WaMexOperationResponses[K] | null>(socket: WaMexQuerySocket, opKey: K, variables: WaMexOperationVariables[K]): Promise<T>;
export declare function dispatchMexQuery(socket: WaMexQuerySocket, args: WaMexQueryArgs): Promise<WaMexResponse>;
