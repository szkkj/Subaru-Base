/**
 * Post-handshake symmetric channel: applies AES-GCM with per-direction
 * 12-byte nonces (counter in the trailing 4 bytes) using a per-instance
 * scratch buffer to avoid allocations on the hot path.
 */
export declare class WaNoiseSocket {
    private readonly encryptKey;
    private readonly decryptKey;
    private writeCounter;
    private readCounter;
    private readonly writeNonceScratch;
    private readonly readNonceScratch;
    constructor(encryptKey: Uint8Array, decryptKey: Uint8Array);
    /** Encrypts an outgoing `frame` with the next write nonce; advances the write counter. */
    encrypt(frame: Uint8Array, additionalData?: Uint8Array): Uint8Array;
    /** Decrypts an incoming `frame` with the next read nonce; advances the read counter. */
    decrypt(frame: Uint8Array, additionalData?: Uint8Array): Uint8Array;
}
