import { type Readable } from 'node:stream';
import type { WaDownloadMediaOptions, WaIncomingMessageEvent, WaMediaOptions } from './types';
import type { Logger } from '../infra/log/types';
import { WaMediaTransferClient } from '../media/transfer/WaMediaTransferClient';
import type { WaMediaConn } from '../media/types';
import type { WaSendMediaMessage } from '../message/types';
import type { Proto } from '../proto';
import type { WaProxyTransport } from '../transport/types';
export interface ProcessedMediaFields {
    readonly jpegThumbnail?: Uint8Array;
    readonly pngThumbnail?: Uint8Array;
    readonly width?: number;
    readonly height?: number;
    readonly seconds?: number;
    readonly waveform?: Uint8Array;
    readonly isAnimated?: boolean;
    readonly firstFrameLength?: number;
}
export declare function readFileHead(filePath: string, bytes: number): Promise<Uint8Array>;
interface WebpAnimInfo {
    readonly isAnimated: true;
    readonly firstFrameLength: number;
}
export declare function parseWebpAnimation(data: Uint8Array): WebpAnimInfo | null;
export declare function isReadableStream(value: unknown): value is Readable;
export declare function cleanupTempFile(filePath: string): Promise<void>;
export interface StreamFileMetrics {
    readonly fileSha256: Uint8Array;
    readonly byteLength: number;
}
export type WaUploadMediaSource = Uint8Array | string | Readable;
export declare function selectMediaUploadHost(mediaConn: WaMediaConn): string;
export declare function buildMediaUploadUrl(host: string, path: string, auth: string, fileSha256: Uint8Array, mediaId?: string): string;
export declare function assertMediaUploadStatus(status: number, label: string): void;
export declare function parseMediaUploadJsonBody<T>(body: Uint8Array, label: string): T;
export interface PlaintextMediaUploadDeps {
    readonly mediaTransfer: WaMediaTransferClient;
    readonly mediaConn: WaMediaConn;
    readonly logger: Logger;
}
export interface PlaintextMediaUploadInput {
    readonly source: WaUploadMediaSource;
    readonly path: string;
    readonly mimetype?: string;
    readonly logLabel?: string;
}
export interface PlaintextMediaUploadResult {
    readonly responseBytes: Uint8Array;
    readonly status: number;
    readonly fileSha256: Uint8Array;
    readonly byteLength: number;
    readonly mediaId: string;
}
export declare function performPlaintextMediaUpload(deps: PlaintextMediaUploadDeps, input: PlaintextMediaUploadInput): Promise<PlaintextMediaUploadResult>;
export interface ResolvedMediaInputs {
    readonly processorInput?: Uint8Array | string;
    readonly uploadMedia: Uint8Array | Readable;
    readonly tempFilePath?: string;
}
export declare function assertReadableFile(filePath: string): Promise<void>;
export declare function resolveMediaInputs(shouldProcess: boolean, raw: Uint8Array | ArrayBuffer | Readable | string): Promise<ResolvedMediaInputs>;
export declare function shouldNormalizeVoiceNote(media: WaMediaOptions | undefined, content: WaSendMediaMessage): content is WaSendMediaMessage & {
    type: 'audio';
};
export declare function hasMediaProcessingTasks(media: WaMediaOptions | undefined, content: WaSendMediaMessage): boolean;
export declare function getScopedMediaLogger(parent: Logger): Logger;
export declare function runMediaProcessor(media: WaMediaOptions | undefined, input: Uint8Array | string | undefined, content: WaSendMediaMessage, logger: Logger): Promise<ProcessedMediaFields>;
export interface WaDownloadMediaMessageOptions extends WaDownloadMediaOptions {
    /**
     * Reuse an existing transfer client instead of creating a fresh one. Lets
     * the download inherit proxy agents, timeouts, and the MAC-verification
     * toggle, and avoids spinning up a new HTTP client per call in a loop. A
     * stateless {@link WaMediaTransferClient} is created when omitted - fine
     * for one-off downloads.
     */
    readonly transfer?: WaMediaTransferClient;
    /**
     * Proxy for the CDN download leg, mirroring `proxy.mediaDownload` on the
     * client. The fetch runs over `node:http`/`node:https`, so only the Node
     * `http.Agent` form is used; an undici dispatcher is ignored (same as the
     * client treats `mediaDownload`). Takes precedence over the default agent
     * of a `transfer` you pass.
     */
    readonly proxy?: WaProxyTransport;
}
/**
 * Streams and decrypts the media attached to a message without a connected
 * `WaClient`. Resolves the encrypted payload (directPath, mediaKey, file
 * hashes) from `source`, fetches the ciphertext from the WhatsApp media CDN,
 * and decrypts it on the fly.
 *
 * The media keys come from the (already decrypted) message itself, so this is
 * for re-downloading media you have persisted - not for fetching media you
 * never received. The CDN download needs no session or auth token; only the
 * upload path does.
 *
 * **The caller owns the returned stream** - pipe it somewhere or call
 * `.destroy()` to release the socket; an unconsumed stream leaks the
 * connection. MAC + SHA-256 verification runs as bytes are consumed, so
 * aborting mid-read leaves you with unverified bytes. Pass `options.signal`
 * to cancel cleanly.
 *
 * @throws when `source` carries no downloadable media.
 * @example
 * ```ts
 * import { downloadMediaMessage } from '..'
 * import { createWriteStream } from 'node:fs'
 *
 * const stream = await downloadMediaMessage(event)
 * stream.pipe(createWriteStream('photo.jpg'))
 * ```
 * @example
 * ```ts
 * // Route the CDN download through an http.Agent-style proxy
 * import { HttpsProxyAgent } from 'https-proxy-agent'
 *
 * const stream = await downloadMediaMessage(event, {
 *     proxy: new HttpsProxyAgent('http://127.0.0.1:8080')
 * })
 * ```
 */
export declare function downloadMediaMessage(source: Proto.IMessage | WaIncomingMessageEvent, options?: WaDownloadMediaMessageOptions): Promise<Readable>;
export {};
