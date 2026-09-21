import type { WaMediaTransferClient } from '../../../media/transfer/WaMediaTransferClient';
import type { WaProxyTransport } from '../../../transport/types';
import type { WaLinkPreviewFetcher } from './types';
export interface DefaultLinkPreviewFetcherOptions {
    readonly mediaTransfer: WaMediaTransferClient;
    readonly userAgent?: string;
    readonly fetchTimeoutMs?: number;
    readonly maxHtmlBytes?: number;
    readonly maxThumbnailBytes?: number;
    readonly allowPrivateHosts?: boolean;
    readonly proxy?: WaProxyTransport;
}
export declare function createDefaultLinkPreviewFetcher(options: DefaultLinkPreviewFetcherOptions): WaLinkPreviewFetcher;
