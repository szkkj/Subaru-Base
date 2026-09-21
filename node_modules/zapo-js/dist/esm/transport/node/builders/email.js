import { WA_DEFAULTS } from '../../../protocol/defaults.js';
import { WA_EMAIL_LIMITS, WA_EMAIL_TAGS, WA_EMAIL_XMLNS } from '../../../protocol/email.js';
import { WA_IQ_TYPES } from '../../../protocol/nodes.js';
import { buildIqNode } from '../../node/query.js';
export function buildGetEmailIq() {
    return buildIqNode(WA_IQ_TYPES.GET, WA_DEFAULTS.HOST_DOMAIN, WA_EMAIL_XMLNS, [
        { tag: WA_EMAIL_TAGS.EMAIL, attrs: {} }
    ]);
}
export function buildSetEmailIq(email, context) {
    if (email.length === 0 || email.length > WA_EMAIL_LIMITS.EMAIL_MAX_LENGTH) {
        throw new Error(`email length must be between 1 and ${WA_EMAIL_LIMITS.EMAIL_MAX_LENGTH} chars`);
    }
    const emailChildren = [];
    if (context !== undefined) {
        emailChildren.push({ tag: WA_EMAIL_TAGS.CONTEXT, attrs: {}, content: context });
    }
    emailChildren.push({ tag: WA_EMAIL_TAGS.EMAIL_ADDRESS, attrs: {}, content: email });
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_EMAIL_XMLNS, [
        { tag: WA_EMAIL_TAGS.EMAIL, attrs: {}, content: emailChildren }
    ]);
}
export function buildRequestEmailVerificationCodeIq(input) {
    assertLocaleField('languageCode', input.languageCode);
    assertLocaleField('localeCode', input.localeCode);
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_EMAIL_XMLNS, [
        {
            tag: WA_EMAIL_TAGS.VERIFY_EMAIL,
            attrs: {},
            content: [
                { tag: WA_EMAIL_TAGS.LG, attrs: {}, content: input.languageCode },
                { tag: WA_EMAIL_TAGS.LC, attrs: {}, content: input.localeCode }
            ]
        }
    ]);
}
export function buildVerifyEmailCodeIq(code) {
    if (code.length !== WA_EMAIL_LIMITS.CODE_LENGTH) {
        throw new Error(`verification code must be exactly ${WA_EMAIL_LIMITS.CODE_LENGTH} chars`);
    }
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_EMAIL_XMLNS, [
        {
            tag: WA_EMAIL_TAGS.VERIFY_EMAIL,
            attrs: {},
            content: [{ tag: WA_EMAIL_TAGS.CODE, attrs: {}, content: code }]
        }
    ]);
}
export function buildConfirmEmailIq(context) {
    const children = context !== undefined
        ? [{ tag: WA_EMAIL_TAGS.CONTEXT, attrs: {}, content: context }]
        : undefined;
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_EMAIL_XMLNS, [
        {
            tag: WA_EMAIL_TAGS.CONFIRM_EMAIL,
            attrs: {},
            ...(children !== undefined ? { content: children } : {})
        }
    ]);
}
function assertLocaleField(field, value) {
    if (value.length < WA_EMAIL_LIMITS.LOCALE_MIN_LENGTH ||
        value.length > WA_EMAIL_LIMITS.LOCALE_MAX_LENGTH) {
        throw new Error(`${field} must be between ${WA_EMAIL_LIMITS.LOCALE_MIN_LENGTH} and ${WA_EMAIL_LIMITS.LOCALE_MAX_LENGTH} chars`);
    }
}
