import { Readable } from 'node:stream';
export interface StickerPackZipEntry {
    readonly fileName: string;
    readonly source: Uint8Array | string;
}
export declare function createStickerPackZipStream(entries: readonly StickerPackZipEntry[]): Readable;
