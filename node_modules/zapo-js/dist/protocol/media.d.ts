export declare const WA_MEDIA_HKDF_INFO: Readonly<{
    readonly document: NodeJS.NonSharedUint8Array;
    readonly image: NodeJS.NonSharedUint8Array;
    readonly sticker: NodeJS.NonSharedUint8Array;
    readonly 'xma-image': NodeJS.NonSharedUint8Array;
    readonly video: NodeJS.NonSharedUint8Array;
    readonly gif: NodeJS.NonSharedUint8Array;
    readonly audio: NodeJS.NonSharedUint8Array;
    readonly ptt: NodeJS.NonSharedUint8Array;
    readonly 'md-app-state': NodeJS.NonSharedUint8Array;
    readonly 'md-msg-hist': NodeJS.NonSharedUint8Array;
    readonly history: NodeJS.NonSharedUint8Array;
    readonly 'group-history': NodeJS.NonSharedUint8Array;
    readonly 'sticker-pack': NodeJS.NonSharedUint8Array;
    readonly 'thumbnail-sticker-pack': NodeJS.NonSharedUint8Array;
    readonly 'thumbnail-link': NodeJS.NonSharedUint8Array;
}>;
export declare const WA_PREVIEW_MEDIA_HKDF_INFO: NodeJS.NonSharedUint8Array;
/**
 * Returns the HKDF `info` bytes used to derive per-media keys for a given
 * media type. Throws for unsupported types – see {@link WA_MEDIA_HKDF_INFO}
 * for the supported set.
 */
export declare function getWaMediaHkdfInfo(mediaType: string): Uint8Array;
