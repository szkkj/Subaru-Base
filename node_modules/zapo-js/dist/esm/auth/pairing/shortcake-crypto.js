import { encodeBytesToCrockford } from '../pairing/pairing-code-crypto.js';
import { aesGcmEncrypt, hkdf, randomBytesAsync, sha256 } from '../../crypto/index.js';
import { X25519 } from '../../crypto/curves/X25519.js';
import { proto } from '../../proto.js';
import { concatBytes, TEXT_ENCODER } from '../../util/bytes.js';
/**
 * Cryptographic core of the WhatsApp "Shortcake" companion-linking protocol
 * (the device-link flow the official clients call CRSC / Shortcake).
 *
 * This module implements ONLY the wire/crypto half: ephemeral X25519 key
 * exchange, the commit-reveal nonce, the verification code, and the AES-GCM
 * pairing envelope. The WebAuthn/passkey assertion that gates the prologue is
 * NOT produced here – it is an opaque input supplied by the caller (so the
 * credential source stays out of the protocol layer).
 *
 * Mirrors `WAWebShortcakeLinkingAlgorithm` from the web client.
 */
const NONCE_BYTES = 32;
const VERIFICATION_CODE_BYTES = 5;
const GCM_IV_BYTES = 12;
const ENCRYPTION_KEY_BYTES = 32;
const EPHEMERAL_PUBLIC_KEY_BYTES = 32;
/** HKDF `info` for the pairing-request encryption key. */
const ENCRYPTION_KEY_INFO = TEXT_ENCODER.encode('Pairing Information Encryption Key');
/**
 * Generates the companion's ephemeral identity + commitment for a Shortcake
 * prologue. The companion publishes a commitment to its nonce now and reveals
 * the nonce later (after the primary's identity arrives) so the primary cannot
 * grind the verification code.
 */
export async function generateCompanionEphemeralIdentity(args) {
    const [keyPair, companionNonce] = await Promise.all([
        X25519.generateKeyPair(),
        randomBytesAsync(NONCE_BYTES)
    ]);
    const companionEphemeralIdentityBytes = proto.CompanionEphemeralIdentity.encode({
        publicKey: keyPair.pubKey,
        deviceType: args.deviceType,
        ref: args.ref
    }).finish();
    const commitmentHash = sha256(concatBytes([companionEphemeralIdentityBytes, companionNonce]));
    const prologuePayloadBytes = proto.ProloguePayload.encode({
        companionEphemeralIdentity: companionEphemeralIdentityBytes,
        commitment: { hash: commitmentHash }
    }).finish();
    return {
        keyPair,
        companionNonce,
        companionEphemeralIdentityBytes,
        commitmentHash,
        prologuePayloadBytes
    };
}
/** Parses + validates a `PrimaryEphemeralIdentity` proto from the primary. */
export function decodePrimaryEphemeralIdentity(bytes) {
    const decoded = proto.PrimaryEphemeralIdentity.decode(bytes);
    const publicKey = decoded.publicKey;
    const nonce = decoded.nonce;
    if (!publicKey || publicKey.length !== EPHEMERAL_PUBLIC_KEY_BYTES) {
        throw new Error('shortcake: PrimaryEphemeralIdentity.publicKey must be 32 bytes');
    }
    if (!nonce || nonce.length !== NONCE_BYTES) {
        throw new Error('shortcake: PrimaryEphemeralIdentity.nonce must be 32 bytes');
    }
    return { publicKey, nonce };
}
/**
 * Derives the short verification code shown on both devices:
 * `Crockford32( primaryNonce[0..5] XOR SHA-256(companionNonce ‖ primaryPubKey)[0..5] )`.
 */
export function deriveVerificationCode(companionNonce, primary) {
    const digest = sha256(concatBytes([companionNonce, primary.publicKey]));
    const code = new Uint8Array(VERIFICATION_CODE_BYTES);
    for (let i = 0; i < VERIFICATION_CODE_BYTES; i += 1) {
        code[i] = primary.nonce[i] ^ digest[i];
    }
    return encodeBytesToCrockford(code);
}
/**
 * Derives the AES-GCM key that protects the pairing request:
 * `HKDF( X25519(companionPriv, primaryPub), salt="Companion Pairing <deviceType> with ref <ref>", info="Pairing Information Encryption Key" )`.
 */
export async function deriveEncryptionKey(args) {
    const shared = await X25519.scalarMult(args.companionPrivKey, args.primaryPublicKey);
    const salt = TEXT_ENCODER.encode(`Companion Pairing ${String(args.deviceType)} with ref ${args.ref}`);
    return hkdf(shared, salt, ENCRYPTION_KEY_INFO, ENCRYPTION_KEY_BYTES);
}
/**
 * Encrypts the pairing request plaintext under the derived key and returns the
 * encoded `EncryptedPairingRequest` proto (random 12-byte IV).
 */
export async function encryptPairingRequest(encryptionKey, plaintext) {
    if (encryptionKey.length !== ENCRYPTION_KEY_BYTES) {
        throw new Error('shortcake: encryption key must be 32 bytes');
    }
    const iv = await randomBytesAsync(GCM_IV_BYTES);
    const encryptedPayload = aesGcmEncrypt(encryptionKey, iv, plaintext);
    return proto.EncryptedPairingRequest.encode({ encryptedPayload, iv }).finish();
}
