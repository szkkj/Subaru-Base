"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ed25519 = void 0;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const constants_1 = require("../curves/constants");
const types_1 = require("../curves/types");
const bytes_1 = require("../../util/bytes");
const generateKeyPairAsync = (0, node_util_1.promisify)(node_crypto_1.generateKeyPair);
const signAsync = (0, node_util_1.promisify)(node_crypto_1.sign);
const verifyAsync = (0, node_util_1.promisify)(node_crypto_1.verify);
function ed25519PrivateKeyObject(privKey) {
    return (0, node_crypto_1.createPrivateKey)({
        key: (0, types_1.pkcs8FromRawPrivate)(constants_1.ED25519_PKCS8_PREFIX, privKey),
        format: 'der',
        type: 'pkcs8'
    });
}
function ed25519PublicKeyObject(pubKey) {
    return (0, node_crypto_1.createPublicKey)({
        key: (0, bytes_1.concatBytes)([constants_1.ED25519_SPKI_PREFIX, pubKey]),
        format: 'der',
        type: 'spki'
    });
}
/**
 * Ed25519 sign/verify backed by Node's native primitives. All operations are
 * async to keep crypto off the event loop.
 */
class Ed25519 {
    /** Generates a fresh Ed25519 key pair. */
    static async generateKeyPair() {
        const { privateKey } = await generateKeyPairAsync('ed25519');
        const jwk = privateKey.export({ format: 'jwk' });
        return {
            pubKey: (0, bytes_1.decodeBase64Url)(jwk.x, 'ed25519 public key'),
            privKey: (0, bytes_1.decodeBase64Url)(jwk.d, 'ed25519 private key')
        };
    }
    /** Signs `message` with a 32-byte Ed25519 private key. Returns a 64-byte signature. */
    static async sign(message, privKey) {
        (0, bytes_1.assertByteLength)(privKey, 32, 'ed25519 private key must be 32 bytes');
        const sig = await signAsync(null, message, ed25519PrivateKeyObject(privKey));
        return (0, bytes_1.toBytesView)(sig);
    }
    /** Verifies an Ed25519 `signature` over `message` against a 32-byte public key. */
    static async verify(message, signature, pubKey) {
        (0, bytes_1.assertByteLength)(pubKey, 32, 'ed25519 public key must be 32 bytes');
        return verifyAsync(null, message, ed25519PublicKeyObject(pubKey), signature);
    }
}
exports.Ed25519 = Ed25519;
