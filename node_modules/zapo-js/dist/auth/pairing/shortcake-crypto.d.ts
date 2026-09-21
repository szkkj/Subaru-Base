import type { SignalKeyPair } from '../../crypto/curves/types';
import { proto } from '../../proto';
/**
 * Decoded `PrimaryEphemeralIdentity` the primary device returns: its ephemeral
 * X25519 public key (32B) and a 32B nonce used to derive the verification code.
 */
export interface ShortcakePrimaryEphemeralIdentity {
    readonly publicKey: Uint8Array;
    readonly nonce: Uint8Array;
}
/**
 * @sensitive Carries the companion's ephemeral X25519 private key
 * (`keyPair.privKey`) and the pre-image `companionNonce`. Hold these in memory
 * for the handshake only; never log or `JSON.stringify` an instance.
 */
export interface ShortcakeCompanionEphemeralIdentity {
    /** Companion ephemeral X25519 keypair (private half kept for the ECDH). */
    readonly keyPair: SignalKeyPair;
    /** 32 random bytes committed up-front, revealed only after the primary replies. */
    readonly companionNonce: Uint8Array;
    /** Encoded `CompanionEphemeralIdentity` proto (committed + sent in the prologue). */
    readonly companionEphemeralIdentityBytes: Uint8Array;
    /** `SHA-256(companionEphemeralIdentity ‖ companionNonce)` – the commitment hash. */
    readonly commitmentHash: Uint8Array;
    /** Encoded `ProloguePayload` proto ready for the `SetPasskeyPrologue` IQ. */
    readonly prologuePayloadBytes: Uint8Array;
}
/**
 * Generates the companion's ephemeral identity + commitment for a Shortcake
 * prologue. The companion publishes a commitment to its nonce now and reveals
 * the nonce later (after the primary's identity arrives) so the primary cannot
 * grind the verification code.
 */
export declare function generateCompanionEphemeralIdentity(args: {
    readonly ref: string;
    readonly deviceType: proto.DeviceProps.PlatformType;
}): Promise<ShortcakeCompanionEphemeralIdentity>;
/** Parses + validates a `PrimaryEphemeralIdentity` proto from the primary. */
export declare function decodePrimaryEphemeralIdentity(bytes: Uint8Array): ShortcakePrimaryEphemeralIdentity;
/**
 * Derives the short verification code shown on both devices:
 * `Crockford32( primaryNonce[0..5] XOR SHA-256(companionNonce ‖ primaryPubKey)[0..5] )`.
 */
export declare function deriveVerificationCode(companionNonce: Uint8Array, primary: ShortcakePrimaryEphemeralIdentity): string;
/**
 * Derives the AES-GCM key that protects the pairing request:
 * `HKDF( X25519(companionPriv, primaryPub), salt="Companion Pairing <deviceType> with ref <ref>", info="Pairing Information Encryption Key" )`.
 */
export declare function deriveEncryptionKey(args: {
    readonly companionPrivKey: Uint8Array;
    readonly primaryPublicKey: Uint8Array;
    readonly deviceType: proto.DeviceProps.PlatformType;
    readonly ref: string;
}): Promise<Uint8Array>;
/**
 * Encrypts the pairing request plaintext under the derived key and returns the
 * encoded `EncryptedPairingRequest` proto (random 12-byte IV).
 */
export declare function encryptPairingRequest(encryptionKey: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array>;
