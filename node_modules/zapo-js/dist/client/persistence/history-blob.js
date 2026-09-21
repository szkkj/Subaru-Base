"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadHistoryBlob = downloadHistoryBlob;
exports.openHistoryBlobStream = openHistoryBlobStream;
exports.flushPendingWrites = flushPendingWrites;
const node_stream_1 = require("node:stream");
const node_zlib_1 = require("node:zlib");
const bytes_1 = require("../../util/bytes");
/**
 * Fetches and decrypts a history blob. `label` prefixes the field errors so a
 * failure names which payload was malformed.
 *
 * @throws when `directPath` is absent or a key/hash field is missing.
 */
async function downloadHistoryBlob(mediaTransfer, source, mediaType, label) {
    if (!source.directPath) {
        throw new Error(`${label} missing directPath`);
    }
    const mediaKey = (0, bytes_1.decodeProtoBytes)(source.mediaKey, `${label} mediaKey`);
    const fileSha256 = (0, bytes_1.decodeProtoBytes)(source.fileSha256, `${label} fileSha256`);
    const fileEncSha256 = (0, bytes_1.decodeProtoBytes)(source.fileEncSha256, `${label} fileEncSha256`);
    return mediaTransfer.downloadAndDecrypt({
        directPath: source.directPath,
        mediaType,
        mediaKey,
        fileSha256,
        fileEncSha256
    });
}
/**
 * Streaming counterpart of {@link downloadHistoryBlob}, so a multi-megabyte chunk
 * is never held whole. Uses `inlinePayload` when the notification carried the
 * blob inline instead of pointing at a CDN object.
 *
 * @throws when neither an inline payload nor a `directPath` is present, or when
 * a key/hash field is missing.
 */
async function openHistoryBlobStream(mediaTransfer, source, mediaType, label, inlinePayload) {
    if (inlinePayload) {
        const bytes = (0, bytes_1.decodeProtoBytes)(inlinePayload, `${label} inline payload`);
        return inflateHistoryStream(node_stream_1.Readable.from([bytes]), Promise.resolve(null));
    }
    if (!source.directPath) {
        throw new Error(`${label} missing directPath`);
    }
    const decrypted = await mediaTransfer.downloadAndDecryptStream({
        directPath: source.directPath,
        mediaType,
        mediaKey: (0, bytes_1.decodeProtoBytes)(source.mediaKey, `${label} mediaKey`),
        fileSha256: (0, bytes_1.decodeProtoBytes)(source.fileSha256, `${label} fileSha256`),
        fileEncSha256: (0, bytes_1.decodeProtoBytes)(source.fileEncSha256, `${label} fileEncSha256`)
    });
    return inflateHistoryStream(decrypted.plaintext, decrypted.metadata);
}
/**
 * `createUnzip` detects the framing. `pipeline` rather than `pipe` so failure
 * closes both directions: a consumer that destroys `inflated` mid-chunk also
 * tears down the decryption pump and its socket, which `pipe` would leave
 * draining. Also parks a handler on `verified` so an early rejection is never
 * unobserved.
 */
function inflateHistoryStream(plaintext, verified) {
    const unzip = (0, node_zlib_1.createUnzip)();
    (0, node_stream_1.pipeline)(plaintext, unzip, () => undefined);
    verified.catch(() => undefined);
    return { inflated: unzip, verified };
}
/**
 * Awaits an accumulating write batch and empties it in place, so the caller can
 * keep filling the same array instead of allocating a new one per chunk.
 */
async function flushPendingWrites(pendingWrites) {
    if (pendingWrites.length === 0) {
        return;
    }
    const settled = Promise.all(pendingWrites);
    pendingWrites.length = 0;
    await settled;
}
