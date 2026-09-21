"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_RETRY_IV_SIZE = void 0;
exports.encryptServerErrorReceipt = encryptServerErrorReceipt;
exports.decryptMediaRetryNotification = decryptMediaRetryNotification;
const hkdf_1 = require("../../crypto/core/hkdf");
const primitives_1 = require("../../crypto/core/primitives");
const random_1 = require("../../crypto/core/random");
const _proto_1 = require("../../proto");
const bytes_1 = require("../../util/bytes");
/** AES-GCM nonce size of both media-reupload payloads. */
exports.MEDIA_RETRY_IV_SIZE = 12;
/** Media key the RMR key is expanded from, and the AES-256 key it expands to. */
const MEDIA_KEY_SIZE = 32;
const MEDIA_RETRY_KEY_SIZE = 32;
const MEDIA_RETRY_HKDF_INFO_BYTES = bytes_1.TEXT_ENCODER.encode('WhatsApp Media Retry Notification');
/** HKDF-SHA-256 over the media key, empty salt, `WhatsApp Media Retry Notification` context. */
function deriveMediaRetryKey(mediaKey) {
    (0, bytes_1.assertByteLength)(mediaKey, MEDIA_KEY_SIZE, `invalid media key length ${mediaKey.byteLength}, expected ${MEDIA_KEY_SIZE}`);
    return (0, hkdf_1.hkdf)(mediaKey, null, MEDIA_RETRY_HKDF_INFO_BYTES, MEDIA_RETRY_KEY_SIZE);
}
/**
 * Seals the `ServerErrorReceipt` a `server-error` receipt carries. The stanza id
 * is both the payload and the AES-GCM associated data, so the blob cannot be
 * replayed against another message. Leave `iv` unset outside tests.
 */
async function encryptServerErrorReceipt(mediaKey, stanzaId, iv) {
    const key = deriveMediaRetryKey(mediaKey);
    const nonce = iv ?? (await (0, random_1.randomBytesAsync)(exports.MEDIA_RETRY_IV_SIZE));
    (0, bytes_1.assertByteLength)(nonce, exports.MEDIA_RETRY_IV_SIZE, `invalid media retry iv length ${nonce.byteLength}, expected ${exports.MEDIA_RETRY_IV_SIZE}`);
    const plaintext = _proto_1.proto.ServerErrorReceipt.encode({ stanzaId }).finish();
    const ciphertext = (0, primitives_1.aesGcmEncrypt)(key, nonce, plaintext, bytes_1.TEXT_ENCODER.encode(stanzaId));
    return { ciphertext, iv: nonce };
}
/**
 * Opens the `<encrypt>` payload of a `mediaretry` notification. Callers must
 * still check the decoded `stanzaId` against the notification's id - a valid
 * auth tag only proves the payload was sealed under this media key.
 */
function decryptMediaRetryNotification(input) {
    const key = deriveMediaRetryKey(input.mediaKey);
    (0, bytes_1.assertByteLength)(input.iv, exports.MEDIA_RETRY_IV_SIZE, `invalid media retry iv length ${input.iv.byteLength}, expected ${exports.MEDIA_RETRY_IV_SIZE}`);
    const plaintext = (0, primitives_1.aesGcmDecrypt)(key, input.iv, input.ciphertext, bytes_1.TEXT_ENCODER.encode(input.stanzaId));
    return _proto_1.proto.MediaRetryNotification.decode(plaintext);
}
