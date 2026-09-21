import type { PreKeyRecord, RegistrationInfo, SignedPreKeyRecord } from '../types';
/**
 * Generates the per-device Signal registration info – a random registration id
 * plus a fresh identity X25519 key pair.
 */
export declare function generateRegistrationInfo(): Promise<RegistrationInfo>;
/** Generates a fresh one-time prekey record with the given `keyId`. */
export declare function generatePreKeyPair(keyId: number): Promise<PreKeyRecord>;
/**
 * Generates a signed prekey: a fresh X25519 keypair plus an XEdDSA signature
 * over its serialized public key, signed by `signingPrivateKey` (identity key).
 */
export declare function generateSignedPreKey(keyId: number, signingPrivateKey: Uint8Array): Promise<SignedPreKeyRecord>;
/** Generates a Signal registration id in the valid `[1, 16380]` range. */
export declare function generateRegistrationId(): Promise<number>;
