import type { Logger } from '../../infra/log/types';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import type { WaMediaConn } from '../../media/types';
import type { WaLinkPreviewThumbnailFields } from '../../message/addons/link-preview/builder';
import type { WaLinkPreviewFetcher, WaLinkPreviewOptions, WaLinkPreviewOverride, WaLinkPreviewResolved } from '../../message/addons/link-preview/types';
import type { ServerClock } from '../../util/clock';
/**
 * Where the preview is published. `chat` uploads the HQ thumbnail encrypted;
 * `newsletter` uploads it in the clear, since channel media is not encrypted.
 */
export type WaLinkPreviewSurface = 'chat' | 'newsletter';
export interface ResolveLinkPreviewDeps {
    readonly logger: Logger;
    readonly mediaTransfer: WaMediaTransferClient;
    readonly getMediaConn: () => Promise<WaMediaConn>;
    readonly fetcher: WaLinkPreviewFetcher;
    readonly options: WaLinkPreviewOptions;
    readonly serverClock: ServerClock;
    /** Defaults to `chat`. */
    readonly surface?: WaLinkPreviewSurface;
}
export interface ResolvedLinkPreviewResult {
    readonly resolved: WaLinkPreviewResolved;
    readonly thumbnailFields: WaLinkPreviewThumbnailFields;
}
export declare function resolveLinkPreview(text: string, perMessage: boolean | WaLinkPreviewOverride | undefined, deps: ResolveLinkPreviewDeps): Promise<ResolvedLinkPreviewResult | null>;
