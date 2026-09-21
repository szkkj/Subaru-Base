"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETRY_REASON = exports.RETRY_RECEIPT_VERSION = exports.RETRY_OUTBOUND_TTL_MS = exports.RETRY_KEYS_MIN_COUNT = exports.MAX_RETRY_ATTEMPTS = void 0;
exports.MAX_RETRY_ATTEMPTS = 5;
exports.RETRY_KEYS_MIN_COUNT = 2;
exports.RETRY_OUTBOUND_TTL_MS = 60 * 1000;
exports.RETRY_RECEIPT_VERSION = '1';
exports.RETRY_REASON = Object.freeze({
    UnknownError: 0,
    SignalErrorNoSession: 1,
    SignalErrorInvalidKey: 2,
    SignalErrorInvalidKeyId: 3,
    SignalErrorInvalidMessage: 4,
    SignalErrorInvalidSignature: 5,
    SignalErrorFutureMessage: 6,
    SignalErrorBadMac: 7,
    SignalErrorInvalidSession: 8,
    SignalErrorInvalidMsgKey: 9,
    BadBroadcastEphemeralSetting: 10,
    UnknownCompanionNoPrekey: 11,
    AdvFailure: 12,
    StatusRevokeDelay: 13
});
