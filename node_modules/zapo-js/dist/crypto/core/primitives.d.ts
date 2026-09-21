import { type KeyObject } from 'node:crypto';
export type HashInput = Uint8Array | readonly Uint8Array[];
/** Computes the SHA-1 digest of `value`. Accepts a single chunk or array of chunks. */
export declare function sha1(value: HashInput): Uint8Array;
/** Computes the SHA-256 digest of `value`. */
export declare function sha256(value: HashInput): Uint8Array;
/** Computes the SHA-512 digest of `value`. */
export declare function sha512(value: HashInput): Uint8Array;
/** Computes the MD5 digest of `input`, accepting a string or raw chunks. */
export declare function md5Bytes(input: string | HashInput): Uint8Array;
export type AesKey = Uint8Array | KeyObject;
/**
 * AES-256-GCM encrypt. The 16-byte auth tag is appended to the ciphertext.
 * Pass `aad` when binding the ciphertext to associated data.
 */
export declare function aesGcmEncrypt(key: AesKey, nonce: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array): Uint8Array;
/**
 * AES-256-GCM decrypt. Expects the 16-byte auth tag appended to the
 * ciphertext (matching {@link aesGcmEncrypt}'s layout). Throws on auth failure.
 */
export declare function aesGcmDecrypt(key: AesKey, nonce: Uint8Array, ciphertext: Uint8Array, aad?: Uint8Array): Uint8Array;
/** AES-256-CBC encrypt with PKCS#7 padding (default Node behavior). */
export declare function aesCbcEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array;
/**
 * AES-256-CBC encrypt into a buffer that reserves `trailerBytes` of spare room
 * after the ciphertext, for a caller that has to append a MAC to it.
 *
 * Appending to the result of {@link aesCbcEncrypt} means copying the whole
 * ciphertext a second time, which on a media payload is a copy of the entire
 * file to make room for ten bytes. Sizing the destination from the PKCS#7
 * output length up front removes that copy, and feeding the cipher in bounded
 * chunks keeps the transient buffer Node hands back to a chunk rather than a
 * second full-size ciphertext, so peak memory stays near one copy of the
 * payload instead of two.
 *
 * The ciphertext occupies `result.length - trailerBytes`; the reserved tail is
 * left zeroed for the caller to fill.
 *
 * @throws when `trailerBytes` is not a non-negative safe integer, or when the
 * cipher yields a length other than the PKCS#7 size the destination was cut to.
 */
export declare function aesCbcEncryptWithTrailer(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array, trailerBytes: number): Uint8Array;
/** AES-256-CBC decrypt with PKCS#7 padding. */
export declare function aesCbcDecrypt(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Uint8Array;
/** AES-256-CTR encrypt with the given 16-byte counter. */
export declare function aesCtrEncrypt(key: Uint8Array, counter: Uint8Array, plaintext: Uint8Array): Uint8Array;
/** AES-256-CTR decrypt with the given 16-byte counter. */
export declare function aesCtrDecrypt(key: Uint8Array, counter: Uint8Array, ciphertext: Uint8Array): Uint8Array;
/** Computes the HMAC-SHA-256 MAC of `data` keyed by `key`. */
export declare function hmacSha256Sign(key: Uint8Array, data: HashInput): Uint8Array;
/** Computes the HMAC-SHA-512 MAC of `data` keyed by `key`. */
export declare function hmacSha512Sign(key: Uint8Array, data: HashInput): Uint8Array;
/** PBKDF2 over HMAC-SHA-256 – derives `length` bytes from `password` + `salt`. */
export declare function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number, length: number): Promise<Uint8Array>;
