export declare const DEFAULT_MEDIA_HOSTS: readonly ["mmg.whatsapp.net", "mmg-fallback.whatsapp.net"];
export declare const MEDIA_CONN_CACHE_GRACE_MS = 30000;
export declare const MEDIA_HKDF_SIZE = 80;
export declare const IV_SIZE = 16;
export declare const ENC_KEY_START = 16;
export declare const ENC_KEY_END = 48;
export declare const MAC_KEY_START = 48;
export declare const MAC_KEY_END = 80;
export declare const HMAC_TRUNCATED_SIZE = 10;
export declare const SIDECAR_CHUNK_SIZE = 65536;
export declare const SIDECAR_HMAC_SIZE = 10;
/**
 * Leading bytes buffered when deciding whether a payload supports progressive
 * playback. The top-level boxes that settle it sit at the very front of the
 * file, so this only has to survive a few small boxes before `moov`/`mdat`.
 */
export declare const CONTAINER_SCAN_MAX_BYTES = 1024;
export type MediaUploadKind = 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'gif' | 'ptt' | 'ptv' | 'ads-image' | 'ads-video' | 'group-history' | 'md-app-state' | 'md-msg-hist' | 'music-artwork' | 'newsletter-music-artwork' | 'sticker-pack' | 'thumbnail-document' | 'thumbnail-image' | 'thumbnail-link' | 'thumbnail-sticker-pack' | 'thumbnail-video' | 'waffle-image' | 'waffle-video';
export declare const MEDIA_UPLOAD_PATHS: Readonly<Record<MediaUploadKind, string>>;
export type NewsletterMediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'sticker-pack' | 'gif' | 'ptt' | 'ptv' | 'thumbnail-link';
export type PpsUploadKind = 'photo' | 'biz-cover-photo';
export declare const PPS_UPLOAD_PATHS: Readonly<Record<PpsUploadKind, string>>;
export declare const NEWSLETTER_MEDIA_UPLOAD_PATHS: Readonly<Record<NewsletterMediaKind, string>>;
