"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyNoiseCertificateChain = verifyNoiseCertificateChain;
const _crypto_1 = require("../../crypto");
const _proto_1 = require("../../proto");
const constants_1 = require("../noise/constants");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
const PRODUCTION_ROOT_CA = {
    publicKey: (0, bytes_1.hexToBytes)(constants_1.ROOT_CA_PUBLIC_KEY_HEX),
    serial: constants_1.ROOT_CA_SERIAL
};
function parseNoiseCertificate(certificate) {
    if (!certificate) {
        throw new Error('missing noise certificate');
    }
    const detailsBytes = (0, bytes_1.decodeProtoBytes)(certificate.details, 'certificate.details');
    const signatureBytes = (0, bytes_1.decodeProtoBytes)(certificate.signature, 'certificate.signature');
    (0, bytes_1.assertByteLength)(signatureBytes, 64, 'invalid certificate signature size');
    const details = _proto_1.proto.CertChain.NoiseCertificate.Details.decode(detailsBytes);
    const serial = (0, primitives_1.toSafeNumber)(details.serial, 'certificate.serial');
    const issuerSerial = (0, primitives_1.toSafeNumber)(details.issuerSerial, 'certificate.issuerSerial');
    const key = (0, bytes_1.decodeProtoBytes)(details.key, 'certificate.key');
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
async function verifyNoiseCertificateChain(certificateChain, serverStatic, rootCa = PRODUCTION_ROOT_CA) {
    const chain = _proto_1.proto.CertChain.decode(certificateChain);
    if (!chain.leaf || !chain.intermediate) {
        throw new Error('noise certificate chain is missing leaf/intermediate');
    }
    const intermediate = parseNoiseCertificate(chain.intermediate);
    if (intermediate.issuerSerial !== rootCa.serial) {
        throw new Error('intermediate certificate issuer mismatch');
    }
    const validIntermediate = await (0, _crypto_1.xeddsaVerify)(rootCa.publicKey, intermediate.details, intermediate.signature);
    if (!validIntermediate) {
        throw new Error('intermediate certificate signature is invalid');
    }
    const leaf = parseNoiseCertificate(chain.leaf);
    if (leaf.issuerSerial !== intermediate.serial) {
        throw new Error('leaf certificate issuer mismatch');
    }
    const validLeaf = await (0, _crypto_1.xeddsaVerify)(intermediate.key, leaf.details, leaf.signature);
    if (!validLeaf) {
        throw new Error('leaf certificate signature is invalid');
    }
    if (!(0, bytes_1.uint8Equal)(leaf.key, serverStatic)) {
        throw new Error('leaf certificate key mismatch with server static key');
    }
}
