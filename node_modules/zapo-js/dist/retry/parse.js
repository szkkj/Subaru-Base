"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRetryReceiptRequest = parseRetryReceiptRequest;
exports.pickRetryStateMax = pickRetryStateMax;
const constants_1 = require("../protocol/constants");
const jid_1 = require("../protocol/jid");
const codec_1 = require("../signal/api/codec");
const constants_2 = require("../signal/api/constants");
const helpers_1 = require("../transport/node/helpers");
const primitives_1 = require("../util/primitives");
const RETRY_STATE_RANK = {
    pending: 0,
    delivered: 1,
    read: 2,
    played: 3,
    ineligible: 4
};
function requireNode(node, message) {
    if (!node) {
        throw new Error(message);
    }
    return node;
}
function validateRetryReceiptToAttr(to, expectedToJids) {
    if (!to || !expectedToJids || expectedToJids.length === 0) {
        return;
    }
    let normalizedTo;
    try {
        normalizedTo = (0, jid_1.normalizeDeviceJid)(to);
    }
    catch {
        throw new Error('retry receipt has invalid to attr');
    }
    for (let index = 0; index < expectedToJids.length; index += 1) {
        const expected = expectedToJids[index]?.trim();
        if (!expected)
            continue;
        try {
            if ((0, jid_1.normalizeDeviceJid)(expected) === normalizedTo) {
                return;
            }
        }
        catch {
            continue;
        }
    }
    throw new Error('retry receipt to attr does not match local device');
}
function parseRetryKeyBundle(node) {
    if (!node) {
        return undefined;
    }
    const parsed = (0, codec_1.parseSignalKeyBundleFromNode)(node, 'retry.keys');
    return {
        identity: parsed.identity,
        ...(parsed.deviceIdentity ? { deviceIdentity: parsed.deviceIdentity } : {}),
        ...(parsed.oneTimeKey ? { key: parsed.oneTimeKey } : {}),
        skey: parsed.signedKey
    };
}
/**
 * Parses an incoming `receipt` stanza into a {@link WaParsedRetryRequest}.
 * Returns `null` when the stanza is not a retry/rekey-retry receipt; throws
 * when required attrs/children are missing.
 */
function parseRetryReceiptRequest(node, options) {
    if (node.tag !== constants_1.WA_MESSAGE_TAGS.RECEIPT) {
        return null;
    }
    const receiptType = node.attrs.type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY ||
        node.attrs.type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY
        ? node.attrs.type
        : null;
    if (!receiptType) {
        return null;
    }
    const stanzaId = node.attrs.id;
    const from = node.attrs.from;
    if (!stanzaId || !from) {
        throw new Error('retry receipt is missing id/from attrs');
    }
    validateRetryReceiptToAttr(node.attrs.to, options?.expectedToJids);
    const [retryNode, registrationNode, keysNode] = (0, helpers_1.findNodeChildrenByTags)(node, [
        'retry',
        constants_1.WA_NODE_TAGS.REGISTRATION,
        'keys'
    ]);
    const retry = requireNode(retryNode, 'retry receipt is missing retry child');
    const registrationNodeValue = requireNode(registrationNode, 'retry receipt is missing registration child');
    const originalMsgId = retry.attrs.id;
    if (!originalMsgId) {
        throw new Error('retry receipt is missing retry.id');
    }
    const registration = (0, codec_1.decodeExactLength)(registrationNodeValue.content, 'retry.registration', constants_2.SIGNAL_REGISTRATION_ID_LENGTH);
    return {
        type: receiptType,
        stanzaId,
        from,
        participant: node.attrs.participant,
        recipient: node.attrs.recipient,
        offline: node.attrs.offline !== undefined,
        isLid: node.attrs.is_lid === 'true',
        originalMsgId,
        retryCount: (0, primitives_1.parseOptionalInt)(retry.attrs.count) ?? 0,
        retryReason: (0, primitives_1.parseOptionalInt)(retry.attrs.error ?? node.attrs.error),
        t: retry.attrs.t ?? node.attrs.t,
        regId: (0, codec_1.parseUint)(registration, 'retry.registration'),
        keyBundle: parseRetryKeyBundle(keysNode)
    };
}
/**
 * Returns whichever of `left`/`right` represents the more advanced retry
 * state (according to the internal precedence rank).
 */
function pickRetryStateMax(left, right) {
    return RETRY_STATE_RANK[left] >= RETRY_STATE_RANK[right] ? left : right;
}
