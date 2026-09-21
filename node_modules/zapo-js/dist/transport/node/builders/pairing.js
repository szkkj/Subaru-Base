"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCompanionHelloRequestNode = buildCompanionHelloRequestNode;
exports.buildGetCountryCodeRequestNode = buildGetCountryCodeRequestNode;
exports.buildCompanionFinishRequestNode = buildCompanionFinishRequestNode;
const constants_1 = require("../../../protocol/constants");
const bytes_1 = require("../../../util/bytes");
function buildCompanionHelloRequestNode(args) {
    return {
        tag: constants_1.WA_NODE_TAGS.IQ,
        attrs: {
            to: constants_1.WA_DEFAULTS.HOST_DOMAIN,
            type: constants_1.WA_IQ_TYPES.SET,
            xmlns: constants_1.WA_XMLNS.MD
        },
        content: [
            {
                tag: constants_1.WA_NODE_TAGS.LINK_CODE_COMPANION_REG,
                attrs: {
                    jid: args.phoneJid,
                    stage: constants_1.WA_SIGNALING.LINK_CODE_STAGE_COMPANION_HELLO,
                    should_show_push_notification: args.shouldShowPushNotification
                        ? 'true'
                        : 'false'
                },
                content: [
                    {
                        tag: 'link_code_pairing_wrapped_companion_ephemeral_pub',
                        attrs: {},
                        content: args.wrappedCompanionEphemeralPub
                    },
                    {
                        tag: 'companion_server_auth_key_pub',
                        attrs: {},
                        content: args.companionServerAuthKeyPub
                    },
                    {
                        tag: 'companion_platform_id',
                        attrs: {},
                        content: args.companionPlatformId
                    },
                    {
                        tag: 'companion_platform_display',
                        attrs: {},
                        content: args.companionPlatformDisplay
                    },
                    {
                        tag: 'link_code_pairing_nonce',
                        attrs: {},
                        content: bytes_1.ZERO_BYTES
                    }
                ]
            }
        ]
    };
}
function buildGetCountryCodeRequestNode() {
    return {
        tag: constants_1.WA_NODE_TAGS.IQ,
        attrs: {
            to: constants_1.WA_DEFAULTS.HOST_DOMAIN,
            type: constants_1.WA_IQ_TYPES.GET,
            xmlns: constants_1.WA_XMLNS.MD
        },
        content: [
            {
                tag: constants_1.WA_NODE_TAGS.LINK_CODE_COMPANION_REG,
                attrs: {
                    stage: constants_1.WA_SIGNALING.LINK_CODE_STAGE_GET_COUNTRY_CODE
                }
            }
        ]
    };
}
function buildCompanionFinishRequestNode(args) {
    return {
        tag: constants_1.WA_NODE_TAGS.IQ,
        attrs: {
            to: constants_1.WA_DEFAULTS.HOST_DOMAIN,
            type: constants_1.WA_IQ_TYPES.SET,
            xmlns: constants_1.WA_XMLNS.MD
        },
        content: [
            {
                tag: constants_1.WA_NODE_TAGS.LINK_CODE_COMPANION_REG,
                attrs: {
                    jid: args.phoneJid,
                    stage: constants_1.WA_SIGNALING.LINK_CODE_STAGE_COMPANION_FINISH
                },
                content: [
                    {
                        tag: 'link_code_pairing_wrapped_key_bundle',
                        attrs: {},
                        content: args.wrappedKeyBundle
                    },
                    {
                        tag: 'companion_identity_public',
                        attrs: {},
                        content: args.companionIdentityPublic
                    },
                    {
                        tag: constants_1.WA_NODE_TAGS.LINK_CODE_PAIRING_REF,
                        attrs: {},
                        content: args.ref
                    }
                ]
            }
        ]
    };
}
