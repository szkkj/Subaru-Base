import { type Readable } from 'node:stream';
import type { MediaCryptoType, WaMediaDecryptionResult, WaMediaDecryptReadableOptions, WaMediaDerivedKeys, WaMediaEncryptionResult, WaMediaFileEncryptionResult, WaMediaReadableDecryptionResult, WaMediaReadableEncryptionResult } from '../types';
/**
 * WhatsApp media payload encryption/decryption (AES-256-CBC + HMAC-SHA-256 +
 * SHA-256 hashes + streaming sidecar). Buffer-only and streaming variants are
 * provided for upload, download, and disk-staged encryption.
 */
export declare class WaMediaCrypto {
    /** Generates a fresh 32-byte media key suitable for {@link deriveKeys}. */
    static generateMediaKey(): Promise<Uint8Array>;
    /**
     * Derives the per-type AES IV, AES key, and MAC key from `mediaKey` using
     * HKDF with the {@link getWaMediaHkdfInfo} context.
     */
    static deriveKeys(mediaType: MediaCryptoType, mediaKey: Uint8Array): WaMediaDerivedKeys;
    /**
     * Encrypts an in-memory buffer with the streaming sidecar (unless disabled)
     * and an optional first-frame sidecar for instant-thumbnail playback.
     */
    static encryptBytes(mediaType: MediaCryptoType, mediaKey: Uint8Array, plaintext: Uint8Array, options?: {
        readonly sidecar?: boolean;
        readonly firstFrameLength?: number;
    }): Promise<WaMediaEncryptionResult>;
    /**
     * Decrypts an in-memory `ciphertext||mac` buffer. Verifies the encrypted
     * SHA-256, the MAC, and (when supplied) the plaintext SHA-256. Pass
     * `skipMacVerification` only when the MAC was checked elsewhere.
     */
    static decryptBytes(mediaType: MediaCryptoType, mediaKey: Uint8Array, ciphertextHmac: Uint8Array, expectedFileSha256?: Uint8Array, expectedFileEncSha256?: Uint8Array, skipMacVerification?: boolean): Promise<WaMediaDecryptionResult>;
    /**
     * Streaming encrypt – returns an `encrypted` Readable plus a `metadata`
     * promise that resolves with hashes/sidecars after the stream ends.
     */
    static encryptReadable(mediaType: MediaCryptoType, mediaKey: Uint8Array, plaintext: Readable, options?: {
        readonly sidecar?: boolean;
        readonly firstFrameLength?: number;
        readonly expectedFileSize?: number;
    }): Promise<WaMediaReadableEncryptionResult>;
    /**
     * Encrypts `plaintext` to a temporary file in `tmpdir()` and returns its
     * path/size/hashes. The file is removed on failure; call
     * {@link cleanupEncryptedFile} after a successful upload.
     */
    static encryptToFile(mediaType: MediaCryptoType, mediaKey: Uint8Array, plaintext: Readable, options?: {
        readonly sidecar?: boolean;
        readonly firstFrameLength?: number;
        readonly expectedFileSize?: number;
    }): Promise<WaMediaFileEncryptionResult>;
    /** Removes a temporary file produced by {@link encryptToFile}; missing files are ignored. */
    static cleanupEncryptedFile(filePath: string): Promise<void>;
    /**
     * Streaming decrypt – returns a `plaintext` Readable plus a `metadata`
     * promise that resolves with the verified hashes after the stream ends
     * (or rejects on MAC/hash failure).
     */
    static decryptReadable(encrypted: Readable, options: WaMediaDecryptReadableOptions): Promise<WaMediaReadableDecryptionResult>;
    /** Returns the ciphertext byte length (AES-CBC padded + 10-byte MAC) for a given plaintext size. */
    static encryptedLength(plaintextLength: number): number;
}
