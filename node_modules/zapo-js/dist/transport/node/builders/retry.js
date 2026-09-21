"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRetryReceiptNode = buildRetryReceiptNode;
const constants_1 = require("../../../protocol/constants");
const constants_2 = require("../../../retry/constants");
const constants_3 = require("../../../signal/api/constants");
const global_1 = require("../../node/builders/global");
const bytes_1 = require("../../../util/bytes");
function buildRetryKeysNode(keys) {
    const content = [
        {
            tag: constants_1.WA_NODE_TAGS.TYPE,
            attrs: {},
            content: constants_3.SIGNAL_KEY_BUNDLE_TYPE_BYTES
        },
        {
            tag: constants_1.WA_NODE_TAGS.IDENTITY,
            attrs: {},
            content: keys.identity
        },
        {
            tag: constants_1.WA_NODE_TAGS.SKEY,
            attrs: {},
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.ID,
                    attrs: {},
                    content: (0, bytes_1.intToBytes)(3, keys.skey.id)
                },
                {
                    tag: constants_1.WA_NODE_TAGS.VALUE,
                    attrs: {},
                    content: keys.skey.publicKey
                },
                {
                    tag: constants_1.WA_NODE_TAGS.SIGNATURE,
                    attrs: {},
                    content: keys.skey.signature
                }
            ]
        }
    ];
    if (keys.key) {
        content.push({
            tag: constants_1.WA_NODE_TAGS.KEY,
            attrs: {},
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.ID,
                    attrs: {},
                    content: (0, bytes_1.intToBytes)(3, keys.key.id)
                },
                {
                    tag: constants_1.WA_NODE_TAGS.VALUE,
                    attrs: {},
                    content: keys.key.publicKey
                }
            ]
        });
    }
    if (keys.deviceIdentity) {
        content.push({
            tag: constants_1.WA_NODE_TAGS.DEVICE_IDENTITY,
            attrs: {},
            content: keys.deviceIdentity
        });
    }
    return {
        tag: 'keys',
        attrs: {},
        content
    };
}
function buildRetryReceiptNode(input) {
    const retryAttrs = {
        v: constants_2.RETRY_RECEIPT_VERSION,
        count: String(input.retryCount),
        id: input.originalMsgId,
        t: input.t,
        error: String(input.error ?? 0)
    };
    const content = [
        {
            tag: 'retry',
            attrs: retryAttrs
        },
        {
            tag: constants_1.WA_NODE_TAGS.REGISTRATION,
            attrs: {},
            content: (0, bytes_1.intToBytes)(4, input.registrationId)
        }
    ];
    if (input.keys) {
        content.push(buildRetryKeysNode(input.keys));
    }
    return (0, global_1.buildReceiptNode)({
        kind: 'retry_custom',
        id: input.stanzaId,
        to: input.to,
        participant: input.participant,
        recipient: input.recipient,
        categoryPeer: input.categoryPeer,
        content
    });
}
