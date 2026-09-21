import type { Readable } from 'node:stream';
import { type Proto } from '../../proto';
export declare const GROUP_HISTORY_FIELDS: Readonly<{
    readonly MESSAGES: 1;
    readonly OUT_OF_WINDOW_PINNED_MESSAGES: 4;
}>;
/**
 * Wire form of a group-history bundle: the zlib-compressed blob that is
 * encrypted and uploaded to the media CDN, plus the uncompressed protobuf
 * bytes the sender-side reporting token is computed over.
 */
export interface WaGroupHistoryBundleEncoding {
    /** zlib-compressed `GroupHistory` payload - the blob that gets uploaded. */
    readonly compressed: Uint8Array;
    /** Uncompressed `GroupHistory` protobuf bytes. */
    readonly encoded: Uint8Array;
}
/**
 * Serializes the messages shared with a member who just joined a group into a
 * `GroupHistory` payload, compressed the way the receiver expects.
 *
 * `outOfWindowPinnedMessages` carries pinned messages older than the shared
 * window, which the receiver injects regardless of the age cutoff.
 *
 * Both arrays are handed to the encoder as-is. The generated type asks for
 * mutable arrays, but encoding only reads them, so the assertion avoids
 * copying every message of the bundle for nothing.
 */
export declare function encodeGroupHistoryBundle(messages: readonly Proto.IWebMessageInfo[], outOfWindowPinnedMessages?: readonly Proto.IWebMessageInfo[]): Promise<WaGroupHistoryBundleEncoding>;
/**
 * Inflates and decodes a downloaded group-history bundle blob.
 *
 * @throws when the blob is not valid zlib or does not decode as `GroupHistory`.
 */
export declare function decodeGroupHistoryBundle(blob: Uint8Array): Promise<Proto.GroupHistory>;
/**
 * `outOfWindow` marks a pinned message from outside the shared window, which the
 * receiver keeps regardless of the age cutoff. The message is decoded from a
 * private copy, so it stays valid after the handler returns; protobuf decoding
 * aliases the source buffer for `bytes` fields, and the reader reuses its own.
 */
export type WaGroupHistoryMessageHandler = (message: Proto.WebMessageInfo, outOfWindow: boolean) => void | Promise<void>;
/**
 * Streaming counterpart of {@link decodeGroupHistoryBundle}: walks an inflated
 * bundle and hands out one message at a time, so peak memory tracks the largest
 * single message instead of the whole bundle. `GroupHistory` carries its messages
 * as top-level repeated fields, so no record needs descending into.
 *
 * Comment messages and associated-message lists are skipped, matching what the
 * buffered consumer reads.
 *
 * @throws when the stream is truncated or a record exceeds `maxRecordBytes`.
 */
export declare function streamGroupHistoryBundle(inflated: Readable, onMessage: WaGroupHistoryMessageHandler, maxRecordBytes?: number): Promise<void>;
