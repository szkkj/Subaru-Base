"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_EMAIL_ERROR_CODES = exports.WA_EMAIL_LIMITS = exports.WA_EMAIL_CONTEXTS = exports.WA_EMAIL_TAGS = exports.WA_EMAIL_XMLNS = void 0;
exports.WA_EMAIL_XMLNS = 'urn:xmpp:whatsapp:account';
exports.WA_EMAIL_TAGS = Object.freeze({
    EMAIL: 'email',
    EMAIL_ADDRESS: 'email_address',
    VERIFY_EMAIL: 'verify_email',
    CONFIRM_EMAIL: 'confirm_email',
    CONTEXT: 'context',
    CODE: 'code',
    LG: 'lg',
    LC: 'lc',
    AUTO_VERIFY: 'auto_verify',
    CONFIRMED: 'confirmed'
});
exports.WA_EMAIL_CONTEXTS = Object.freeze({
    ONBOARDING: 'onboarding',
    SETTINGS: 'settings'
});
exports.WA_EMAIL_LIMITS = Object.freeze({
    EMAIL_MAX_LENGTH: 320,
    CODE_LENGTH: 6,
    LOCALE_MIN_LENGTH: 2,
    LOCALE_MAX_LENGTH: 3
});
exports.WA_EMAIL_ERROR_CODES = Object.freeze({
    FORBIDDEN: 403,
    LOCKOUT: 534,
    CODE_EXPIRED: 535,
    CODE_INCORRECT: 536,
    TOO_MANY_RETRIES: 537
});
