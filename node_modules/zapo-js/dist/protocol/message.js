"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_ENC_MEDIA_TYPES = exports.WA_EVENT_META_TYPES = exports.WA_POLL_META_TYPES = exports.WA_EDIT_ATTRS = exports.WA_STANZA_MSG_TYPES = exports.WA_NACK_REASONS = exports.WA_RETRYABLE_ACK_CODES = exports.WA_MESSAGE_TYPES = exports.WA_ADDRESSING_MODES = exports.WA_ENC_CIPHERTEXT_TYPES = exports.WA_MESSAGE_TAGS = void 0;
exports.normalizeEphemeralSettingSeconds = normalizeEphemeralSettingSeconds;
exports.WA_MESSAGE_TAGS = Object.freeze({
    MESSAGE: 'message',
    ENC: 'enc',
    RECEIPT: 'receipt',
    ACK: 'ack',
    ERROR: 'error'
});
/** `<enc type>` ciphertext kinds (Signal `msg`/`pkmsg`, group `skmsg`, message-secret `msmsg`). */
exports.WA_ENC_CIPHERTEXT_TYPES = Object.freeze({
    MESSAGE: 'msg',
    PREKEY: 'pkmsg',
    SENDER_KEY: 'skmsg',
    MESSAGE_SECRET: 'msmsg'
});
/** `addressing_mode` stanza attr: phone-number vs LID addressing. */
exports.WA_ADDRESSING_MODES = Object.freeze({
    PN: 'pn',
    LID: 'lid'
});
exports.WA_MESSAGE_TYPES = Object.freeze({
    ENC_VERSION: '2',
    MEDIA_NOTIFY: 'medianotify',
    ACK_TYPE_ERROR: 'error',
    ACK_CLASS_ERROR: 'error',
    ACK_CLASS_MESSAGE: 'message',
    ACK_CLASS_CALL: 'call',
    RECEIPT_TYPE_DELIVERY: 'delivery',
    RECEIPT_TYPE_SENDER: 'sender',
    RECEIPT_TYPE_INACTIVE: 'inactive',
    RECEIPT_TYPE_READ: 'read',
    RECEIPT_TYPE_READ_SELF: 'read-self',
    RECEIPT_TYPE_PLAYED: 'played',
    RECEIPT_TYPE_PLAYED_SELF: 'played-self',
    RECEIPT_TYPE_HISTORY_SYNC: 'hist_sync',
    RECEIPT_TYPE_PEER: 'peer_msg',
    RECEIPT_TYPE_SERVER_ERROR: 'server-error',
    RECEIPT_TYPE_RETRY: 'retry',
    RECEIPT_TYPE_ENC_REKEY_RETRY: 'enc_rekey_retry',
    RECEIPT_TYPE_VIEW: 'view'
});
exports.WA_RETRYABLE_ACK_CODES = Object.freeze(['408', '429', '500', '503']);
/**
 * Stanza-ack `error` attr codes (nack reasons): sent when nacking a stanza
 * that could not be handled, and matched against the `error` carried by an
 * inbound publish ack (e.g. stale group addressing mode).
 */
exports.WA_NACK_REASONS = Object.freeze({
    STALE_GROUP_ADDRESSING_MODE: 421,
    NEW_CHAT_MESSAGES_CAPPED: 475,
    PARSING_ERROR: 487,
    UNRECOGNIZED_STANZA: 488,
    UNRECOGNIZED_STANZA_CLASS: 489,
    UNRECOGNIZED_STANZA_TYPE: 490,
    INVALID_PROTOBUF: 491,
    INVALID_HOSTED_COMPANION_STANZA: 493,
    MISSING_MESSAGE_SECRET: 495,
    SIGNAL_ERROR_OLD_COUNTER: 496,
    MESSAGE_DELETED_ON_PEER: 499,
    UNHANDLED_ERROR: 500,
    UNSUPPORTED_ADMIN_REVOKE: 550,
    UNSUPPORTED_LID_GROUP: 551,
    DB_OPERATION_FAILED: 552
});
exports.WA_STANZA_MSG_TYPES = Object.freeze({
    TEXT: 'text',
    MEDIA: 'media',
    MEDIA_NOTIFY: 'medianotify',
    PAY: 'pay',
    POLL: 'poll',
    REACTION: 'reaction',
    EVENT: 'event'
});
exports.WA_EDIT_ATTRS = Object.freeze({
    MESSAGE_EDIT: '1',
    PIN_IN_CHAT: '2',
    NEWSLETTER_EDIT: '3',
    SENDER_REVOKE: '7',
    ADMIN_REVOKE: '8'
});
exports.WA_POLL_META_TYPES = Object.freeze({
    CREATION: 'creation',
    VOTE: 'vote',
    RESULT_SNAPSHOT: 'result_snapshot',
    EDIT: 'edit'
});
exports.WA_EVENT_META_TYPES = Object.freeze({
    CREATION: 'creation',
    RESPONSE: 'response',
    EDIT: 'edit'
});
exports.WA_ENC_MEDIA_TYPES = Object.freeze({
    IMAGE: 'image',
    VIDEO: 'video',
    PTV: 'ptv',
    AUDIO: 'audio',
    PTT: 'ptt',
    LOCATION: 'location',
    LIVE_LOCATION: 'livelocation',
    VCARD: 'vcard',
    CONTACT_ARRAY: 'contact_array',
    DOCUMENT: 'document',
    URL: 'url',
    GIF: 'gif',
    STICKER: 'sticker',
    STICKER_PACK: 'sticker_pack',
    LIST: 'list',
    LIST_RESPONSE: 'list_response',
    BUTTON: 'button',
    BUTTON_RESPONSE: 'buttons_response',
    ORDER: 'order',
    PRODUCT: 'product',
    NATIVE_FLOW_RESPONSE: 'native_flow_response',
    GROUP_HISTORY: 'group_history'
});
/**
 * `ephemeralSettingTimestamp` to Unix seconds. `ContextInfo` uses seconds, the
 * history-sync `Conversation` record milliseconds, and both feed one stored
 * field. Anything past ~year 2286 in seconds can only be a millisecond stamp.
 */
function normalizeEphemeralSettingSeconds(value) {
    return value > 10000000000 ? Math.floor(value / 1000) : value;
}
