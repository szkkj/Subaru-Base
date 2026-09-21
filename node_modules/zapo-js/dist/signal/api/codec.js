"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeExactLength = decodeExactLength;
exports.parseUint = parseUint;
exports.parseSignalKeyBundleFromNode = parseSignalKeyBundleFromNode;
const constants_1 = require("../../protocol/constants");
const constants_2 = require("../api/constants");
const helpers_1 = require("../../transport/node/helpers");
function decodeExactLength(value, field, expectedLength) {
    const bytes = (0, helpers_1.decodeNodeContentBase64OrBytes)(value, field);
    if (bytes.byteLength !== expectedLength) {
        throw new Error(`${field} must be ${expectedLength} bytes`);
    }
    return bytes;
}
function parseUint(bytes, field) {
    if (bytes.byteLength === 1) {
        return bytes[0];
    }
    if (bytes.byteLength === 2) {
        return (bytes[0] << 8) | bytes[1];
    }
    if (bytes.byteLength === 3) {
        return (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
    }
    if (bytes.byteLength === 4) {
        return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
    }
    throw new Error(`${field} has invalid byte length`);
}
/**
 * Parses the shared `<identity><skey id|value|signature><key id|value><device-identity>`
 * shape used by session pre-key bundles, missing pre-key device bundles, and retry
 * receipt key bundles. Caller is responsible for parsing the `<registration>` node
 * separately when it lives at the same level (it's omitted from retry bundles).
 */
function parseSignalKeyBundleFromNode(node, fieldPrefix) {
    const [identityNode, signedKeyNode, oneTimeKeyNode, deviceIdentityNode] = (0, helpers_1.findNodeChildrenByTags)(node, [
        constants_1.WA_NODE_TAGS.IDENTITY,
        constants_1.WA_NODE_TAGS.SKEY,
        constants_1.WA_NODE_TAGS.KEY,
        constants_1.WA_NODE_TAGS.DEVICE_IDENTITY
    ]);
    if (!identityNode) {
        throw new Error(`${fieldPrefix} missing identity node`);
    }
    if (!signedKeyNode) {
        throw new Error(`${fieldPrefix} missing signed pre-key node`);
    }
    const identity = decodeExactLength(identityNode.content, `${fieldPrefix}.identity`, constants_2.SIGNAL_KEY_DATA_LENGTH);
    const [signedKeyIdNode, signedKeyValueNode, signedKeySignatureNode] = (0, helpers_1.findNodeChildrenByTags)(signedKeyNode, [constants_1.WA_NODE_TAGS.ID, constants_1.WA_NODE_TAGS.VALUE, constants_1.WA_NODE_TAGS.SIGNATURE]);
    if (!signedKeyIdNode || !signedKeyValueNode || !signedKeySignatureNode) {
        throw new Error(`${fieldPrefix} signed pre-key is incomplete`);
    }
    const signedKey = {
        id: parseUint(decodeExactLength(signedKeyIdNode.content, `${fieldPrefix}.skey.id`, constants_2.SIGNAL_KEY_ID_LENGTH), `${fieldPrefix}.skey.id`),
        publicKey: decodeExactLength(signedKeyValueNode.content, `${fieldPrefix}.skey.value`, constants_2.SIGNAL_KEY_DATA_LENGTH),
        signature: decodeExactLength(signedKeySignatureNode.content, `${fieldPrefix}.skey.signature`, constants_2.SIGNAL_SIGNATURE_LENGTH)
    };
    let oneTimeKey;
    if (oneTimeKeyNode) {
        const [oneTimeKeyIdNode, oneTimeKeyValueNode] = (0, helpers_1.findNodeChildrenByTags)(oneTimeKeyNode, [
            constants_1.WA_NODE_TAGS.ID,
            constants_1.WA_NODE_TAGS.VALUE
        ]);
        if (!oneTimeKeyIdNode || !oneTimeKeyValueNode) {
            throw new Error(`${fieldPrefix} one-time pre-key is incomplete`);
        }
        oneTimeKey = {
            id: parseUint(decodeExactLength(oneTimeKeyIdNode.content, `${fieldPrefix}.key.id`, constants_2.SIGNAL_KEY_ID_LENGTH), `${fieldPrefix}.key.id`),
            publicKey: decodeExactLength(oneTimeKeyValueNode.content, `${fieldPrefix}.key.value`, constants_2.SIGNAL_KEY_DATA_LENGTH)
        };
    }
    let deviceIdentity;
    if (deviceIdentityNode) {
        deviceIdentity = (0, helpers_1.decodeNodeContentBase64OrBytes)(deviceIdentityNode.content, `${fieldPrefix}.device-identity`);
    }
    return { identity, signedKey, oneTimeKey, deviceIdentity };
}
