"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompanionEphemeralIdentity = generateCompanionEphemeralIdentity;
exports.decodePrimaryEphemeralIdentity = decodePrimaryEphemeralIdentity;
exports.deriveVerificationCode = deriveVerificationCode;
exports.deriveEncryptionKey = deriveEncryptionKey;
exports.encryptPairingRequest = encryptPairingRequest;
const pairing_code_crypto_1 = require("../pairing/pairing-code-crypto");
const _crypto_1 = require("../../crypto");
const X25519_1 = require("../../crypto/curves/X25519");
const _proto_1 = require("../../proto");
const bytes_1 = require("../../util/bytes");
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
const ENCRYPTION_KEY_INFO = bytes_1.TEXT_ENCODER.encode('Pairing Information Encryption Key');
/**
 * Generates the companion's ephemeral identity + commitment for a Shortcake
 * prologue. The companion publishes a commitment to its nonce now and reveals
 * the nonce later (after the primary's identity arrives) so the primary cannot
 * grind the verification code.
 */
async function generateCompanionEphemeralIdentity(args) {
    const [keyPair, companionNonce] = await Promise.all([
        X25519_1.X25519.generateKeyPair(),
        (0, _crypto_1.randomBytesAsync)(NONCE_BYTES)
    ]);
    const companionEphemeralIdentityBytes = _proto_1.proto.CompanionEphemeralIdentity.encode({
        publicKey: keyPair.pubKey,
        deviceType: args.deviceType,
        ref: args.ref
    }).finish();
    const commitmentHash = (0, _crypto_1.sha256)((0, bytes_1.concatBytes)([companionEphemeralIdentityBytes, companionNonce]));
    const prologuePayloadBytes = _proto_1.proto.ProloguePayload.encode({
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
function decodePrimaryEphemeralIdentity(bytes) {
    const decoded = _proto_1.proto.PrimaryEphemeralIdentity.decode(bytes);
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
function deriveVerificationCode(companionNonce, primary) {
    const digest = (0, _crypto_1.sha256)((0, bytes_1.concatBytes)([companionNonce, primary.publicKey]));
    const code = new Uint8Array(VERIFICATION_CODE_BYTES);
    for (let i = 0; i < VERIFICATION_CODE_BYTES; i += 1) {
        code[i] = primary.nonce[i] ^ digest[i];
    }
    return (0, pairing_code_crypto_1.encodeBytesToCrockford)(code);
}
/**
 * Derives the AES-GCM key that protects the pairing request:
 * `HKDF( X25519(companionPriv, primaryPub), salt="Companion Pairing <deviceType> with ref <ref>", info="Pairing Information Encryption Key" )`.
 */
async function deriveEncryptionKey(args) {
    const shared = await X25519_1.X25519.scalarMult(args.companionPrivKey, args.primaryPublicKey);
    const salt = bytes_1.TEXT_ENCODER.encode(`Companion Pairing ${String(args.deviceType)} with ref ${args.ref}`);
    return (0, _crypto_1.hkdf)(shared, salt, ENCRYPTION_KEY_INFO, ENCRYPTION_KEY_BYTES);
}
/**
 * Encrypts the pairing request plaintext under the derived key and returns the
 * encoded `EncryptedPairingRequest` proto (random 12-byte IV).
 */
async function encryptPairingRequest(encryptionKey, plaintext) {
    if (encryptionKey.length !== ENCRYPTION_KEY_BYTES) {
        throw new Error('shortcake: encryption key must be 32 bytes');
    }
    const iv = await (0, _crypto_1.randomBytesAsync)(GCM_IV_BYTES);
    const encryptedPayload = (0, _crypto_1.aesGcmEncrypt)(encryptionKey, iv, plaintext);
    return _proto_1.proto.EncryptedPairingRequest.encode({ encryptedPayload, iv }).finish();
}
