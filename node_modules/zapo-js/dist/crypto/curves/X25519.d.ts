import { type SignalKeyPair } from '../curves/types';
/**
 * Applies the standard curve25519 scalar clamping in place and returns the
 * same buffer for chaining. Throws on non-32-byte inputs.
 */
export declare function clampCurvePrivateKeyInPlace(privateKey: Uint8Array): Uint8Array;
/**
 * Converts a 32-byte Montgomery (curve25519) public key to its Edwards form
 * for XEdDSA verification, applying the supplied `signBit` (`0x80` mask).
 * Throws on the field-`p-1` low-order point.
 */
export declare function montgomeryToEdwardsPublic(curvePublicKey: Uint8Array, signBit: number): Uint8Array;
/**
 * X25519 key-pair generation and Diffie-Hellman scalar multiplication
 * backed by Node's native primitives.
 */
export declare class X25519 {
    /** Generates a fresh X25519 key pair. */
    static generateKeyPair(): Promise<SignalKeyPair>;
    /** Derives the matching public key from a 32-byte X25519 private key. */
    static keyPairFromPrivateKey(privKey: Uint8Array): SignalKeyPair;
    /**
     * Computes the X25519 shared secret between `privKey` and `pubKey`.
     * Uses Node's async DH path when supported, otherwise falls back to sync.
     */
    static scalarMult(privKey: Uint8Array, pubKey: Uint8Array): Promise<Uint8Array>;
}
