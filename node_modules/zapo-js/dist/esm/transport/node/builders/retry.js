import { WA_NODE_TAGS } from '../../../protocol/constants.js';
import { RETRY_RECEIPT_VERSION } from '../../../retry/constants.js';
import { SIGNAL_KEY_BUNDLE_TYPE_BYTES } from '../../../signal/api/constants.js';
import { buildReceiptNode } from '../../node/builders/global.js';
import { intToBytes } from '../../../util/bytes.js';
function buildRetryKeysNode(keys) {
    const content = [
        {
            tag: WA_NODE_TAGS.TYPE,
            attrs: {},
            content: SIGNAL_KEY_BUNDLE_TYPE_BYTES
        },
        {
            tag: WA_NODE_TAGS.IDENTITY,
            attrs: {},
            content: keys.identity
        },
        {
            tag: WA_NODE_TAGS.SKEY,
            attrs: {},
            content: [
                {
                    tag: WA_NODE_TAGS.ID,
                    attrs: {},
                    content: intToBytes(3, keys.skey.id)
                },
                {
                    tag: WA_NODE_TAGS.VALUE,
                    attrs: {},
                    content: keys.skey.publicKey
                },
                {
                    tag: WA_NODE_TAGS.SIGNATURE,
                    attrs: {},
                    content: keys.skey.signature
                }
            ]
        }
    ];
    if (keys.key) {
        content.push({
            tag: WA_NODE_TAGS.KEY,
            attrs: {},
            content: [
                {
                    tag: WA_NODE_TAGS.ID,
                    attrs: {},
                    content: intToBytes(3, keys.key.id)
                },
                {
                    tag: WA_NODE_TAGS.VALUE,
                    attrs: {},
                    content: keys.key.publicKey
                }
            ]
        });
    }
    if (keys.deviceIdentity) {
        content.push({
            tag: WA_NODE_TAGS.DEVICE_IDENTITY,
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
export function buildRetryReceiptNode(input) {
    const retryAttrs = {
        v: RETRY_RECEIPT_VERSION,
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
            tag: WA_NODE_TAGS.REGISTRATION,
            attrs: {},
            content: intToBytes(4, input.registrationId)
        }
    ];
    if (input.keys) {
        content.push(buildRetryKeysNode(input.keys));
    }
    return buildReceiptNode({
        kind: 'retry_custom',
        id: input.stanzaId,
        to: input.to,
        participant: input.participant,
        recipient: input.recipient,
        categoryPeer: input.categoryPeer,
        content
    });
}
