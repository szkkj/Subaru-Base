import { createReadStream } from 'node:fs';
import { assertMediaUploadStatus, buildMediaUploadUrl, parseMediaUploadJsonBody, performPlaintextMediaUpload, selectMediaUploadHost } from '../media.js';
import { MEDIA_UPLOAD_PATHS, NEWSLETTER_MEDIA_UPLOAD_PATHS } from '../../media/constants.js';
import { WaMediaCrypto } from '../../media/crypto/WaMediaCrypto.js';
import { findFirstLink } from '../../message/addons/link-preview/detect.js';
import { proto } from '../../proto.js';
import { toError } from '../../util/primitives.js';
const INLINE_THUMBNAIL_MAX_BYTES = 64 * 1024;
export async function resolveLinkPreview(text, perMessage, deps) {
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
        const detected = findFirstLink(text);
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
    const matchedText = override.matchedText ?? findFirstLink(text)?.matchedText;
    if (matchedText === undefined || matchedText.length === 0)
        return null;
    return {
        matchedText,
        previewType: override.previewType ?? proto.Message.ExtendedTextMessage.PreviewType.NONE,
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
            message: toError(error).message
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
            message: toError(error).message
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
    const mediaKey = await WaMediaCrypto.generateMediaKey();
    const encrypted = await WaMediaCrypto.encryptBytes('thumbnail-link', mediaKey, thumbnail.bytes, { sidecar: false });
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
    const mediaKey = await WaMediaCrypto.generateMediaKey();
    const encrypted = await WaMediaCrypto.encryptToFile('thumbnail-link', mediaKey, thumbnail.stream, { sidecar: false, expectedFileSize: thumbnail.contentLength });
    let readStream;
    try {
        readStream = createReadStream(encrypted.filePath);
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
        await WaMediaCrypto.cleanupEncryptedFile(encrypted.filePath);
    }
}
/** Uploads the HQ thumbnail unencrypted, so no `mediaKey` / `thumbnailEncSha256`. */
async function uploadPlaintextHq(deps, source, dimensions) {
    const mediaConn = await deps.getMediaConn();
    const upload = await performPlaintextMediaUpload({ mediaTransfer: deps.mediaTransfer, mediaConn, logger: deps.logger }, {
        source,
        path: NEWSLETTER_MEDIA_UPLOAD_PATHS['thumbnail-link'],
        mimetype: 'image/jpeg',
        logLabel: 'uploading newsletter link preview thumbnail'
    });
    assertMediaUploadStatus(upload.status, 'newsletter thumbnail-link upload');
    const parsed = parseMediaUploadJsonBody(upload.responseBytes, 'newsletter thumbnail-link upload');
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
    const host = selectMediaUploadHost(mediaConn);
    const uploadUrl = buildMediaUploadUrl(host, MEDIA_UPLOAD_PATHS['thumbnail-link'], mediaConn.auth, fileEncSha256);
    deps.logger.debug('uploading link preview thumbnail', { host, contentLength });
    const response = await deps.mediaTransfer.uploadStream({
        url: uploadUrl,
        method: 'POST',
        body,
        contentLength,
        contentType: 'image/jpeg'
    });
    const responseBody = await deps.mediaTransfer.readResponseBytes(response);
    assertMediaUploadStatus(response.status, 'thumbnail-link upload');
    const parsed = parseMediaUploadJsonBody(responseBody, 'thumbnail-link upload');
    if (!parsed.direct_path) {
        throw new Error('thumbnail-link upload response missing direct_path');
    }
    return parsed.direct_path;
}
