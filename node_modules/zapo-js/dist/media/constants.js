"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEWSLETTER_MEDIA_UPLOAD_PATHS = exports.PPS_UPLOAD_PATHS = exports.MEDIA_UPLOAD_PATHS = exports.CONTAINER_SCAN_MAX_BYTES = exports.SIDECAR_HMAC_SIZE = exports.SIDECAR_CHUNK_SIZE = exports.HMAC_TRUNCATED_SIZE = exports.MAC_KEY_END = exports.MAC_KEY_START = exports.ENC_KEY_END = exports.ENC_KEY_START = exports.IV_SIZE = exports.MEDIA_HKDF_SIZE = exports.MEDIA_CONN_CACHE_GRACE_MS = exports.DEFAULT_MEDIA_HOSTS = void 0;
exports.DEFAULT_MEDIA_HOSTS = Object.freeze([
    'mmg.whatsapp.net',
    'mmg-fallback.whatsapp.net'
]);
exports.MEDIA_CONN_CACHE_GRACE_MS = 30000;
exports.MEDIA_HKDF_SIZE = 80;
exports.IV_SIZE = 16;
exports.ENC_KEY_START = 16;
exports.ENC_KEY_END = 48;
exports.MAC_KEY_START = 48;
exports.MAC_KEY_END = 80;
exports.HMAC_TRUNCATED_SIZE = 10;
exports.SIDECAR_CHUNK_SIZE = 65536;
exports.SIDECAR_HMAC_SIZE = 10;
/**
 * Leading bytes buffered when deciding whether a payload supports progressive
 * playback. The top-level boxes that settle it sit at the very front of the
 * file, so this only has to survive a few small boxes before `moov`/`mdat`.
 */
exports.CONTAINER_SCAN_MAX_BYTES = 1024;
exports.MEDIA_UPLOAD_PATHS = Object.freeze({
    image: '/mms/image',
    video: '/mms/video',
    audio: '/mms/audio',
    document: '/mms/document',
    sticker: '/mms/sticker',
    gif: '/mms/gif',
    ptt: '/mms/ptt',
    ptv: '/mms/video',
    'ads-image': '/mms/ads-image',
    'ads-video': '/mms/ads-video',
    'group-history': '/mms/group-history',
    'md-app-state': '/mms/md-app-state',
    'md-msg-hist': '/mms/md-msg-hist',
    'music-artwork': '/mms/music-artwork',
    'newsletter-music-artwork': '/mms/newsletter-music-artwork',
    'sticker-pack': '/mms/sticker-pack',
    'thumbnail-document': '/mms/thumbnail-document',
    'thumbnail-image': '/mms/thumbnail-image',
    'thumbnail-link': '/mms/thumbnail-link',
    'thumbnail-sticker-pack': '/mms/thumbnail-sticker-pack',
    'thumbnail-video': '/mms/thumbnail-video',
    'waffle-image': '/mms/waffle-image',
    'waffle-video': '/mms/waffle-video'
});
exports.PPS_UPLOAD_PATHS = Object.freeze({
    photo: '/pps/photo',
    'biz-cover-photo': '/pps/biz-cover-photo'
});
exports.NEWSLETTER_MEDIA_UPLOAD_PATHS = Object.freeze({
    image: '/newsletter/newsletter-image',
    video: '/newsletter/newsletter-video',
    audio: '/newsletter/newsletter-audio',
    document: '/newsletter/newsletter-document',
    sticker: '/newsletter/newsletter-sticker',
    'sticker-pack': '/newsletter/newsletter-sticker-pack',
    gif: '/newsletter/newsletter-gif',
    ptt: '/newsletter/newsletter-ptt',
    ptv: '/newsletter/newsletter-ptv',
    'thumbnail-link': '/newsletter/newsletter-thumbnail-link'
});
