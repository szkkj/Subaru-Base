"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMediaPayload = resolveMediaPayload;
const content_1 = require("../encode/content");
const primitives_1 = require("../../util/primitives");
function buildPayload(mediaType, fields) {
    if (!fields.directPath || !fields.mediaKey) {
        return null;
    }
    const mediaKey = fields.mediaKey instanceof Uint8Array ? fields.mediaKey : null;
    if (!mediaKey) {
        return null;
    }
    const fileSha256 = fields.fileSha256 instanceof Uint8Array ? fields.fileSha256 : undefined;
    const fileEncSha256 = fields.fileEncSha256 instanceof Uint8Array ? fields.fileEncSha256 : undefined;
    return {
        mediaType,
        directPath: fields.directPath,
        mediaKey,
        fileSha256,
        fileEncSha256,
        mimetype: fields.mimetype ?? undefined,
        fileLength: fields.fileLength ? (0, primitives_1.longToNumber)(fields.fileLength) : undefined
    };
}
/**
 * Extracts the downloadable media metadata from a message, unwrapping
 * ephemeral / view-once / document-with-caption envelopes first.
 *
 * Returns `null` when `message` is absent, carries no media, or the media node
 * lacks the `directPath` / `mediaKey` needed to fetch and decrypt the blob (a
 * non-`Uint8Array` `mediaKey` also yields `null`). Supported kinds: image,
 * video (gif when `gifPlayback`), audio (ptt when `ptt`), document, sticker,
 * ptv, and the group-history bundle shared with a member after they join.
 *
 * @example
 * ```ts
 * const payload = resolveMediaPayload(event.message)
 * if (payload) {
 *     // payload.directPath, payload.mediaKey, payload.fileEncSha256, ...
 * }
 * ```
 */
function resolveMediaPayload(message) {
    if (!message)
        return null;
    const msg = (0, content_1.unwrapMessage)(message);
    if (msg.imageMessage)
        return buildPayload('image', msg.imageMessage);
    if (msg.videoMessage) {
        return buildPayload(msg.videoMessage.gifPlayback ? 'gif' : 'video', msg.videoMessage);
    }
    if (msg.audioMessage) {
        return buildPayload(msg.audioMessage.ptt ? 'ptt' : 'audio', msg.audioMessage);
    }
    if (msg.documentMessage)
        return buildPayload('document', msg.documentMessage);
    if (msg.stickerMessage)
        return buildPayload('sticker', msg.stickerMessage);
    if (msg.ptvMessage)
        return buildPayload('ptv', msg.ptvMessage);
    if (msg.messageHistoryBundle)
        return buildPayload('group-history', msg.messageHistoryBundle);
    return null;
}
