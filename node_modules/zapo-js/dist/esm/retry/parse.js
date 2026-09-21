import { WA_MESSAGE_TAGS, WA_MESSAGE_TYPES, WA_NODE_TAGS } from '../protocol/constants.js';
import { normalizeDeviceJid } from '../protocol/jid.js';
import { decodeExactLength, parseSignalKeyBundleFromNode, parseUint } from '../signal/api/codec.js';
import { SIGNAL_REGISTRATION_ID_LENGTH } from '../signal/api/constants.js';
import { findNodeChildrenByTags } from '../transport/node/helpers.js';
import { parseOptionalInt } from '../util/primitives.js';
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
        normalizedTo = normalizeDeviceJid(to);
    }
    catch {
        throw new Error('retry receipt has invalid to attr');
    }
    for (let index = 0; index < expectedToJids.length; index += 1) {
        const expected = expectedToJids[index]?.trim();
        if (!expected)
            continue;
        try {
            if (normalizeDeviceJid(expected) === normalizedTo) {
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
    const parsed = parseSignalKeyBundleFromNode(node, 'retry.keys');
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
export function parseRetryReceiptRequest(node, options) {
    if (node.tag !== WA_MESSAGE_TAGS.RECEIPT) {
        return null;
    }
    const receiptType = node.attrs.type === WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY ||
        node.attrs.type === WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY
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
    const [retryNode, registrationNode, keysNode] = findNodeChildrenByTags(node, [
        'retry',
        WA_NODE_TAGS.REGISTRATION,
        'keys'
    ]);
    const retry = requireNode(retryNode, 'retry receipt is missing retry child');
    const registrationNodeValue = requireNode(registrationNode, 'retry receipt is missing registration child');
    const originalMsgId = retry.attrs.id;
    if (!originalMsgId) {
        throw new Error('retry receipt is missing retry.id');
    }
    const registration = decodeExactLength(registrationNodeValue.content, 'retry.registration', SIGNAL_REGISTRATION_ID_LENGTH);
    return {
        type: receiptType,
        stanzaId,
        from,
        participant: node.attrs.participant,
        recipient: node.attrs.recipient,
        offline: node.attrs.offline !== undefined,
        isLid: node.attrs.is_lid === 'true',
        originalMsgId,
        retryCount: parseOptionalInt(retry.attrs.count) ?? 0,
        retryReason: parseOptionalInt(retry.attrs.error ?? node.attrs.error),
        t: retry.attrs.t ?? node.attrs.t,
        regId: parseUint(registration, 'retry.registration'),
        keyBundle: parseRetryKeyBundle(keysNode)
    };
}
/**
 * Returns whichever of `left`/`right` represents the more advanced retry
 * state (according to the internal precedence rank).
 */
export function pickRetryStateMax(left, right) {
    return RETRY_STATE_RANK[left] >= RETRY_STATE_RANK[right] ? left : right;
}
