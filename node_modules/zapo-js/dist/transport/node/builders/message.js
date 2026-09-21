"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildButtonAddonNode = buildButtonAddonNode;
exports.buildDirectMessageFanoutNode = buildDirectMessageFanoutNode;
exports.buildGroupSenderKeyMessageNode = buildGroupSenderKeyMessageNode;
exports.buildGroupRetryMessageNode = buildGroupRetryMessageNode;
exports.buildMetaNode = buildMetaNode;
const constants_1 = require("../../../protocol/constants");
function buildEncAttrs(encType, mediatype, retryCount, decryptFail) {
    const attrs = {
        v: constants_1.WA_MESSAGE_TYPES.ENC_VERSION,
        type: encType
    };
    if (mediatype) {
        attrs.mediatype = mediatype;
    }
    if (retryCount !== undefined && retryCount > 0) {
        attrs.count = String(Math.trunc(retryCount));
    }
    if (decryptFail) {
        attrs['decrypt-fail'] = decryptFail;
    }
    return attrs;
}
function buildMessageAttrs(input) {
    const attrs = {
        to: input.to,
        type: input.type
    };
    if (input.id) {
        attrs.id = input.id;
    }
    if (input.edit) {
        attrs.edit = input.edit;
    }
    if (input.phash) {
        attrs.phash = input.phash;
    }
    if (input.addressingMode) {
        attrs.addressing_mode = input.addressingMode;
    }
    if (input.peerRecipientPn) {
        attrs.peer_recipient_pn = input.peerRecipientPn;
    }
    if (input.additionalAttributes) {
        Object.assign(attrs, input.additionalAttributes);
    }
    return attrs;
}
function buildEncryptedToNode(p, mediatype, decryptFail) {
    // Status broadcast viewers without an encrypted payload get a bare `<to jid>`.
    if (!p.encType && !p.ciphertext) {
        return { tag: 'to', attrs: { jid: p.jid } };
    }
    if (!p.encType || !p.ciphertext) {
        throw new Error(`invalid encrypted participant payload for ${p.jid}`);
    }
    return {
        tag: 'to',
        attrs: { jid: p.jid },
        content: [
            {
                tag: constants_1.WA_MESSAGE_TAGS.ENC,
                attrs: buildEncAttrs(p.encType, mediatype, undefined, decryptFail),
                content: p.ciphertext
            }
        ]
    };
}
function buildEncryptedToNodes(participants, mediatype, decryptFail) {
    const nodes = new Array(participants.length);
    for (let index = 0; index < participants.length; index += 1) {
        nodes[index] = buildEncryptedToNode(participants[index], mediatype, decryptFail);
    }
    return nodes;
}
function pushOptionalNodes(content, input) {
    if (input.deviceIdentity) {
        content.push({
            tag: constants_1.WA_NODE_TAGS.DEVICE_IDENTITY,
            attrs: {},
            content: input.deviceIdentity
        });
    }
    if (input.customNodes) {
        for (const node of input.customNodes) {
            content.push(node);
        }
    }
    if (input.botParticipants && input.botParticipants.length > 0) {
        content.push({
            tag: constants_1.WA_NODE_TAGS.BOT,
            attrs: {},
            content: buildEncryptedToNodes(input.botParticipants, input.mediatype)
        });
    }
}
function buildButtonAddonNode(kind) {
    if (kind === 'list') {
        return {
            tag: constants_1.WA_NODE_TAGS.BIZ,
            attrs: {},
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.LIST,
                    attrs: { type: 'product_list', v: '2' },
                    content: undefined
                }
            ]
        };
    }
    const nativeFlowName = kind === 'payment_info' || kind === 'order_details' ? kind : 'mixed';
    const nativeFlowAttrs = nativeFlowName === 'mixed' ? { v: '9', name: 'mixed' } : { name: nativeFlowName };
    return {
        tag: constants_1.WA_NODE_TAGS.BIZ,
        attrs: {},
        content: [
            {
                tag: constants_1.WA_NODE_TAGS.INTERACTIVE,
                attrs: { type: constants_1.WA_NODE_TAGS.NATIVE_FLOW, v: '1' },
                content: [
                    {
                        tag: constants_1.WA_NODE_TAGS.NATIVE_FLOW,
                        attrs: nativeFlowAttrs,
                        content: undefined
                    }
                ]
            }
        ]
    };
}
function buildDirectMessageFanoutNode(input) {
    if (input.participants.length === 0) {
        throw new Error('direct message fanout requires at least one participant');
    }
    const attrs = buildMessageAttrs(input);
    const content = [
        {
            tag: constants_1.WA_NODE_TAGS.PARTICIPANTS,
            attrs: {},
            content: buildEncryptedToNodes(input.participants, input.mediatype, input.decryptFail)
        }
    ];
    pushOptionalNodes(content, input);
    return {
        tag: constants_1.WA_MESSAGE_TAGS.MESSAGE,
        attrs,
        content
    };
}
function buildGroupSenderKeyMessageNode(input) {
    const attrs = buildMessageAttrs(input);
    const content = [];
    if (input.participants.length > 0) {
        content.push({
            tag: constants_1.WA_NODE_TAGS.PARTICIPANTS,
            attrs: {},
            content: buildEncryptedToNodes(input.participants, input.mediatype, input.decryptFail)
        });
    }
    content.push({
        tag: constants_1.WA_MESSAGE_TAGS.ENC,
        attrs: buildEncAttrs('skmsg', input.mediatype, undefined, input.decryptFail),
        content: input.groupCiphertext
    });
    pushOptionalNodes(content, input);
    return {
        tag: constants_1.WA_MESSAGE_TAGS.MESSAGE,
        attrs,
        content
    };
}
function buildGroupRetryMessageNode(input) {
    const content = [];
    if (input.metaNode) {
        content.push(input.metaNode);
    }
    content.push({
        tag: constants_1.WA_MESSAGE_TAGS.ENC,
        attrs: buildEncAttrs(input.encType, input.mediatype, input.retryCount, input.decryptFail),
        content: input.ciphertext
    });
    if (input.deviceIdentity) {
        content.push({
            tag: constants_1.WA_NODE_TAGS.DEVICE_IDENTITY,
            attrs: {},
            content: input.deviceIdentity
        });
    }
    const attrs = {
        to: input.to,
        type: input.type,
        id: input.id,
        participant: input.requesterJid
    };
    if (input.addressingMode) {
        attrs.addressing_mode = input.addressingMode;
    }
    return {
        tag: constants_1.WA_MESSAGE_TAGS.MESSAGE,
        attrs,
        content
    };
}
function buildMetaNode(attrs) {
    return {
        tag: 'meta',
        attrs,
        content: undefined
    };
}
