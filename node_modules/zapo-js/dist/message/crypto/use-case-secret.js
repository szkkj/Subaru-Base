"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_USE_CASE_SECRET_MODIFICATION_TYPES = exports.WA_MESSAGE_SECRET_BYTES = void 0;
exports.assertMessageSecret = assertMessageSecret;
exports.ensureMessageSecret = ensureMessageSecret;
exports.createUseCaseSecret = createUseCaseSecret;
const _crypto_1 = require("../../crypto");
const bytes_1 = require("../../util/bytes");
exports.WA_MESSAGE_SECRET_BYTES = 32;
exports.WA_USE_CASE_SECRET_MODIFICATION_TYPES = Object.freeze({
    POLL_VOTE: 'Poll Vote',
    ENC_REACTION: 'Enc Reaction',
    ENC_COMMENT: 'Enc Comment',
    REPORT_TOKEN: 'Report Token',
    EVENT_RESPONSE: 'Event Response',
    EVENT_EDIT_ENCRYPTED: 'Event Edit',
    MESSAGE_EDIT: 'Message Edit',
    POLL_EDIT_ENCRYPTED: 'Poll Edit',
    POLL_ADD_OPTION: 'Poll Add Option'
});
/**
 * Validates that `messageSecret` is exactly 32 bytes and returns it as a
 * zero-copy Uint8Array view (throws otherwise).
 */
function assertMessageSecret(messageSecret, context = 'message secret') {
    const bytes = (0, bytes_1.toBytesView)(messageSecret);
    if (bytes.byteLength !== exports.WA_MESSAGE_SECRET_BYTES) {
        throw new Error(`${context} must be ${exports.WA_MESSAGE_SECRET_BYTES} bytes (got ${bytes.byteLength})`);
    }
    return bytes;
}
/**
 * Returns `message` unchanged when a message secret is already present;
 * otherwise generates a fresh 32-byte secret and attaches it under
 * `messageContextInfo.messageSecret`.
 */
async function ensureMessageSecret(message) {
    const messageSecret = message.messageContextInfo?.messageSecret;
    if (messageSecret && messageSecret.byteLength > 0) {
        return message;
    }
    const generatedMessageSecret = await (0, _crypto_1.randomBytesAsync)(exports.WA_MESSAGE_SECRET_BYTES);
    return {
        ...message,
        messageContextInfo: {
            ...(message.messageContextInfo ?? {}),
            messageSecret: generatedMessageSecret
        }
    };
}
/**
 * Derives the per-use-case secret (poll vote, reaction, edit, ...) via HKDF
 * over `messageSecret` and the canonical `stanzaId + sender + sender +
 * modificationType` info string.
 */
// eslint-disable-next-line @typescript-eslint/require-await
async function createUseCaseSecret(input) {
    if (!input.stanzaId.trim()) {
        throw new Error('stanza id must be a non-empty string');
    }
    if (!input.parentMsgOriginalSender.trim()) {
        throw new Error('parent message original sender must be a non-empty string');
    }
    if (!input.modificationSender.trim()) {
        throw new Error('modification sender must be a non-empty string');
    }
    const secretInfo = bytes_1.TEXT_ENCODER.encode(input.stanzaId +
        input.parentMsgOriginalSender +
        input.modificationSender +
        input.modificationType);
    return (0, _crypto_1.hkdf)(assertMessageSecret(input.messageSecret), null, secretInfo, exports.WA_MESSAGE_SECRET_BYTES);
}
