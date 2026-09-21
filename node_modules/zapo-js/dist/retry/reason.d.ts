import { type WaRetryReasonCode } from './constants';
/**
 * Maps a decryption/Signal error to the appropriate {@link WaRetryReasonCode}
 * so an outbound retry receipt carries the correct `error` attribute.
 * Returns `undefined` when no known reason matches.
 */
export declare function mapRetryReasonFromError(error: unknown): WaRetryReasonCode | undefined;
