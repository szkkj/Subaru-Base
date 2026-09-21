"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPreKeyUploadIq = buildPreKeyUploadIq;
exports.buildSignedPreKeyRotateIq = buildSignedPreKeyRotateIq;
exports.buildMissingPreKeysFetchIq = buildMissingPreKeysFetchIq;
const keys_1 = require("../../../crypto/core/keys");
const constants_1 = require("../../../protocol/constants");
const constants_2 = require("../../../signal/api/constants");
const query_1 = require("../../node/query");
const bytes_1 = require("../../../util/bytes");
function buildSignedPreKeyNode(signedPreKey) {
    return {
        tag: constants_1.WA_NODE_TAGS.SKEY,
        attrs: {},
        content: [
            {
                tag: constants_1.WA_NODE_TAGS.ID,
                attrs: {},
                content: (0, bytes_1.intToBytes)(3, signedPreKey.keyId)
            },
            {
                tag: constants_1.WA_NODE_TAGS.VALUE,
                attrs: {},
                content: (0, keys_1.toRawPubKey)(signedPreKey.keyPair.pubKey)
            },
            {
                tag: constants_1.WA_NODE_TAGS.SIGNATURE,
                attrs: {},
                content: signedPreKey.signature
            }
        ]
    };
}
function buildPreKeyUploadIq(registrationInfo, signedPreKey, preKeys) {
    const children = [];
    children.push({
        tag: constants_1.WA_NODE_TAGS.IDENTITY,
        attrs: {},
        content: (0, keys_1.toRawPubKey)(registrationInfo.identityKeyPair.pubKey)
    }, {
        tag: constants_1.WA_NODE_TAGS.REGISTRATION,
        attrs: {},
        content: (0, bytes_1.intToBytes)(4, registrationInfo.registrationId)
    }, {
        tag: constants_1.WA_NODE_TAGS.TYPE,
        attrs: {},
        content: constants_2.SIGNAL_KEY_BUNDLE_TYPE_BYTES
    }, {
        tag: constants_1.WA_NODE_TAGS.LIST,
        attrs: {},
        content: preKeys.map((record) => ({
            tag: constants_1.WA_NODE_TAGS.KEY,
            attrs: {},
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.ID,
                    attrs: {},
                    content: (0, bytes_1.intToBytes)(3, record.keyId)
                },
                {
                    tag: constants_1.WA_NODE_TAGS.VALUE,
                    attrs: {},
                    content: (0, keys_1.toRawPubKey)(record.keyPair.pubKey)
                }
            ]
        }))
    }, buildSignedPreKeyNode(signedPreKey));
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.SIGNAL, children);
}
function buildSignedPreKeyRotateIq(signedPreKey) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.SIGNAL, [
        {
            tag: constants_1.WA_NODE_TAGS.ROTATE,
            attrs: {},
            content: [buildSignedPreKeyNode(signedPreKey)]
        }
    ]);
}
function buildMissingPreKeysFetchIq(users) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.SIGNAL, [
        {
            tag: constants_1.WA_NODE_TAGS.KEY_FETCH,
            attrs: {},
            content: users.map((user) => ({
                tag: constants_1.WA_NODE_TAGS.USER,
                attrs: {
                    jid: user.userJid,
                    ...(user.reasonIdentity === true ? { reason: 'identity' } : {})
                },
                content: user.devices.map((device) => ({
                    tag: constants_1.WA_NODE_TAGS.DEVICE,
                    attrs: { id: String(device.deviceId) },
                    content: [
                        {
                            tag: constants_1.WA_NODE_TAGS.REGISTRATION,
                            attrs: {},
                            content: (0, bytes_1.intToBytes)(4, device.registrationId)
                        }
                    ]
                }))
            }))
        }
    ]);
}
