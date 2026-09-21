import type { WaParsedRetryRequest, WaRetryOutboundState } from './types';
import type { BinaryNode } from '../transport/types';
/**
 * Parses an incoming `receipt` stanza into a {@link WaParsedRetryRequest}.
 * Returns `null` when the stanza is not a retry/rekey-retry receipt; throws
 * when required attrs/children are missing.
 */
export declare function parseRetryReceiptRequest(node: BinaryNode, options?: {
    readonly expectedToJids?: readonly string[];
}): WaParsedRetryRequest | null;
/**
 * Returns whichever of `left`/`right` represents the more advanced retry
 * state (according to the internal precedence rank).
 */
export declare function pickRetryStateMax(left: WaRetryOutboundState, right: WaRetryOutboundState): WaRetryOutboundState;
