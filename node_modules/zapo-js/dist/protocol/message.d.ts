export declare const WA_MESSAGE_TAGS: Readonly<{
    readonly MESSAGE: "message";
    readonly ENC: "enc";
    readonly RECEIPT: "receipt";
    readonly ACK: "ack";
    readonly ERROR: "error";
}>;
/** `<enc type>` ciphertext kinds (Signal `msg`/`pkmsg`, group `skmsg`, message-secret `msmsg`). */
export declare const WA_ENC_CIPHERTEXT_TYPES: Readonly<{
    readonly MESSAGE: "msg";
    readonly PREKEY: "pkmsg";
    readonly SENDER_KEY: "skmsg";
    readonly MESSAGE_SECRET: "msmsg";
}>;
export type WaEncCiphertextType = (typeof WA_ENC_CIPHERTEXT_TYPES)[keyof typeof WA_ENC_CIPHERTEXT_TYPES];
/** `addressing_mode` stanza attr: phone-number vs LID addressing. */
export declare const WA_ADDRESSING_MODES: Readonly<{
    readonly PN: "pn";
    readonly LID: "lid";
}>;
export type WaAddressingMode = (typeof WA_ADDRESSING_MODES)[keyof typeof WA_ADDRESSING_MODES];
export declare const WA_MESSAGE_TYPES: Readonly<{
    readonly ENC_VERSION: "2";
    readonly MEDIA_NOTIFY: "medianotify";
    readonly ACK_TYPE_ERROR: "error";
    readonly ACK_CLASS_ERROR: "error";
    readonly ACK_CLASS_MESSAGE: "message";
    readonly ACK_CLASS_CALL: "call";
    readonly RECEIPT_TYPE_DELIVERY: "delivery";
    readonly RECEIPT_TYPE_SENDER: "sender";
    readonly RECEIPT_TYPE_INACTIVE: "inactive";
    readonly RECEIPT_TYPE_READ: "read";
    readonly RECEIPT_TYPE_READ_SELF: "read-self";
    readonly RECEIPT_TYPE_PLAYED: "played";
    readonly RECEIPT_TYPE_PLAYED_SELF: "played-self";
    readonly RECEIPT_TYPE_HISTORY_SYNC: "hist_sync";
    readonly RECEIPT_TYPE_PEER: "peer_msg";
    readonly RECEIPT_TYPE_SERVER_ERROR: "server-error";
    readonly RECEIPT_TYPE_RETRY: "retry";
    readonly RECEIPT_TYPE_ENC_REKEY_RETRY: "enc_rekey_retry";
    readonly RECEIPT_TYPE_VIEW: "view";
}>;
export type WaOutboundReceiptType = typeof WA_MESSAGE_TYPES.RECEIPT_TYPE_READ | typeof WA_MESSAGE_TYPES.RECEIPT_TYPE_READ_SELF | typeof WA_MESSAGE_TYPES.RECEIPT_TYPE_PLAYED | typeof WA_MESSAGE_TYPES.RECEIPT_TYPE_PLAYED_SELF | typeof WA_MESSAGE_TYPES.RECEIPT_TYPE_INACTIVE | typeof WA_MESSAGE_TYPES.RECEIPT_TYPE_HISTORY_SYNC;
export declare const WA_RETRYABLE_ACK_CODES: readonly ["408", "429", "500", "503"];
/**
 * Stanza-ack `error` attr codes (nack reasons): sent when nacking a stanza
 * that could not be handled, and matched against the `error` carried by an
 * inbound publish ack (e.g. stale group addressing mode).
 */
export declare const WA_NACK_REASONS: Readonly<{
    readonly STALE_GROUP_ADDRESSING_MODE: 421;
    readonly NEW_CHAT_MESSAGES_CAPPED: 475;
    readonly PARSING_ERROR: 487;
    readonly UNRECOGNIZED_STANZA: 488;
    readonly UNRECOGNIZED_STANZA_CLASS: 489;
    readonly UNRECOGNIZED_STANZA_TYPE: 490;
    readonly INVALID_PROTOBUF: 491;
    readonly INVALID_HOSTED_COMPANION_STANZA: 493;
    readonly MISSING_MESSAGE_SECRET: 495;
    readonly SIGNAL_ERROR_OLD_COUNTER: 496;
    readonly MESSAGE_DELETED_ON_PEER: 499;
    readonly UNHANDLED_ERROR: 500;
    readonly UNSUPPORTED_ADMIN_REVOKE: 550;
    readonly UNSUPPORTED_LID_GROUP: 551;
    readonly DB_OPERATION_FAILED: 552;
}>;
export declare const WA_STANZA_MSG_TYPES: Readonly<{
    readonly TEXT: "text";
    readonly MEDIA: "media";
    readonly MEDIA_NOTIFY: "medianotify";
    readonly PAY: "pay";
    readonly POLL: "poll";
    readonly REACTION: "reaction";
    readonly EVENT: "event";
}>;
export declare const WA_EDIT_ATTRS: Readonly<{
    readonly MESSAGE_EDIT: "1";
    readonly PIN_IN_CHAT: "2";
    readonly NEWSLETTER_EDIT: "3";
    readonly SENDER_REVOKE: "7";
    readonly ADMIN_REVOKE: "8";
}>;
export declare const WA_POLL_META_TYPES: Readonly<{
    readonly CREATION: "creation";
    readonly VOTE: "vote";
    readonly RESULT_SNAPSHOT: "result_snapshot";
    readonly EDIT: "edit";
}>;
export declare const WA_EVENT_META_TYPES: Readonly<{
    readonly CREATION: "creation";
    readonly RESPONSE: "response";
    readonly EDIT: "edit";
}>;
export declare const WA_ENC_MEDIA_TYPES: Readonly<{
    readonly IMAGE: "image";
    readonly VIDEO: "video";
    readonly PTV: "ptv";
    readonly AUDIO: "audio";
    readonly PTT: "ptt";
    readonly LOCATION: "location";
    readonly LIVE_LOCATION: "livelocation";
    readonly VCARD: "vcard";
    readonly CONTACT_ARRAY: "contact_array";
    readonly DOCUMENT: "document";
    readonly URL: "url";
    readonly GIF: "gif";
    readonly STICKER: "sticker";
    readonly STICKER_PACK: "sticker_pack";
    readonly LIST: "list";
    readonly LIST_RESPONSE: "list_response";
    readonly BUTTON: "button";
    readonly BUTTON_RESPONSE: "buttons_response";
    readonly ORDER: "order";
    readonly PRODUCT: "product";
    readonly NATIVE_FLOW_RESPONSE: "native_flow_response";
    readonly GROUP_HISTORY: "group_history";
}>;
/**
 * `ephemeralSettingTimestamp` to Unix seconds. `ContextInfo` uses seconds, the
 * history-sync `Conversation` record milliseconds, and both feed one stored
 * field. Anything past ~year 2286 in seconds can only be a millisecond stamp.
 */
export declare function normalizeEphemeralSettingSeconds(value: number): number;
