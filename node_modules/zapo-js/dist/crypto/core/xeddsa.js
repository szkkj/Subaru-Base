"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xeddsaVerify = xeddsaVerify;
exports.xeddsaSign = xeddsaSign;
const primitives_1 = require("../core/primitives");
const random_1 = require("../core/random");
const Ed25519_1 = require("../curves/Ed25519");
const X25519_1 = require("../curves/X25519");
const edwards_1 = require("../math/edwards");
const le_1 = require("../math/le");
const mod_1 = require("../math/mod");
const nativeBackend_1 = require("../nativeBackend");
const bytes_1 = require("../../util/bytes");
const PREFIX_SIGNATURE_RANDOM = new Uint8Array([
    0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
]);
const nativeBinding = (() => {
    if (process.env.ZAPO_XEDDSA_FORCE_JS)
        return null;
    const mod = (0, nativeBackend_1.resolveNativeCryptoBackend)();
    if (mod && typeof mod.xeddsaSign === 'function' && typeof mod.xeddsaVerify === 'function') {
        return { xeddsaSign: mod.xeddsaSign, xeddsaVerify: mod.xeddsaVerify };
    }
    return null;
})();
/**
 * Verifies an XEdDSA signature over `message` against an X25519 (Montgomery)
 * public key, converting to the Edwards form internally. Returns `false`
 * on shape mismatch instead of throwing.
 */
async function xeddsaVerify(curvePublicKey, message, signature) {
    if (nativeBinding) {
        return nativeBinding.xeddsaVerify(curvePublicKey, message, signature);
    }
    if (signature.length !== 64) {
        return false;
    }
    if ((signature[63] & 0x60) !== 0) {
        return false;
    }
    const lastByteIndex = 63;
    const originalLastByte = signature[lastByteIndex];
    const signBit = originalLastByte & 0x80;
    signature[lastByteIndex] = originalLastByte & 0x7f;
    const edPublic = (0, X25519_1.montgomeryToEdwardsPublic)(curvePublicKey, signBit);
    try {
        return await Ed25519_1.Ed25519.verify(message, signature, edPublic);
    }
    finally {
        signature[lastByteIndex] = originalLastByte;
    }
}
const publicDerivationCache = new WeakMap();
function derivePublicForSigning(privateKey) {
    const cached = publicDerivationCache.get(privateKey);
    if (cached) {
        return cached;
    }
    const clampedPrivateKey = (0, X25519_1.clampCurvePrivateKeyInPlace)(privateKey);
    const privateScalar = (0, le_1.bytesToBigIntLE)(clampedPrivateKey);
    const encodedPublic = (0, edwards_1.encodeExtendedPoint)((0, edwards_1.scalarMultBase)(privateScalar));
    const derivation = {
        privateScalar,
        encodedPublic,
        pubKeySignBit: encodedPublic[31] & 0x80
    };
    publicDerivationCache.set(privateKey, derivation);
    return derivation;
}
/**
 * Signs `message` with an X25519 (Montgomery) private key using the XEdDSA
 * construction. Returns a 64-byte signature.
 */
async function xeddsaSign(privateKey, message) {
    (0, bytes_1.assertByteLength)(privateKey, 32, `invalid curve25519 private key length ${privateKey.length}`);
    if (nativeBinding) {
        return (0, bytes_1.toBytesView)(nativeBinding.xeddsaSign(privateKey, message));
    }
    const { privateScalar, encodedPublic, pubKeySignBit } = derivePublicForSigning(privateKey);
    const clampedPrivateKey = privateKey;
    const randomSuffix = await (0, random_1.randomBytesAsync)(64);
    const r = (0, mod_1.modGroup)((0, le_1.bytesToBigIntLE)((0, primitives_1.sha512)([PREFIX_SIGNATURE_RANDOM, clampedPrivateKey, message, randomSuffix])));
    const encodedR = (0, edwards_1.encodeExtendedPoint)((0, edwards_1.scalarMultBase)(r));
    const h = (0, mod_1.modGroup)((0, le_1.bytesToBigIntLE)((0, primitives_1.sha512)([encodedR, encodedPublic, message])));
    const s = (0, mod_1.modGroup)(r + h * privateScalar);
    const encodedS = (0, le_1.bigIntToBytesLE)(s, 32);
    encodedS[31] = (encodedS[31] & 0x7f) | pubKeySignBit;
    return (0, bytes_1.concatBytes)([encodedR, encodedS]);
}
