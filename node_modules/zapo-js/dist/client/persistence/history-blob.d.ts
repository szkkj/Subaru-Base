import { Readable } from 'node:stream';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import type { MediaCryptoType } from '../../media/types';
/**
 * Encrypted-blob fields shared by the history-sync notification and the
 * group-history bundle: both point at a CDN object plus the key and hashes
 * needed to decrypt and verify it.
 */
export interface WaHistoryBlobSource {
    readonly directPath?: string | null;
    readonly mediaKey?: Uint8Array | string | null;
    readonly fileSha256?: Uint8Array | string | null;
    readonly fileEncSha256?: Uint8Array | string | null;
}
/**
 * Fetches and decrypts a history blob. `label` prefixes the field errors so a
 * failure names which payload was malformed.
 *
 * @throws when `directPath` is absent or a key/hash field is missing.
 */
export declare function downloadHistoryBlob(mediaTransfer: WaMediaTransferClient, source: WaHistoryBlobSource, mediaType: MediaCryptoType, label: string): Promise<Uint8Array>;
export interface WaHistoryBlobStream {
    /** Decrypted and decompressed bytes. Consume fully, then await `verified`. */
    readonly inflated: Readable;
    /**
     * Settles once the transfer ended and its MAC checked out. Verification can
     * only finish with the last byte, so anything read from `inflated` is
     * unauthenticated until this resolves - await it before treating the chunk
     * as applied.
     */
    readonly verified: Promise<unknown>;
}
/**
 * Streaming counterpart of {@link downloadHistoryBlob}, so a multi-megabyte chunk
 * is never held whole. Uses `inlinePayload` when the notification carried the
 * blob inline instead of pointing at a CDN object.
 *
 * @throws when neither an inline payload nor a `directPath` is present, or when
 * a key/hash field is missing.
 */
export declare function openHistoryBlobStream(mediaTransfer: WaMediaTransferClient, source: WaHistoryBlobSource, mediaType: MediaCryptoType, label: string, inlinePayload?: Uint8Array | string | null): Promise<WaHistoryBlobStream>;
/**
 * Awaits an accumulating write batch and empties it in place, so the caller can
 * keep filling the same array instead of allocating a new one per chunk.
 */
export declare function flushPendingWrites(pendingWrites: Promise<void>[]): Promise<void>;
