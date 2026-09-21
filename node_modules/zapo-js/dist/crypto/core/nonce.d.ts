/**
 * Writes a 32-bit big-endian `counter` into the last 4 bytes of a 12-byte
 * AES-GCM nonce buffer. The first 8 bytes are left untouched so callers can
 * reuse a per-instance scratch buffer in hot paths.
 */
export declare function writeNonceCounter(out: Uint8Array, counter: number): void;
