"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStickerPackInput = validateStickerPackInput;
exports.toStickerPackZipEntries = toStickerPackZipEntries;
exports.toStickerPackProtoStickers = toStickerPackProtoStickers;
function validateStickerPackInput(content) {
    if (content.stickers.length === 0) {
        throw new Error('sticker pack requires at least one sticker');
    }
    if (!content.trayIcon.fileName) {
        throw new Error('sticker pack trayIcon requires a non-empty fileName');
    }
    if (content.stickers.some((sticker) => sticker.fileName === content.trayIcon.fileName)) {
        throw new Error(`sticker pack trayIcon.fileName ${content.trayIcon.fileName} collides with a sticker fileName; the tray icon must be a separate ZIP entry`);
    }
}
function toStickerPackZipEntries(content) {
    return [
        ...content.stickers.map((sticker) => ({
            fileName: sticker.fileName,
            source: sticker.media
        })),
        { fileName: content.trayIcon.fileName, source: content.trayIcon.media }
    ];
}
function toStickerPackProtoStickers(content) {
    return content.stickers.map((sticker) => ({
        fileName: sticker.fileName,
        emojis: [...sticker.emojis],
        isAnimated: sticker.isAnimated,
        isLottie: sticker.isLottie,
        mimetype: sticker.mimetype ?? 'image/webp'
    }));
}
