"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRegistrationInfo = generateRegistrationInfo;
exports.generatePreKeyPair = generatePreKeyPair;
exports.generateSignedPreKey = generateSignedPreKey;
exports.generateRegistrationId = generateRegistrationId;
const _crypto_1 = require("../../crypto");
const keys_1 = require("../../crypto/core/keys");
const X25519_1 = require("../../crypto/curves/X25519");
/**
 * Generates the per-device Signal registration info – a random registration id
 * plus a fresh identity X25519 key pair.
 */
async function generateRegistrationInfo() {
    const [registrationId, identityKeyPair] = await Promise.all([
        generateRegistrationId(),
        X25519_1.X25519.generateKeyPair()
    ]);
    return {
        registrationId,
        identityKeyPair
    };
}
/** Generates a fresh one-time prekey record with the given `keyId`. */
async function generatePreKeyPair(keyId) {
    return {
        keyId,
        keyPair: await X25519_1.X25519.generateKeyPair(),
        uploaded: false
    };
}
/**
 * Generates a signed prekey: a fresh X25519 keypair plus an XEdDSA signature
 * over its serialized public key, signed by `signingPrivateKey` (identity key).
 */
async function generateSignedPreKey(keyId, signingPrivateKey) {
    const keyPair = await X25519_1.X25519.generateKeyPair();
    const serializedPubKey = (0, keys_1.toSerializedPubKey)(keyPair.pubKey);
    const signature = await (0, _crypto_1.xeddsaSign)(signingPrivateKey, serializedPubKey);
    return {
        keyId,
        keyPair,
        signature,
        uploaded: false
    };
}
/** Generates a Signal registration id in the valid `[1, 16380]` range. */
async function generateRegistrationId() {
    return await (0, _crypto_1.randomIntAsync)(1, 16381);
}
