import { xeddsaVerify } from '../../crypto/index.js';
import { proto } from '../../proto.js';
import { ROOT_CA_PUBLIC_KEY_HEX, ROOT_CA_SERIAL } from '../noise/constants.js';
import { assertByteLength, decodeProtoBytes, hexToBytes, uint8Equal } from '../../util/bytes.js';
import { toSafeNumber } from '../../util/primitives.js';
const PRODUCTION_ROOT_CA = {
    publicKey: hexToBytes(ROOT_CA_PUBLIC_KEY_HEX),
    serial: ROOT_CA_SERIAL
};
function parseNoiseCertificate(certificate) {
    if (!certificate) {
        throw new Error('missing noise certificate');
    }
    const detailsBytes = decodeProtoBytes(certificate.details, 'certificate.details');
    const signatureBytes = decodeProtoBytes(certificate.signature, 'certificate.signature');
    assertByteLength(signatureBytes, 64, 'invalid certificate signature size');
    const details = proto.CertChain.NoiseCertificate.Details.decode(detailsBytes);
    const serial = toSafeNumber(details.serial, 'certificate.serial');
    const issuerSerial = toSafeNumber(details.issuerSerial, 'certificate.issuerSerial');
    const key = decodeProtoBytes(details.key, 'certificate.key');
    return {
        serial,
        issuerSerial,
        key,
        details: detailsBytes,
        signature: signatureBytes
    };
}
/**
 * Validates a WhatsApp noise certificate chain against `rootCa` (defaults to
 * the production root) and confirms the leaf binds `serverStatic`. Throws on
 * any structural mismatch, bad signature, or unexpected issuer serial.
 */
export async function verifyNoiseCertificateChain(certificateChain, serverStatic, rootCa = PRODUCTION_ROOT_CA) {
    const chain = proto.CertChain.decode(certificateChain);
    if (!chain.leaf || !chain.intermediate) {
        throw new Error('noise certificate chain is missing leaf/intermediate');
    }
    const intermediate = parseNoiseCertificate(chain.intermediate);
    if (intermediate.issuerSerial !== rootCa.serial) {
        throw new Error('intermediate certificate issuer mismatch');
    }
    const validIntermediate = await xeddsaVerify(rootCa.publicKey, intermediate.details, intermediate.signature);
    if (!validIntermediate) {
        throw new Error('intermediate certificate signature is invalid');
    }
    const leaf = parseNoiseCertificate(chain.leaf);
    if (leaf.issuerSerial !== intermediate.serial) {
        throw new Error('leaf certificate issuer mismatch');
    }
    const validLeaf = await xeddsaVerify(intermediate.key, leaf.details, leaf.signature);
    if (!validLeaf) {
        throw new Error('leaf certificate signature is invalid');
    }
    if (!uint8Equal(leaf.key, serverStatic)) {
        throw new Error('leaf certificate key mismatch with server static key');
    }
}
