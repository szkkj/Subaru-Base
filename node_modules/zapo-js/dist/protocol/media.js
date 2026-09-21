"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_PREVIEW_MEDIA_HKDF_INFO = exports.WA_MEDIA_HKDF_INFO = void 0;
exports.getWaMediaHkdfInfo = getWaMediaHkdfInfo;
const bytes_1 = require("../util/bytes");
const IMAGE_KEYS = bytes_1.TEXT_ENCODER.encode('WhatsApp Image Keys');
const VIDEO_KEYS = bytes_1.TEXT_ENCODER.encode('WhatsApp Video Keys');
const AUDIO_KEYS = bytes_1.TEXT_ENCODER.encode('WhatsApp Audio Keys');
const HISTORY_KEYS = bytes_1.TEXT_ENCODER.encode('WhatsApp History Keys');
exports.WA_MEDIA_HKDF_INFO = Object.freeze({
    document: bytes_1.TEXT_ENCODER.encode('WhatsApp Document Keys'),
    image: IMAGE_KEYS,
    sticker: IMAGE_KEYS,
    'xma-image': IMAGE_KEYS,
    video: VIDEO_KEYS,
    gif: VIDEO_KEYS,
    audio: AUDIO_KEYS,
    ptt: AUDIO_KEYS,
    'md-app-state': bytes_1.TEXT_ENCODER.encode('WhatsApp App State Keys'),
    'md-msg-hist': HISTORY_KEYS,
    history: HISTORY_KEYS,
    'group-history': bytes_1.TEXT_ENCODER.encode('Group History'),
    'sticker-pack': bytes_1.TEXT_ENCODER.encode('WhatsApp Sticker Pack Keys'),
    'thumbnail-sticker-pack': bytes_1.TEXT_ENCODER.encode('WhatsApp Sticker Pack Thumbnail Keys'),
    'thumbnail-link': bytes_1.TEXT_ENCODER.encode('WhatsApp Link Thumbnail Keys')
});
exports.WA_PREVIEW_MEDIA_HKDF_INFO = bytes_1.TEXT_ENCODER.encode('Messenger Preview Keys');
/**
 * Returns the HKDF `info` bytes used to derive per-media keys for a given
 * media type. Throws for unsupported types – see {@link WA_MEDIA_HKDF_INFO}
 * for the supported set.
 */
function getWaMediaHkdfInfo(mediaType) {
    const info = exports.WA_MEDIA_HKDF_INFO[mediaType];
    if (info !== undefined)
        return info;
    throw new Error(`unsupported media type: ${mediaType}`);
}
