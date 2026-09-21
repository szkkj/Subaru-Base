"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAckOrReceiptNode = isAckOrReceiptNode;
exports.isNegativeAckNode = isNegativeAckNode;
exports.isRetryableNegativeAck = isRetryableNegativeAck;
exports.describeAckNode = describeAckNode;
const constants_1 = require("../../protocol/constants");
function isAckOrReceiptNode(node) {
    return node.tag === constants_1.WA_MESSAGE_TAGS.ACK || node.tag === constants_1.WA_MESSAGE_TAGS.RECEIPT;
}
function isNegativeAckNode(node) {
    if (node.tag === constants_1.WA_MESSAGE_TAGS.ERROR) {
        return true;
    }
    if (node.tag !== constants_1.WA_MESSAGE_TAGS.ACK) {
        return false;
    }
    if (node.attrs.error) {
        return true;
    }
    const ackType = node.attrs.type;
    const ackClass = node.attrs.class;
    return (ackType === constants_1.WA_MESSAGE_TYPES.ACK_TYPE_ERROR || ackClass === constants_1.WA_MESSAGE_TYPES.ACK_CLASS_ERROR);
}
function isRetryableNegativeAck(node) {
    const code = node.attrs.code;
    if (code && constants_1.WA_RETRYABLE_ACK_CODES.includes(code)) {
        return true;
    }
    const ackType = node.attrs.type;
    if (ackType && (ackType === 'wait' || ackType === 'retry' || ackType === 'timeout')) {
        return true;
    }
    return false;
}
function describeAckNode(node) {
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
