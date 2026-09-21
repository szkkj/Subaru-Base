/**
 * HKDF (HMAC-SHA-256) – derives `outLength` bytes from `ikm` using the given
 * `salt` (empty bytes when `null`) and `info` context.
 */
export declare function hkdf(ikm: Uint8Array, salt: Uint8Array | null, info: Uint8Array, outLength: number): Uint8Array;
/**
 * Derives a 64-byte HKDF output and returns it split into two 32-byte halves
 * (Signal/WhatsApp pair-key derivation pattern).
 */
export declare function hkdfSplit(ikm: Uint8Array, salt: Uint8Array | null, info: Uint8Array): readonly [Uint8Array, Uint8Array];
