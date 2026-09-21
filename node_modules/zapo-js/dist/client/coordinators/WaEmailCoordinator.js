"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailCoordinator = createEmailCoordinator;
const email_1 = require("../../protocol/email");
const email_2 = require("../../transport/node/builders/email");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
/** Builds a {@link WaEmailCoordinator} backed by the given IQ query function. */
function createEmailCoordinator(options) {
    const { queryWithContext } = options;
    return {
        getStatus: async () => {
            const result = await queryWithContext('email.getStatus', (0, email_2.buildGetEmailIq)());
            (0, query_1.assertIqResult)(result, 'email.getStatus');
            return parseEmailStatus(result);
        },
        setEmail: async (email, context) => {
            const result = await queryWithContext('email.set', (0, email_2.buildSetEmailIq)(email, context), undefined, context !== undefined ? { context } : {});
            (0, query_1.assertIqResult)(result, 'email.set');
            return parseEmailStatus(result);
        },
        requestVerificationCode: async (input) => {
            const result = await queryWithContext('email.requestCode', (0, email_2.buildRequestEmailVerificationCodeIq)(input), undefined, { languageCode: input.languageCode, localeCode: input.localeCode });
            (0, query_1.assertIqResult)(result, 'email.requestCode');
        },
        verifyCode: async (code) => {
            const result = await queryWithContext('email.verifyCode', (0, email_2.buildVerifyEmailCodeIq)(code));
            (0, query_1.assertIqResult)(result, 'email.verifyCode');
            return parseVerifyCodeResult(result);
        },
        confirm: async (context) => {
            const result = await queryWithContext('email.confirm', (0, email_2.buildConfirmEmailIq)(context), undefined, context !== undefined ? { context } : {});
            (0, query_1.assertIqResult)(result, 'email.confirm');
        }
    };
}
function parseEmailStatus(result) {
    const emailNode = (0, helpers_1.findNodeChild)(result, email_1.WA_EMAIL_TAGS.EMAIL);
    if (!emailNode) {
        return { email: null, verified: false, confirmed: false };
    }
    const verifiedAttr = emailNode.attrs.verified;
    const addressNode = (0, helpers_1.findNodeChild)(emailNode, email_1.WA_EMAIL_TAGS.EMAIL_ADDRESS);
    const confirmedNode = (0, helpers_1.findNodeChild)(emailNode, email_1.WA_EMAIL_TAGS.CONFIRMED);
    return {
        email: addressNode ? ((0, helpers_1.getNodeTextContent)(addressNode) ?? null) : null,
        verified: verifiedAttr === 'true',
        confirmed: confirmedNode ? (0, helpers_1.getNodeTextContent)(confirmedNode) === 'true' : false
    };
}
function parseVerifyCodeResult(result) {
    const emailNode = (0, helpers_1.findNodeChild)(result, email_1.WA_EMAIL_TAGS.EMAIL);
    if (!emailNode) {
        return { verified: false, autoVerifyFailed: false, email: null };
    }
    const doVerify = emailNode.attrs.do_verify;
    const autoVerifyNode = (0, helpers_1.findNodeChild)(emailNode, email_1.WA_EMAIL_TAGS.AUTO_VERIFY);
    const addressNode = (0, helpers_1.findNodeChild)(emailNode, email_1.WA_EMAIL_TAGS.EMAIL_ADDRESS);
    return {
        verified: doVerify === 'true',
        autoVerifyFailed: autoVerifyNode ? (0, helpers_1.getNodeTextContent)(autoVerifyNode) === 'fail' : false,
        email: addressNode ? ((0, helpers_1.getNodeTextContent)(addressNode) ?? null) : null
    };
}
