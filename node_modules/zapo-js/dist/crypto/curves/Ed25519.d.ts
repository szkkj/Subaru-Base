import { type SignalKeyPair } from '../curves/types';
/**
 * Ed25519 sign/verify backed by Node's native primitives. All operations are
 * async to keep crypto off the event loop.
 */
export declare class Ed25519 {
    /** Generates a fresh Ed25519 key pair. */
    static generateKeyPair(): Promise<SignalKeyPair>;
    /** Signs `message` with a 32-byte Ed25519 private key. Returns a 64-byte signature. */
    static sign(message: Uint8Array, privKey: Uint8Array): Promise<Uint8Array>;
    /** Verifies an Ed25519 `signature` over `message` against a 32-byte public key. */
    static verify(message: Uint8Array, signature: Uint8Array, pubKey: Uint8Array): Promise<boolean>;
}
