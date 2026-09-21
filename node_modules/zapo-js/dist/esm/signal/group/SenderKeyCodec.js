import { readVersionedContent, toSerializedPubKey } from '../../crypto/index.js';
import { proto } from '../../proto.js';
import { SIGNAL_SIGNATURE_LENGTH } from '../api/constants.js';
import { SIGNAL_GROUP_VERSION } from '../constants.js';
import { assertByteLength } from '../../util/bytes.js';
export function parseDistributionPayload(payload) {
    const body = readVersionedContent(payload, SIGNAL_GROUP_VERSION, 0);
    const decoded = proto.SenderKeyDistributionMessage.decode(body);
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
    assertByteLength(decoded.chainKey, 32, 'sender key distribution chainKey must be 32 bytes');
    return {
        keyId: decoded.id,
        iteration: decoded.iteration,
        chainKey: decoded.chainKey,
        signingPublicKey: toSerializedPubKey(decoded.signingKey)
    };
}
export function parseSenderKeyMessage(versionContentMac) {
    const body = readVersionedContent(versionContentMac, SIGNAL_GROUP_VERSION, SIGNAL_SIGNATURE_LENGTH);
    const decoded = proto.SenderKeyMessage.decode(body);
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
