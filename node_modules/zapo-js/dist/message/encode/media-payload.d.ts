import type { MediaCryptoType } from '../../media/types';
import type { Proto } from '../../proto';
/**
 * Decrypted media metadata pulled out of a message, carrying everything a CDN
 * download needs (see `downloadMediaMessage`). Binary fields are raw
 * `Uint8Array`s exactly as the protobuf message carried them - never base64
 * strings.
 */
export interface WaResolvedMediaPayload {
    /**
     * Crypto/HKDF domain for the kind: image, video, gif, audio, ptt, document,
     * sticker, ptv, group-history.
     */
    readonly mediaType: MediaCryptoType;
    /** Server-relative path (or absolute URL) of the encrypted blob on the media CDN. */
    readonly directPath: string;
    /** Media key used to derive the AES/MAC keys. Sensitive key material - do not log. */
    readonly mediaKey: Uint8Array;
    /** SHA-256 of the decrypted file, when the message carried it. */
    readonly fileSha256?: Uint8Array;
    /** SHA-256 of the encrypted file, when the message carried it. */
    readonly fileEncSha256?: Uint8Array;
    /** Declared MIME type, when present. */
    readonly mimetype?: string;
    /** Declared plaintext length in bytes, when present. */
    readonly fileLength?: number;
}
/**
 * Extracts the downloadable media metadata from a message, unwrapping
 * ephemeral / view-once / document-with-caption envelopes first.
 *
 * Returns `null` when `message` is absent, carries no media, or the media node
 * lacks the `directPath` / `mediaKey` needed to fetch and decrypt the blob (a
 * non-`Uint8Array` `mediaKey` also yields `null`). Supported kinds: image,
 * video (gif when `gifPlayback`), audio (ptt when `ptt`), document, sticker,
 * ptv, and the group-history bundle shared with a member after they join.
 *
 * @example
 * ```ts
 * const payload = resolveMediaPayload(event.message)
 * if (payload) {
 *     // payload.directPath, payload.mediaKey, payload.fileEncSha256, ...
 * }
 * ```
 */
export declare function resolveMediaPayload(message: Proto.IMessage | null | undefined): WaResolvedMediaPayload | null;
