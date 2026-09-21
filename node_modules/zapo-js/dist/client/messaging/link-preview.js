"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLinkPreview = resolveLinkPreview;
const node_fs_1 = require("node:fs");
const media_1 = require("../media");
const constants_1 = require("../../media/constants");
const WaMediaCrypto_1 = require("../../media/crypto/WaMediaCrypto");
const detect_1 = require("../../message/addons/link-preview/detect");
const _proto_1 = require("../../proto");
const primitives_1 = require("../../util/primitives");
const INLINE_THUMBNAIL_MAX_BYTES = 64 * 1024;
async function resolveLinkPreview(text, perMessage, deps) {
    if (perMessage === false)
        return null;
    const globalEnabled = deps.options.enabled !== false;
    if (!globalEnabled && perMessage === undefined)
        return null;
    let resolved;
    if (typeof perMessage === 'object' && perMessage !== null) {
        resolved = applyOverride(text, perMessage);
        if (resolved === null)
            return null;
    }
    else {
        const detected = (0, detect_1.findFirstLink)(text);
        if (detected === null)
            return null;
        resolved = await deps.fetcher.fetch({
            url: detected.url,
            matchedText: detected.matchedText,
            logger: deps.logger
        });
        if (resolved === null)
            return null;
    }
    const thumbnailFields = await resolveThumbnailFields(deps, resolved.thumbnail);
    return { resolved, thumbnailFields };
}
function applyOverride(text, override) {
    const matchedText = override.matchedText ?? (0, detect_1.findFirstLink)(text)?.matchedText;
    if (matchedText === undefined || matchedText.length === 0)
        return null;
    return {
        matchedText,
        previewType: override.previewType ?? _proto_1.proto.Message.ExtendedTextMessage.PreviewType.NONE,
        ...(override.title !== undefined ? { title: override.title } : {}),
        ...(override.description !== undefined ? { description: override.description } : {}),
        ...(override.thumbnail !== undefined ? { thumbnail: override.thumbnail } : {})
    };
}
async function resolveThumbnailFields(deps, thumbnail) {
    if (thumbnail === undefined)
        return {};
    if ('bytes' in thumbnail) {
        return resolveBytesThumbnailFields(deps, thumbnail);
    }
    return resolveStreamThumbnailFields(deps, thumbnail);
}
async function resolveBytesThumbnailFields(deps, thumbnail) {
    const fitsInline = thumbnail.bytes.byteLength <= INLINE_THUMBNAIL_MAX_BYTES;
    const inlineFields = fitsInline ? buildInlineFields(thumbnail) : {};
    if (deps.options.uploadHqThumbnail === false) {
        return inlineFields;
    }
    try {
        const hqFields = await uploadHqFromBytes(deps, thumbnail);
        return { ...inlineFields, ...hqFields };
    }
    catch (error) {
        deps.logger.warn('link preview thumbnail upload failed', {
            message: (0, primitives_1.toError)(error).message
        });
        return inlineFields;
    }
}
async function resolveStreamThumbnailFields(deps, thumbnail) {
    if (deps.options.uploadHqThumbnail === false) {
        thumbnail.stream.destroy();
        return {};
    }
    try {
        return await uploadHqFromStream(deps, thumbnail);
    }
    catch (error) {
        deps.logger.warn('link preview thumbnail upload failed', {
            message: (0, primitives_1.toError)(error).message
        });
        thumbnail.stream.destroy();
        return {};
    }
}
function buildInlineFields(thumbnail) {
    return {
        jpegThumbnail: thumbnail.bytes,
        ...(thumbnail.width !== undefined ? { thumbnailWidth: thumbnail.width } : {}),
        ...(thumbnail.height !== undefined ? { thumbnailHeight: thumbnail.height } : {})
    };
}
async function uploadHqFromBytes(deps, thumbnail) {
    if (deps.surface === 'newsletter') {
        return uploadPlaintextHq(deps, thumbnail.bytes, thumbnail);
    }
    const mediaKey = await WaMediaCrypto_1.WaMediaCrypto.generateMediaKey();
    const encrypted = await WaMediaCrypto_1.WaMediaCrypto.encryptBytes('thumbnail-link', mediaKey, thumbnail.bytes, { sidecar: false });
    const directPath = await dispatchUpload(deps, encrypted.ciphertextHmac, encrypted.ciphertextHmac.byteLength, encrypted.fileEncSha256);
    return {
        thumbnailDirectPath: directPath,
        thumbnailSha256: encrypted.fileSha256,
        thumbnailEncSha256: encrypted.fileEncSha256,
        mediaKey,
        mediaKeyTimestamp: deps.serverClock.nowSeconds(),
        ...(thumbnail.width !== undefined ? { thumbnailWidth: thumbnail.width } : {}),
        ...(thumbnail.height !== undefined ? { thumbnailHeight: thumbnail.height } : {})
    };
}
async function uploadHqFromStream(deps, thumbnail) {
    if (deps.surface === 'newsletter') {
        return uploadPlaintextHq(deps, thumbnail.stream, thumbnail);
    }
    const mediaKey = await WaMediaCrypto_1.WaMediaCrypto.generateMediaKey();
    const encrypted = await WaMediaCrypto_1.WaMediaCrypto.encryptToFile('thumbnail-link', mediaKey, thumbnail.stream, { sidecar: false, expectedFileSize: thumbnail.contentLength });
    let readStream;
    try {
        readStream = (0, node_fs_1.createReadStream)(encrypted.filePath);
        const directPath = await dispatchUpload(deps, readStream, encrypted.fileSize, encrypted.fileEncSha256);
        return {
            thumbnailDirectPath: directPath,
            thumbnailSha256: encrypted.fileSha256,
            thumbnailEncSha256: encrypted.fileEncSha256,
            mediaKey,
            mediaKeyTimestamp: deps.serverClock.nowSeconds(),
            ...(thumbnail.width !== undefined ? { thumbnailWidth: thumbnail.width } : {}),
            ...(thumbnail.height !== undefined ? { thumbnailHeight: thumbnail.height } : {})
        };
    }
    finally {
        if (readStream && !readStream.closed) {
            await new Promise((resolve) => {
                readStream.once('close', resolve);
                readStream.destroy();
            });
        }
        await WaMediaCrypto_1.WaMediaCrypto.cleanupEncryptedFile(encrypted.filePath);
    }
}
/** Uploads the HQ thumbnail unencrypted, so no `mediaKey` / `thumbnailEncSha256`. */
async function uploadPlaintextHq(deps, source, dimensions) {
    const mediaConn = await deps.getMediaConn();
    const upload = await (0, media_1.performPlaintextMediaUpload)({ mediaTransfer: deps.mediaTransfer, mediaConn, logger: deps.logger }, {
        source,
        path: constants_1.NEWSLETTER_MEDIA_UPLOAD_PATHS['thumbnail-link'],
        mimetype: 'image/jpeg',
        logLabel: 'uploading newsletter link preview thumbnail'
    });
    (0, media_1.assertMediaUploadStatus)(upload.status, 'newsletter thumbnail-link upload');
    const parsed = (0, media_1.parseMediaUploadJsonBody)(upload.responseBytes, 'newsletter thumbnail-link upload');
    if (!parsed.direct_path) {
        throw new Error('newsletter thumbnail-link upload response missing direct_path');
    }
    return {
        thumbnailDirectPath: parsed.direct_path,
        thumbnailSha256: upload.fileSha256,
        ...(dimensions.width !== undefined ? { thumbnailWidth: dimensions.width } : {}),
        ...(dimensions.height !== undefined ? { thumbnailHeight: dimensions.height } : {})
    };
}
async function dispatchUpload(deps, body, contentLength, fileEncSha256) {
    const mediaConn = await deps.getMediaConn();
    const host = (0, media_1.selectMediaUploadHost)(mediaConn);
    const uploadUrl = (0, media_1.buildMediaUploadUrl)(host, constants_1.MEDIA_UPLOAD_PATHS['thumbnail-link'], mediaConn.auth, fileEncSha256);
    deps.logger.debug('uploading link preview thumbnail', { host, contentLength });
    const response = await deps.mediaTransfer.uploadStream({
        url: uploadUrl,
        method: 'POST',
        body,
        contentLength,
        contentType: 'image/jpeg'
    });
    const responseBody = await deps.mediaTransfer.readResponseBytes(response);
    (0, media_1.assertMediaUploadStatus)(response.status, 'thumbnail-link upload');
    const parsed = (0, media_1.parseMediaUploadJsonBody)(responseBody, 'thumbnail-link upload');
    if (!parsed.direct_path) {
        throw new Error('thumbnail-link upload response missing direct_path');
    }
    return parsed.direct_path;
}
