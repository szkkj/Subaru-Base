import { WaNoiseSocket } from '../noise/WaNoiseSocket';
/**
 * Implements the Noise XX-style handshake state used by WaComms: tracks the
 * handshake hash, chaining key, derived cipher key, and nonce counter. Calls
 * {@link finish} to produce the post-handshake {@link WaNoiseSocket}.
 */
export declare class WaNoiseHandshake {
    private handshakeHash;
    private chainingKey;
    private cipherKey;
    private nonce;
    private readonly nonceScratch;
    constructor();
    start(protocolName: Uint8Array, prologue: Uint8Array): void;
    authenticate(data: Uint8Array): void;
    mixIntoKey(keyMaterial: Uint8Array): void;
    encrypt(plaintext: Uint8Array): Uint8Array;
    decrypt(ciphertext: Uint8Array): Uint8Array;
    finish(): WaNoiseSocket;
}
