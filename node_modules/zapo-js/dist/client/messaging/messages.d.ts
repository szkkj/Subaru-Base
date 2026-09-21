import { Readable } from 'node:stream';
import type { ResolvedLinkPreviewResult } from '../messaging/link-preview';
import type { WaMediaOptions } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import type { MediaCryptoType, WaMediaConn } from '../../media/types';
import type { WaMessageBuildResult, WaSendMessageContent, WaSendTextMessage } from '../../message/types';
import type { BinaryNode } from '../../transport/types';
import type { ServerClock } from '../../util/clock';
export interface WaMediaMessageOptions {
    readonly logger: Logger;
    readonly mediaTransfer: WaMediaTransferClient;
    readonly iqTimeoutMs?: number;
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
    readonly getMediaConnCache: () => WaMediaConn | null;
    readonly setMediaConnCache: (mediaConn: WaMediaConn | null) => void;
    readonly serverClock: ServerClock;
    readonly media?: WaMediaOptions;
    readonly linkPreviewResolver?: (content: WaSendTextMessage) => Promise<ResolvedLinkPreviewResult | null>;
}
export interface WaBuildMessageContext {
    readonly to: string;
    /** Outgoing stanza id, pre-resolved. Required for addon-crypto kinds (poll-vote, event-response). */
    readonly outgoingStanzaId?: string;
    /** Current me jid (used as modificationSender for addon crypto). */
    readonly meJid?: string;
}
export declare function buildMediaMessageContent(options: WaMediaMessageOptions, content: WaSendMessageContent, ctx?: WaBuildMessageContext): Promise<WaMessageBuildResult>;
export declare function getMediaConn(options: WaMediaMessageOptions, forceRefresh?: boolean): Promise<WaMediaConn>;
/** Descriptor produced by {@link uploadMedia}: CDN location, media key, hashes, and optional sidecars. */
export interface UploadResult {
    /** Absolute CDN URL of the uploaded ciphertext. */
    readonly url: string;
    /** Host-relative path; pairs with a media host or feeds `downloadMediaMessage`. */
    readonly directPath: string;
    /** 32-byte media key used to encrypt (and later decrypt) the payload. */
    readonly mediaKey: Uint8Array;
    /** SHA-256 of the plaintext. */
    readonly fileSha256: Uint8Array;
    /** SHA-256 of the encrypted `ciphertext||mac`. */
    readonly fileEncSha256: Uint8Array;
    /** Plaintext byte length. */
    readonly fileLength: number;
    /** Server metadata URL, when the CDN returns one (video). */
    readonly metadataUrl?: string;
    /** Streaming sidecar for seekable playback, when computed. */
    readonly streamingSidecar?: Uint8Array;
    /** First-frame sidecar for animated stickers, when computed. */
    readonly firstFrameSidecar?: Uint8Array;
    /** First-frame length echoed back for animated stickers. */
    readonly firstFrameLength?: number;
}
/** Fully-resolved input for {@link uploadMedia} (crypto type, path, sidecar already decided). */
export interface WaMediaUploadInput {
    readonly source: Uint8Array | Readable;
    readonly cryptoType: MediaCryptoType;
    readonly uploadPath: string;
    readonly contentType?: string;
    readonly mediaKey?: Uint8Array;
    readonly sidecar: boolean;
    readonly firstFrameLength?: number;
    readonly logLabel?: string;
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
}
/**
 * Shared media upload primitive: derives (or reuses) a media key, encrypts,
 * fetches a media connection, and POSTs the ciphertext. Bytes take a
 * zero-temp-file fast path; streams stage to a temp file first. Backs both the
 * send path and `WaMessageCoordinator.upload`.
 */
export declare function uploadMedia(options: WaMediaMessageOptions, input: WaMediaUploadInput): Promise<UploadResult>;
