import { WA_DEFAULTS, WA_IQ_TYPES, WA_MESSAGE_TAGS, WA_MESSAGE_TYPES, WA_NODE_TAGS } from '../../../protocol/index.js';
import { isGroupOrBroadcastJid } from '../../../protocol/jid.js';
function buildListItemsNode(ids) {
    if (ids.length < 2) {
        return null;
    }
    const items = new Array(ids.length - 1);
    for (let i = 1; i < ids.length; i += 1) {
        items[i - 1] = {
            tag: 'item',
            attrs: { id: ids[i] }
        };
    }
    return {
        tag: WA_NODE_TAGS.LIST,
        attrs: {},
        content: items
    };
}
function normalizeNackClass(stanzaTag) {
    if (stanzaTag === WA_MESSAGE_TAGS.MESSAGE) {
        return WA_MESSAGE_TYPES.ACK_CLASS_MESSAGE;
    }
    if (stanzaTag === WA_MESSAGE_TAGS.RECEIPT) {
        return 'receipt';
    }
    if (stanzaTag === WA_NODE_TAGS.NOTIFICATION) {
        return WA_NODE_TAGS.NOTIFICATION;
    }
    return stanzaTag;
}
export function buildAckNode(input) {
    if (input.kind === 'notification') {
        const attrs = {
            to: input.node.attrs.from ?? WA_DEFAULTS.HOST_DOMAIN,
            class: WA_NODE_TAGS.NOTIFICATION
        };
        const includeType = input.includeType ?? true;
        if (includeType) {
            attrs.type = input.typeOverride ?? input.node.attrs.type ?? WA_NODE_TAGS.NOTIFICATION;
        }
        if (input.node.attrs.id) {
            attrs.id = input.node.attrs.id;
        }
        if (input.includeParticipant && input.node.attrs.participant) {
            attrs.participant = input.node.attrs.participant;
        }
        return {
            tag: WA_MESSAGE_TAGS.ACK,
            attrs,
            content: input.content
        };
    }
    if (input.kind === 'message') {
        const attrs = {
            id: input.id,
            to: input.to,
            class: WA_MESSAGE_TYPES.ACK_CLASS_MESSAGE
        };
        if (input.error !== undefined) {
            attrs.error = String(input.error);
        }
        const type = input.typeOverride ?? input.node.attrs.type;
        if (type) {
            attrs.type = type;
        }
        const participant = input.participant ?? input.node.attrs.participant;
        if (participant) {
            attrs.participant = participant;
        }
        if (input.recipient) {
            attrs.recipient = input.recipient;
        }
        if (input.from) {
            attrs.from = input.from;
        }
        return {
            tag: WA_MESSAGE_TAGS.ACK,
            attrs
        };
    }
    if (input.kind === 'aggregate_message') {
        if (input.ids.length === 0) {
            throw new Error('aggregate message ack requires at least one id');
        }
        const attrs = {
            id: input.ids[0],
            to: input.to,
            class: WA_MESSAGE_TYPES.ACK_CLASS_MESSAGE,
            type: input.type ?? 'text'
        };
        if (input.recipient) {
            attrs.recipient = input.recipient;
        }
        if (input.participant) {
            attrs.participant = input.participant;
        }
        const listNode = buildListItemsNode(input.ids);
        return {
            tag: WA_MESSAGE_TAGS.ACK,
            attrs,
            content: listNode ? [listNode] : undefined
        };
    }
    if (input.kind === 'nack') {
        const attrs = {
            id: input.id,
            to: input.to,
            class: normalizeNackClass(input.stanzaTag),
            error: String(input.error)
        };
        if (input.type) {
            attrs.type = input.type;
        }
        if (input.participant) {
            attrs.participant = input.participant;
        }
        const content = input.failureReason === undefined
            ? undefined
            : [
                {
                    tag: 'meta',
                    attrs: {
                        failure_reason: String(input.failureReason)
                    }
                }
            ];
        return {
            tag: WA_MESSAGE_TAGS.ACK,
            attrs,
            content
        };
    }
    if (input.kind === 'custom') {
        const attrs = {
            class: input.ackClass,
            to: input.to
        };
        if (input.id) {
            attrs.id = input.id;
        }
        if (input.type) {
            attrs.type = input.type;
        }
        if (input.participant) {
            attrs.participant = input.participant;
        }
        if (input.recipient) {
            attrs.recipient = input.recipient;
        }
        if (input.from) {
            attrs.from = input.from;
        }
        if (input.error !== undefined) {
            attrs.error = String(input.error);
        }
        return {
            tag: WA_MESSAGE_TAGS.ACK,
            attrs,
            content: input.content
        };
    }
    const attrs = {
        class: WA_MESSAGE_TAGS.RECEIPT
    };
    if (input.retryType) {
        attrs.type = input.typeOverride ?? WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY;
    }
    else if (input.node.attrs.type) {
        attrs.type = input.node.attrs.type;
    }
    if (input.node.attrs.id) {
        attrs.id = input.node.attrs.id;
    }
    if (input.node.attrs.from) {
        attrs.to = input.node.attrs.from;
    }
    if (input.retryType) {
        if (input.node.attrs.participant) {
            attrs.participant = input.node.attrs.participant;
        }
    }
    else if ((input.includeParticipant ?? true) &&
        input.node.attrs.participant &&
        (!input.node.attrs.from || input.node.attrs.participant !== input.node.attrs.from)) {
        attrs.participant = input.node.attrs.participant;
    }
    if (input.includeRecipient && input.node.attrs.recipient) {
        attrs.recipient = input.node.attrs.recipient;
    }
    return {
        tag: WA_MESSAGE_TAGS.ACK,
        attrs
    };
}
export function buildReceiptNode(input) {
    if (input.kind === 'delivery') {
        const attrs = {
            id: input.id,
            to: input.to
        };
        if (input.node.attrs.participant && isGroupOrBroadcastJid(input.to)) {
            attrs.participant = input.node.attrs.participant;
        }
        if (input.node.attrs.category === 'peer') {
            attrs.type = WA_MESSAGE_TYPES.RECEIPT_TYPE_PEER;
        }
        return {
            tag: WA_MESSAGE_TAGS.RECEIPT,
            attrs
        };
    }
    if (input.kind === 'outbound') {
        const attrs = {
            id: input.id,
            to: input.to
        };
        if (input.type) {
            attrs.type = input.type;
        }
        if (input.participant) {
            attrs.participant = input.participant;
        }
        if (input.recipient) {
            attrs.recipient = input.recipient;
        }
        if (input.category) {
            attrs.category = input.category;
        }
        if (input.from) {
            attrs.from = input.from;
        }
        if (input.t) {
            attrs.t = input.t;
        }
        if (input.peerParticipantPn) {
            attrs.peer_participant_pn = input.peerParticipantPn;
        }
        const content = input.content ? [...input.content] : [];
        const listNode = input.listIds ? buildListItemsNode(input.listIds) : null;
        if (listNode) {
            content.push(listNode);
        }
        return {
            tag: WA_MESSAGE_TAGS.RECEIPT,
            attrs,
            content: content.length > 0 ? content : undefined
        };
    }
    if (input.kind === 'retry_custom') {
        const attrs = {
            id: input.id,
            to: input.to,
            type: WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY
        };
        if (input.participant) {
            attrs.participant = input.participant;
        }
        if (input.recipient) {
            attrs.recipient = input.recipient;
        }
        if (input.categoryPeer) {
            attrs.category = 'peer';
        }
        return {
            tag: WA_MESSAGE_TAGS.RECEIPT,
            attrs,
            content: input.content
        };
    }
    if (input.kind === 'server_error') {
        const attrs = {
            id: input.id,
            to: input.to,
            type: WA_MESSAGE_TYPES.RECEIPT_TYPE_SERVER_ERROR
        };
        if (input.categoryPeer) {
            attrs.category = 'peer';
        }
        const content = [
            {
                tag: 'encrypt',
                attrs: {},
                content: [
                    {
                        tag: 'enc_p',
                        attrs: {},
                        content: input.encryptCiphertext
                    },
                    {
                        tag: 'enc_iv',
                        attrs: {},
                        content: input.encryptIv
                    }
                ]
            }
        ];
        if (input.rmrJid || input.rmrFromMe !== undefined || input.rmrParticipant) {
            const rmrAttrs = {};
            if (input.rmrJid) {
                rmrAttrs.jid = input.rmrJid;
            }
            if (input.rmrFromMe !== undefined) {
                rmrAttrs.from_me = String(input.rmrFromMe);
            }
            if (input.rmrParticipant) {
                rmrAttrs.participant = input.rmrParticipant;
            }
            content.push({
                tag: 'rmr',
                attrs: rmrAttrs
            });
        }
        return {
            tag: WA_MESSAGE_TAGS.RECEIPT,
            attrs,
            content
        };
    }
    if (input.kind === 'custom') {
        return {
            tag: WA_MESSAGE_TAGS.RECEIPT,
            attrs: {
                ...input.attrs
            },
            content: input.content
        };
    }
    const attrs = {
        id: input.id,
        to: input.to,
        type: WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY
    };
    if (input.node.attrs.category === 'peer') {
        attrs.category = 'peer';
    }
    if (input.node.attrs.recipient && input.node.attrs.category !== 'peer') {
        attrs.recipient = input.node.attrs.recipient;
    }
    if (input.node.attrs.participant && isGroupOrBroadcastJid(input.to)) {
        attrs.participant = input.node.attrs.participant;
    }
    const retryCount = input.retryCount ?? 1;
    const normalizedRetryCount = Number.isSafeInteger(retryCount) && retryCount > 0 ? retryCount : 1;
    const retryAttrs = {
        count: String(normalizedRetryCount),
        id: input.id
    };
    const timestamp = input.node.attrs.t;
    if (timestamp) {
        retryAttrs.t = timestamp;
    }
    return {
        tag: WA_MESSAGE_TAGS.RECEIPT,
        attrs,
        content: [
            {
                tag: 'retry',
                attrs: retryAttrs
            }
        ]
    };
}
export function buildIqResultNode(iqNode) {
    return {
        tag: WA_NODE_TAGS.IQ,
        attrs: {
            ...(iqNode.attrs.id ? { id: iqNode.attrs.id } : {}),
            to: iqNode.attrs.from ?? WA_DEFAULTS.HOST_DOMAIN,
            type: WA_IQ_TYPES.RESULT
        }
    };
}
/**
 * Error counterpart of {@link buildIqResultNode}: answers a server IQ with
 * `<iq type="error"><error code text/></iq>`, echoing the request id.
 */
export function buildIqErrorNode(iqNode, error) {
    return {
        tag: WA_NODE_TAGS.IQ,
        attrs: {
            ...(iqNode.attrs.id ? { id: iqNode.attrs.id } : {}),
            to: iqNode.attrs.from ?? WA_DEFAULTS.HOST_DOMAIN,
            type: WA_IQ_TYPES.ERROR
        },
        content: [
            {
                tag: WA_NODE_TAGS.ERROR,
                attrs: { code: String(error.code), text: error.text }
            }
        ]
    };
}
