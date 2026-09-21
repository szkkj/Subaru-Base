"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_TC_TOKEN_DEFAULTS = exports.WA_PRIVACY_TOKEN_NOTIFICATION_TYPE = exports.WA_PRIVACY_TOKEN_TAGS = exports.WA_PRIVACY_TOKEN_TYPES = void 0;
exports.WA_PRIVACY_TOKEN_TYPES = Object.freeze({
    TRUSTED_CONTACT: 'trusted_contact'
});
exports.WA_PRIVACY_TOKEN_TAGS = Object.freeze({
    TOKENS: 'tokens',
    TOKEN: 'token',
    TC_TOKEN: 'tctoken',
    CS_TOKEN: 'cstoken'
});
exports.WA_PRIVACY_TOKEN_NOTIFICATION_TYPE = 'privacy_token';
exports.WA_TC_TOKEN_DEFAULTS = Object.freeze({
    DURATION_S: 604800,
    NUM_BUCKETS: 4,
    SENDER_DURATION_S: 604800,
    SENDER_NUM_BUCKETS: 4,
    MAX_DURATION_S: 15552000
});
