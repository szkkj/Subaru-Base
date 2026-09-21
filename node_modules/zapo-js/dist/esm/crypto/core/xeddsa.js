import { sha512 } from '../core/primitives.js';
import { randomBytesAsync } from '../core/random.js';
import { Ed25519 } from '../curves/Ed25519.js';
import { clampCurvePrivateKeyInPlace, montgomeryToEdwardsPublic } from '../curves/X25519.js';
import { encodeExtendedPoint, scalarMultBase } from '../math/edwards.js';
import { bigIntToBytesLE, bytesToBigIntLE } from '../math/le.js';
import { modGroup } from '../math/mod.js';
import { resolveNativeCryptoBackend } from '../nativeBackend.js';
import { assertByteLength, concatBytes, toBytesView } from '../../util/bytes.js';
const PREFIX_SIGNATURE_RANDOM = new Uint8Array([
    0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
]);
const nativeBinding = (() => {
    if (process.env.ZAPO_XEDDSA_FORCE_JS)
        return null;
    const mod = resolveNativeCryptoBackend();
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
export async function xeddsaVerify(curvePublicKey, message, signature) {
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
    const edPublic = montgomeryToEdwardsPublic(curvePublicKey, signBit);
    try {
        return await Ed25519.verify(message, signature, edPublic);
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
    const clampedPrivateKey = clampCurvePrivateKeyInPlace(privateKey);
    const privateScalar = bytesToBigIntLE(clampedPrivateKey);
    const encodedPublic = encodeExtendedPoint(scalarMultBase(privateScalar));
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
export async function xeddsaSign(privateKey, message) {
    assertByteLength(privateKey, 32, `invalid curve25519 private key length ${privateKey.length}`);
    if (nativeBinding) {
        return toBytesView(nativeBinding.xeddsaSign(privateKey, message));
    }
    const { privateScalar, encodedPublic, pubKeySignBit } = derivePublicForSigning(privateKey);
    const clampedPrivateKey = privateKey;
    const randomSuffix = await randomBytesAsync(64);
    const r = modGroup(bytesToBigIntLE(sha512([PREFIX_SIGNATURE_RANDOM, clampedPrivateKey, message, randomSuffix])));
    const encodedR = encodeExtendedPoint(scalarMultBase(r));
    const h = modGroup(bytesToBigIntLE(sha512([encodedR, encodedPublic, message])));
    const s = modGroup(r + h * privateScalar);
    const encodedS = bigIntToBytesLE(s, 32);
    encodedS[31] = (encodedS[31] & 0x7f) | pubKeySignBit;
    return concatBytes([encodedR, encodedS]);
}
