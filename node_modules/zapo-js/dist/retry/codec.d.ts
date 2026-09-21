import type { WaRetryReplayPayload } from './types';
/**
 * Encodes a {@link WaRetryReplayPayload} into the on-disk codec format used
 * by the retry store. Supports the `plaintext`/`encrypted`/`opaque_node` modes.
 */
export declare function encodeRetryReplayPayload(payload: WaRetryReplayPayload): Uint8Array;
/** Inverse of {@link encodeRetryReplayPayload}. Throws on bad magic/version. */
export declare function decodeRetryReplayPayload(raw: Uint8Array): WaRetryReplayPayload;
