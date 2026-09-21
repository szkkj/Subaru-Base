"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PBKDF2_ITERATIONS = void 0;
exports.encodeBytesToCrockford = encodeBytesToCrockford;
exports.normalizeCustomPairingCode = normalizeCustomPairingCode;
exports.createCompanionHello = createCompanionHello;
exports.completeCompanionFinish = completeCompanionFinish;
const _crypto_1 = require("../../crypto");
const X25519_1 = require("../../crypto/curves/X25519");
const constants_1 = require("../../protocol/constants");
const bytes_1 = require("../../util/bytes");
const CROCKFORD_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTVWXYZ';
exports.PBKDF2_ITERATIONS = 2 << 16;
const PAIRING_AES_KEY_BYTES = 32;
function encodeBytesToCrockford(bytes) {
    let bitCount = 0;
    let value = 0;
    let out = '';
    for (let i = 0; i < bytes.length; i += 1) {
        value = (value << 8) | bytes[i];
        bitCount += 8;
        while (bitCount >= 5) {
            out += CROCKFORD_ALPHABET[(value >>> (bitCount - 5)) & 31];
            bitCount -= 5;
        }
    }
    if (bitCount > 0) {
        out += CROCKFORD_ALPHABET[(value << (5 - bitCount)) & 31];
    }
    return out;
}
function normalizeCustomPairingCode(input) {
    const stripped = input.replace(/-/g, '').toUpperCase();
    if (stripped.length !== 8) {
        throw new Error(`custom pairing code must be 8 characters, got ${stripped.length}`);
    }
    for (let i = 0; i < stripped.length; i += 1) {
        if (CROCKFORD_ALPHABET.indexOf(stripped[i]) < 0) {
            throw new Error(`custom pairing code contains invalid character "${stripped[i]}" (allowed: ${CROCKFORD_ALPHABET})`);
        }
    }
    return stripped;
}
async function createCompanionHello(options = {}) {
    const normalizedCustomCode = options.customCode !== undefined ? normalizeCustomPairingCode(options.customCode) : null;
    const [companionEphemeralKeyPair, salt, counter, codeBytes] = await Promise.all([
        X25519_1.X25519.generateKeyPair(),
        (0, _crypto_1.randomBytesAsync)(32),
        (0, _crypto_1.randomBytesAsync)(16),
        normalizedCustomCode !== null ? Promise.resolve(null) : (0, _crypto_1.randomBytesAsync)(5)
    ]);
    const pairingCode = normalizedCustomCode ?? encodeBytesToCrockford(codeBytes);
    const cipherKey = await (0, _crypto_1.pbkdf2Sha256)(bytes_1.TEXT_ENCODER.encode(pairingCode), salt, exports.PBKDF2_ITERATIONS, PAIRING_AES_KEY_BYTES);
    const encrypted = (0, _crypto_1.aesCtrEncrypt)(cipherKey, counter, companionEphemeralKeyPair.pubKey);
    return {
        pairingCode,
        companionEphemeralKeyPair,
        wrappedCompanionEphemeralPub: (0, bytes_1.concatBytes)([salt, counter, encrypted])
    };
}
async function completeCompanionFinish(args) {
    if (args.wrappedPrimaryEphemeralPub.length <= 48) {
        throw new Error('invalid wrapped primary payload');
    }
    const pairingCipherKey = await (0, _crypto_1.pbkdf2Sha256)(bytes_1.TEXT_ENCODER.encode(args.pairingCode), args.wrappedPrimaryEphemeralPub.subarray(0, 32), exports.PBKDF2_ITERATIONS, PAIRING_AES_KEY_BYTES);
    const primaryEphemeralPub = (0, _crypto_1.aesCtrDecrypt)(pairingCipherKey, args.wrappedPrimaryEphemeralPub.subarray(32, 48), args.wrappedPrimaryEphemeralPub.subarray(48));
    if (primaryEphemeralPub.length === 0) {
        throw new Error('empty primary ephemeral public key');
    }
    const [sharedEphemeral, sharedIdentity, bundleSalt, bundleSecret, bundleIv] = await Promise.all([
        X25519_1.X25519.scalarMult(args.companionEphemeralPrivKey, primaryEphemeralPub),
        X25519_1.X25519.scalarMult(args.registrationIdentityKeyPair.privKey, args.primaryIdentityPub),
        (0, _crypto_1.randomBytesAsync)(32),
        (0, _crypto_1.randomBytesAsync)(32),
        (0, _crypto_1.randomBytesAsync)(12)
    ]);
    const bundleEncryptionKey = (0, _crypto_1.hkdf)(sharedEphemeral, bundleSalt, constants_1.WA_PAIRING_KDF_INFO.LINK_CODE_BUNDLE, 32);
    const plaintextBundle = (0, bytes_1.concatBytes)([
        args.registrationIdentityKeyPair.pubKey,
        args.primaryIdentityPub,
        bundleSecret
    ]);
    const encryptedBundle = (0, _crypto_1.aesGcmEncrypt)(bundleEncryptionKey, bundleIv, plaintextBundle);
    const wrappedKeyBundle = (0, bytes_1.concatBytes)([bundleSalt, bundleIv, encryptedBundle]);
    const advMaterial = (0, bytes_1.concatBytes)([sharedEphemeral, sharedIdentity, bundleSecret]);
    const advSecret = (0, _crypto_1.hkdf)(advMaterial, null, constants_1.WA_PAIRING_KDF_INFO.ADV_SECRET, 32);
    return {
        wrappedKeyBundle,
        companionIdentityPublic: args.registrationIdentityKeyPair.pubKey,
        advSecret
    };
}
