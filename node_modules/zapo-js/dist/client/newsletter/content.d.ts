import { type WaUploadMediaSource } from '../media';
import type { ResolvedLinkPreviewResult } from '../messaging/link-preview';
import type { Logger } from '../../infra/log/types';
import { type NewsletterMediaKind } from '../../media/constants';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import type { WaMediaConn } from '../../media/types';
import { type WaSendContextInfo } from '../../message/context-info';
import type { WaSendMessageContent, WaSendTextMessage } from '../../message/types';
export type WaNewsletterUploadMedia = WaUploadMediaSource;
export interface WaNewsletterUploadInput {
    readonly mediaKind: NewsletterMediaKind;
    readonly media: WaNewsletterUploadMedia;
    readonly mimetype: string;
    readonly mediaConn: WaMediaConn;
}
export interface WaNewsletterUploadResult {
    readonly url: string;
    readonly directPath: string;
    readonly handle?: string;
    readonly metadataUrl?: string;
    readonly thumbnailDirectPath?: string;
    readonly thumbnailSha256?: Uint8Array;
    readonly fileSha256: Uint8Array;
    readonly fileLength: number;
    readonly mediaId: string;
}
export declare function uploadNewsletterMedia(options: {
    readonly mediaTransfer: WaMediaTransferClient;
    readonly logger: Logger;
}, input: WaNewsletterUploadInput): Promise<WaNewsletterUploadResult>;
export type WaNewsletterContentKind = 'text' | 'media' | 'poll-creation';
export interface WaNewsletterBuiltContent {
    readonly kind: WaNewsletterContentKind;
    readonly plaintext: Uint8Array;
    readonly mediaType: string | null;
    readonly upload: WaNewsletterUploadResult | null;
}
export interface BuildNewsletterContentOptions {
    readonly logger: Logger;
    readonly mediaTransfer?: WaMediaTransferClient;
    readonly getMediaConn?: () => Promise<WaMediaConn>;
    /** Must be bound to the `newsletter` surface (unencrypted thumbnail upload). */
    readonly linkPreviewResolver?: (content: WaSendTextMessage) => Promise<ResolvedLinkPreviewResult | null>;
}
export declare function buildNewsletterMessageContent(options: BuildNewsletterContentOptions, content: WaSendMessageContent, ctx?: WaSendContextInfo | null): Promise<WaNewsletterBuiltContent>;
