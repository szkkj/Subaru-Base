/**
 * Cryptographically fills `target` (optionally a sub-range) with random bytes.
 * Resolves to the same `target` reference for chaining.
 */
export declare function randomFillAsync(target: Uint8Array, offset?: number, size?: number): Promise<Uint8Array>;
/** Returns a cryptographically secure integer in `[min, max)`. */
export declare const randomIntAsync: (min: number, max: number) => Promise<number>;
/** Returns `size` cryptographically secure random bytes. */
export declare const randomBytesAsync: (size: number) => Promise<Uint8Array>;
