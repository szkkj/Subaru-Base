import { toRawPubKey } from '../../../crypto/core/keys.js';
import { WA_DEFAULTS, WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../../protocol/constants.js';
import { SIGNAL_KEY_BUNDLE_TYPE_BYTES } from '../../../signal/api/constants.js';
import { buildIqNode } from '../../node/query.js';
import { intToBytes } from '../../../util/bytes.js';
function buildSignedPreKeyNode(signedPreKey) {
    return {
        tag: WA_NODE_TAGS.SKEY,
        attrs: {},
        content: [
            {
                tag: WA_NODE_TAGS.ID,
                attrs: {},
                content: intToBytes(3, signedPreKey.keyId)
            },
            {
                tag: WA_NODE_TAGS.VALUE,
                attrs: {},
                content: toRawPubKey(signedPreKey.keyPair.pubKey)
            },
            {
                tag: WA_NODE_TAGS.SIGNATURE,
                attrs: {},
                content: signedPreKey.signature
            }
        ]
    };
}
export function buildPreKeyUploadIq(registrationInfo, signedPreKey, preKeys) {
    const children = [];
    children.push({
        tag: WA_NODE_TAGS.IDENTITY,
        attrs: {},
        content: toRawPubKey(registrationInfo.identityKeyPair.pubKey)
    }, {
        tag: WA_NODE_TAGS.REGISTRATION,
        attrs: {},
        content: intToBytes(4, registrationInfo.registrationId)
    }, {
        tag: WA_NODE_TAGS.TYPE,
        attrs: {},
        content: SIGNAL_KEY_BUNDLE_TYPE_BYTES
    }, {
        tag: WA_NODE_TAGS.LIST,
        attrs: {},
        content: preKeys.map((record) => ({
            tag: WA_NODE_TAGS.KEY,
            attrs: {},
            content: [
                {
                    tag: WA_NODE_TAGS.ID,
                    attrs: {},
                    content: intToBytes(3, record.keyId)
                },
                {
                    tag: WA_NODE_TAGS.VALUE,
                    attrs: {},
                    content: toRawPubKey(record.keyPair.pubKey)
                }
            ]
        }))
    }, buildSignedPreKeyNode(signedPreKey));
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.SIGNAL, children);
}
export function buildSignedPreKeyRotateIq(signedPreKey) {
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.SIGNAL, [
        {
            tag: WA_NODE_TAGS.ROTATE,
            attrs: {},
            content: [buildSignedPreKeyNode(signedPreKey)]
        }
    ]);
}
export function buildMissingPreKeysFetchIq(users) {
    return buildIqNode(WA_IQ_TYPES.GET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.SIGNAL, [
        {
            tag: WA_NODE_TAGS.KEY_FETCH,
            attrs: {},
            content: users.map((user) => ({
                tag: WA_NODE_TAGS.USER,
                attrs: {
                    jid: user.userJid,
                    ...(user.reasonIdentity === true ? { reason: 'identity' } : {})
                },
                content: user.devices.map((device) => ({
                    tag: WA_NODE_TAGS.DEVICE,
                    attrs: { id: String(device.deviceId) },
                    content: [
                        {
                            tag: WA_NODE_TAGS.REGISTRATION,
                            attrs: {},
                            content: intToBytes(4, device.registrationId)
                        }
                    ]
                }))
            }))
        }
    ]);
}
