"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDistributionPayload = parseDistributionPayload;
exports.parseSenderKeyMessage = parseSenderKeyMessage;
const _crypto_1 = require("../../crypto");
const _proto_1 = require("../../proto");
const constants_1 = require("../api/constants");
const constants_2 = require("../constants");
const bytes_1 = require("../../util/bytes");
function parseDistributionPayload(payload) {
    const body = (0, _crypto_1.readVersionedContent)(payload, constants_2.SIGNAL_GROUP_VERSION, 0);
    const decoded = _proto_1.proto.SenderKeyDistributionMessage.decode(body);
    if (decoded.id === null ||
        decoded.id === undefined ||
        decoded.iteration === null ||
        decoded.iteration === undefined ||
        decoded.chainKey === null ||
        decoded.chainKey === undefined ||
        decoded.signingKey === null ||
        decoded.signingKey === undefined) {
        throw new Error('invalid sender key distribution message');
    }
    (0, bytes_1.assertByteLength)(decoded.chainKey, 32, 'sender key distribution chainKey must be 32 bytes');
    return {
        keyId: decoded.id,
        iteration: decoded.iteration,
        chainKey: decoded.chainKey,
        signingPublicKey: (0, _crypto_1.toSerializedPubKey)(decoded.signingKey)
    };
}
function parseSenderKeyMessage(versionContentMac) {
    const body = (0, _crypto_1.readVersionedContent)(versionContentMac, constants_2.SIGNAL_GROUP_VERSION, constants_1.SIGNAL_SIGNATURE_LENGTH);
    const decoded = _proto_1.proto.SenderKeyMessage.decode(body);
    if (decoded.id === null ||
        decoded.id === undefined ||
        decoded.iteration === null ||
        decoded.iteration === undefined ||
        decoded.ciphertext === null ||
        decoded.ciphertext === undefined) {
        throw new Error('invalid sender key message');
    }
    return {
        keyId: decoded.id,
        iteration: decoded.iteration,
        ciphertext: decoded.ciphertext,
        versionContentMac
    };
}
