import type { Proto } from '../../../proto';
import type { WaLinkPreviewResolved } from './types';
export interface WaLinkPreviewThumbnailFields {
    readonly jpegThumbnail?: Uint8Array;
    readonly thumbnailDirectPath?: string;
    readonly thumbnailSha256?: Uint8Array;
    readonly thumbnailEncSha256?: Uint8Array;
    readonly mediaKey?: Uint8Array;
    readonly mediaKeyTimestamp?: number;
    readonly thumbnailWidth?: number;
    readonly thumbnailHeight?: number;
}
export declare function buildExtendedTextWithPreview(text: string, resolved: WaLinkPreviewResolved, thumbnailFields: WaLinkPreviewThumbnailFields): Proto.IMessage;
