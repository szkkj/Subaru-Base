import type { Readable } from 'node:stream';
export declare const TEXT_ENCODER: import("../util").TextEncoder;
export declare const TEXT_DECODER: import("../util").TextDecoder;
export declare const ZERO_BYTES: Readonly<Uint8Array>;
export declare const EMPTY_BYTES: Readonly<Uint8Array<ArrayBuffer>>;
/**
 * Encodes a Uint8Array to a hex string
 */
export declare function bytesToHex(value: Uint8Array): string;
/**
 * Decodes a hex string to a Uint8Array
 */
export declare function hexToBytes(value: string): Uint8Array;
/** Encodes a Uint8Array to a standard padded base64 string. */
export declare function bytesToBase64(value: Uint8Array): string;
/**
 * Decodes a standard padded base64 string to a Uint8Array. Throws on invalid
 * characters or a length that is not a multiple of 4.
 */
export declare function base64ToBytes(value: string): Uint8Array;
export declare function base64ToBytesChecked(value: string, field: string): Uint8Array;
/**
 * Decodes a base64url-encoded value to a Uint8Array, restoring padding and
 * the `+`/`/` alphabet first. Throws with a `missing ${field}` message when
 * `value` is empty/undefined.
 */
export declare function decodeBase64Url(value: string | undefined, field: string): Uint8Array;
export declare function assertByteLength(value: Uint8Array, expectedLength: number, errorMessage: string): void;
export declare function decodeProtoBytes(value: Uint8Array | string | null | undefined, field: string): Uint8Array;
/**
 * Encodes a Uint8Array to a base64url string (URL-safe, no padding)
 */
export declare function bytesToBase64UrlSafe(value: Uint8Array): string;
/** Concatenates an array of Uint8Arrays into a single new Uint8Array. */
export declare function concatBytes(parts: readonly Uint8Array[]): Uint8Array;
/**
 * Returns a zero-copy `Uint8Array` view over the input. Subclasses of
 * `Uint8Array` (Node `Buffer`) are wrapped in a plain view; `ArrayBuffer`/
 * `ArrayBufferView` get a view over their backing buffer. Use at system
 * boundaries (WebCrypto / Node crypto / WebSocket results) – not on values
 * that are already plain `Uint8Array`.
 */
export declare function toBytesView(value: Uint8Array | ArrayBuffer | ArrayBufferView): Uint8Array;
/**
 * Normalizes an arbitrary stream chunk (string / Uint8Array / ArrayBuffer /
 * ArrayBufferView) to a Uint8Array. Throws on unsupported types.
 */
export declare function toChunkBytes(chunk: unknown): Uint8Array;
/**
 * Constant-time, JIT-resistant equality over `Uint8Array`s. Required for
 * MAC/HMAC/signature comparisons (use {@link uint8Equal} for non-secret data).
 */
export declare function uint8TimingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
/**
 * XOR-accumulated equality over `Uint8Array`s. Suitable for non-secret data
 * (e.g. identity key match). Use {@link uint8TimingSafeEqual} for MAC checks.
 */
export declare function uint8Equal(a: Uint8Array, b: Uint8Array): boolean;
export declare function removeAt<T>(items: readonly T[], index: number): T[];
export declare function intToBytes(byteLength: number, value: number): Uint8Array;
/**
 * Drains a Node `Readable` stream into a single Uint8Array. When
 * `options.maxBytes` is set, the stream is destroyed and the promise rejects
 * once the limit is exceeded.
 */
export declare function readAllBytes(stream: Readable, options?: {
    readonly maxBytes?: number;
}): Promise<Uint8Array>;
