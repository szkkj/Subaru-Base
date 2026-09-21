"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X25519 = void 0;
exports.clampCurvePrivateKeyInPlace = clampCurvePrivateKeyInPlace;
exports.montgomeryToEdwardsPublic = montgomeryToEdwardsPublic;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const generateKeyPairAsync = (0, node_util_1.promisify)(node_crypto_1.generateKeyPair);
const constants_1 = require("../curves/constants");
const types_1 = require("../curves/types");
const constants_2 = require("../math/constants");
const fe_1 = require("../math/fe");
const nativeBackend_1 = require("../nativeBackend");
const bytes_1 = require("../../util/bytes");
const nativeX25519ScalarMult = (() => {
    if (process.env.ZAPO_X25519_FORCE_JS)
        return null;
    const mod = (0, nativeBackend_1.resolveNativeCryptoBackend)();
    if (mod && typeof mod.x25519ScalarMult === 'function') {
        return mod.x25519ScalarMult;
    }
    return null;
})();
const diffieHellmanWithCallback = node_crypto_1.diffieHellman;
let diffieHellmanAsync = null;
let diffieHellmanAsyncProbed = false;
function resolveDiffieHellmanAsync() {
    if (diffieHellmanAsyncProbed)
        return diffieHellmanAsync;
    diffieHellmanAsyncProbed = true;
    try {
        const probe = (0, node_crypto_1.generateKeyPairSync)('x25519');
        const result = node_crypto_1.diffieHellman({ privateKey: probe.privateKey, publicKey: probe.publicKey }, () => { });
        if (result === undefined) {
            diffieHellmanAsync = (0, node_util_1.promisify)(diffieHellmanWithCallback);
        }
    }
    catch {
        // callback form not supported by this runtime; stay on sync path
    }
    return diffieHellmanAsync;
}
// Pre-allocated temps for montgomeryToEdwardsPublic (safe: single-threaded)
const _mx = (0, fe_1.fe)();
const _m1 = (0, fe_1.fe)();
const _m2 = (0, fe_1.fe)();
const _m3 = (0, fe_1.fe)();
// p-1 = 2^255-20 in LE bytes: 0xEC, 0xFF×30, 0x7F
// Mask bit 255 before comparing (non-canonical inputs may have it set)
function isFieldPMinus1(b) {
    if (b[0] !== 0xec || (b[31] & 0x7f) !== 0x7f)
        return false;
    for (let i = 1; i < 31; i++)
        if (b[i] !== 0xff)
            return false;
    return true;
}
/**
 * Applies the standard curve25519 scalar clamping in place and returns the
 * same buffer for chaining. Throws on non-32-byte inputs.
 */
function clampCurvePrivateKeyInPlace(privateKey) {
    (0, bytes_1.assertByteLength)(privateKey, 32, `invalid curve25519 private key length ${privateKey.length}`);
    privateKey[0] &= 248;
    privateKey[31] &= 127;
    privateKey[31] |= 64;
    return privateKey;
}
/**
 * Converts a 32-byte Montgomery (curve25519) public key to its Edwards form
 * for XEdDSA verification, applying the supplied `signBit` (`0x80` mask).
 * Throws on the field-`p-1` low-order point.
 */
function montgomeryToEdwardsPublic(curvePublicKey, signBit) {
    (0, bytes_1.assertByteLength)(curvePublicKey, 32, `invalid curve25519 public key length ${curvePublicKey.length}`);
    if (isFieldPMinus1(curvePublicKey)) {
        throw new Error('invalid curve25519 low-order public key');
    }
    (0, fe_1.feFromBytes)(_mx, curvePublicKey);
    (0, fe_1.feSub)(_m1, _mx, constants_2.FE_ONE);
    (0, fe_1.feAdd)(_m2, _mx, constants_2.FE_ONE);
    (0, fe_1.feInv)(_m3, _m2);
    (0, fe_1.feMul)(_m1, _m1, _m3);
    const encoded = new Uint8Array(32);
    (0, fe_1.fePack)(encoded, _m1);
    encoded[31] = (encoded[31] & 0x7f) | (signBit & 0x80);
    return encoded;
}
const privateKeyObjectCache = new WeakMap();
const publicKeyObjectCache = new WeakMap();
function x25519PrivateKeyObject(privKey) {
    const cached = privateKeyObjectCache.get(privKey);
    if (cached) {
        return cached;
    }
    const keyObject = (0, node_crypto_1.createPrivateKey)({
        key: (0, types_1.pkcs8FromRawPrivate)(constants_1.X25519_PKCS8_PREFIX, privKey),
        format: 'der',
        type: 'pkcs8'
    });
    privateKeyObjectCache.set(privKey, keyObject);
    return keyObject;
}
function x25519PublicKeyObject(pubKey) {
    const cached = publicKeyObjectCache.get(pubKey);
    if (cached) {
        return cached;
    }
    const keyObject = (0, node_crypto_1.createPublicKey)({
        key: (0, bytes_1.concatBytes)([constants_1.X25519_SPKI_PREFIX, pubKey]),
        format: 'der',
        type: 'spki'
    });
    publicKeyObjectCache.set(pubKey, keyObject);
    return keyObject;
}
/**
 * X25519 key-pair generation and Diffie-Hellman scalar multiplication
 * backed by Node's native primitives.
 */
class X25519 {
    /** Generates a fresh X25519 key pair. */
    static async generateKeyPair() {
        const { privateKey } = await generateKeyPairAsync('x25519');
        const jwk = privateKey.export({ format: 'jwk' });
        return {
            pubKey: (0, bytes_1.decodeBase64Url)(jwk.x, 'x25519 public key'),
            privKey: (0, bytes_1.decodeBase64Url)(jwk.d, 'x25519 private key')
        };
    }
    /** Derives the matching public key from a 32-byte X25519 private key. */
    static keyPairFromPrivateKey(privKey) {
        (0, bytes_1.assertByteLength)(privKey, 32, 'x25519 private key must be 32 bytes');
        const jwk = x25519PrivateKeyObject(privKey).export({ format: 'jwk' });
        return {
            pubKey: (0, bytes_1.decodeBase64Url)(jwk.x, 'x25519 public key'),
            privKey
        };
    }
    /**
     * Computes the X25519 shared secret between `privKey` and `pubKey`.
     * Uses Node's async DH path when supported, otherwise falls back to sync.
     */
    static async scalarMult(privKey, pubKey) {
        (0, bytes_1.assertByteLength)(privKey, 32, 'x25519 private key must be 32 bytes');
        (0, bytes_1.assertByteLength)(pubKey, 32, 'x25519 public key must be 32 bytes');
        if (nativeX25519ScalarMult) {
            return (0, bytes_1.toBytesView)(nativeX25519ScalarMult(privKey, pubKey));
        }
        const opts = {
            privateKey: x25519PrivateKeyObject(privKey),
            publicKey: x25519PublicKeyObject(pubKey)
        };
        const dhAsync = resolveDiffieHellmanAsync();
        if (dhAsync) {
            return (0, bytes_1.toBytesView)(await dhAsync(opts));
        }
        return (0, bytes_1.toBytesView)((0, node_crypto_1.diffieHellman)(opts));
    }
}
exports.X25519 = X25519;
