"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGetEmailIq = buildGetEmailIq;
exports.buildSetEmailIq = buildSetEmailIq;
exports.buildRequestEmailVerificationCodeIq = buildRequestEmailVerificationCodeIq;
exports.buildVerifyEmailCodeIq = buildVerifyEmailCodeIq;
exports.buildConfirmEmailIq = buildConfirmEmailIq;
const defaults_1 = require("../../../protocol/defaults");
const email_1 = require("../../../protocol/email");
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
function buildGetEmailIq() {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, email_1.WA_EMAIL_XMLNS, [
        { tag: email_1.WA_EMAIL_TAGS.EMAIL, attrs: {} }
    ]);
}
function buildSetEmailIq(email, context) {
    if (email.length === 0 || email.length > email_1.WA_EMAIL_LIMITS.EMAIL_MAX_LENGTH) {
        throw new Error(`email length must be between 1 and ${email_1.WA_EMAIL_LIMITS.EMAIL_MAX_LENGTH} chars`);
    }
    const emailChildren = [];
    if (context !== undefined) {
        emailChildren.push({ tag: email_1.WA_EMAIL_TAGS.CONTEXT, attrs: {}, content: context });
    }
    emailChildren.push({ tag: email_1.WA_EMAIL_TAGS.EMAIL_ADDRESS, attrs: {}, content: email });
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, email_1.WA_EMAIL_XMLNS, [
        { tag: email_1.WA_EMAIL_TAGS.EMAIL, attrs: {}, content: emailChildren }
    ]);
}
function buildRequestEmailVerificationCodeIq(input) {
    assertLocaleField('languageCode', input.languageCode);
    assertLocaleField('localeCode', input.localeCode);
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, email_1.WA_EMAIL_XMLNS, [
        {
            tag: email_1.WA_EMAIL_TAGS.VERIFY_EMAIL,
            attrs: {},
            content: [
                { tag: email_1.WA_EMAIL_TAGS.LG, attrs: {}, content: input.languageCode },
                { tag: email_1.WA_EMAIL_TAGS.LC, attrs: {}, content: input.localeCode }
            ]
        }
    ]);
}
function buildVerifyEmailCodeIq(code) {
    if (code.length !== email_1.WA_EMAIL_LIMITS.CODE_LENGTH) {
        throw new Error(`verification code must be exactly ${email_1.WA_EMAIL_LIMITS.CODE_LENGTH} chars`);
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, email_1.WA_EMAIL_XMLNS, [
        {
            tag: email_1.WA_EMAIL_TAGS.VERIFY_EMAIL,
            attrs: {},
            content: [{ tag: email_1.WA_EMAIL_TAGS.CODE, attrs: {}, content: code }]
        }
    ]);
}
function buildConfirmEmailIq(context) {
    const children = context !== undefined
        ? [{ tag: email_1.WA_EMAIL_TAGS.CONTEXT, attrs: {}, content: context }]
        : undefined;
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, email_1.WA_EMAIL_XMLNS, [
        {
            tag: email_1.WA_EMAIL_TAGS.CONFIRM_EMAIL,
            attrs: {},
            ...(children !== undefined ? { content: children } : {})
        }
    ]);
}
function assertLocaleField(field, value) {
    if (value.length < email_1.WA_EMAIL_LIMITS.LOCALE_MIN_LENGTH ||
        value.length > email_1.WA_EMAIL_LIMITS.LOCALE_MAX_LENGTH) {
        throw new Error(`${field} must be between ${email_1.WA_EMAIL_LIMITS.LOCALE_MIN_LENGTH} and ${email_1.WA_EMAIL_LIMITS.LOCALE_MAX_LENGTH} chars`);
    }
}
