import { randomIntAsync, xeddsaSign } from '../../crypto/index.js';
import { toSerializedPubKey } from '../../crypto/core/keys.js';
import { X25519 } from '../../crypto/curves/X25519.js';
/**
 * Generates the per-device Signal registration info – a random registration id
 * plus a fresh identity X25519 key pair.
 */
export async function generateRegistrationInfo() {
    const [registrationId, identityKeyPair] = await Promise.all([
        generateRegistrationId(),
        X25519.generateKeyPair()
    ]);
    return {
        registrationId,
        identityKeyPair
    };
}
/** Generates a fresh one-time prekey record with the given `keyId`. */
export async function generatePreKeyPair(keyId) {
    return {
        keyId,
        keyPair: await X25519.generateKeyPair(),
        uploaded: false
    };
}
/**
 * Generates a signed prekey: a fresh X25519 keypair plus an XEdDSA signature
 * over its serialized public key, signed by `signingPrivateKey` (identity key).
 */
export async function generateSignedPreKey(keyId, signingPrivateKey) {
    const keyPair = await X25519.generateKeyPair();
    const serializedPubKey = toSerializedPubKey(keyPair.pubKey);
    const signature = await xeddsaSign(signingPrivateKey, serializedPubKey);
    return {
        keyId,
        keyPair,
        signature,
        uploaded: false
    };
}
/** Generates a Signal registration id in the valid `[1, 16380]` range. */
export async function generateRegistrationId() {
    return await randomIntAsync(1, 16381);
}
