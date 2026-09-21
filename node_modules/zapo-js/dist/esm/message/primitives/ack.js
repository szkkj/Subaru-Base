import { WA_MESSAGE_TAGS, WA_MESSAGE_TYPES, WA_RETRYABLE_ACK_CODES } from '../../protocol/constants.js';
export function isAckOrReceiptNode(node) {
    return node.tag === WA_MESSAGE_TAGS.ACK || node.tag === WA_MESSAGE_TAGS.RECEIPT;
}
export function isNegativeAckNode(node) {
    if (node.tag === WA_MESSAGE_TAGS.ERROR) {
        return true;
    }
    if (node.tag !== WA_MESSAGE_TAGS.ACK) {
        return false;
    }
    if (node.attrs.error) {
        return true;
    }
    const ackType = node.attrs.type;
    const ackClass = node.attrs.class;
    return (ackType === WA_MESSAGE_TYPES.ACK_TYPE_ERROR || ackClass === WA_MESSAGE_TYPES.ACK_CLASS_ERROR);
}
export function isRetryableNegativeAck(node) {
    const code = node.attrs.code;
    if (code && WA_RETRYABLE_ACK_CODES.includes(code)) {
        return true;
    }
    const ackType = node.attrs.type;
    if (ackType && (ackType === 'wait' || ackType === 'retry' || ackType === 'timeout')) {
        return true;
    }
    return false;
}
export function describeAckNode(node) {
    let description = `tag=${node.tag}`;
    const id = node.attrs.id;
    const type = node.attrs.type;
    const ackClass = node.attrs.class;
    const code = node.attrs.code;
    const error = node.attrs.error;
    if (id) {
        description += ` id=${id}`;
    }
    if (type) {
        description += ` type=${type}`;
    }
    if (ackClass) {
        description += ` class=${ackClass}`;
    }
    if (code) {
        description += ` code=${code}`;
    }
    if (error) {
        description += ` error=${error}`;
    }
    return description;
}
