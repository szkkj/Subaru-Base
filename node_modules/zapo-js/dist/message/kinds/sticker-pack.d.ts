import { type StickerPackZipEntry } from '../../media/sticker/sticker-pack';
import type { WaSendStickerPackMessage } from '../types';
import type { Proto } from '../../proto';
export declare function validateStickerPackInput(content: WaSendStickerPackMessage): void;
export declare function toStickerPackZipEntries(content: WaSendStickerPackMessage): StickerPackZipEntry[];
export declare function toStickerPackProtoStickers(content: WaSendStickerPackMessage): Proto.Message.StickerPackMessage.ISticker[];
