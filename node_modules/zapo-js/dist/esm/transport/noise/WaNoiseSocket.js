import { createSecretKey } from 'node:crypto';
import { aesGcmDecrypt, aesGcmEncrypt, writeNonceCounter } from '../../crypto/index.js';
/**
 * Post-handshake symmetric channel: applies AES-GCM with per-direction
 * 12-byte nonces (counter in the trailing 4 bytes) using a per-instance
 * scratch buffer to avoid allocations on the hot path.
 */
export class WaNoiseSocket {
    constructor(encryptKey, decryptKey) {
        this.writeNonceScratch = new Uint8Array(12);
        this.readNonceScratch = new Uint8Array(12);
        this.encryptKey = createSecretKey(encryptKey);
        this.decryptKey = createSecretKey(decryptKey);
        this.writeCounter = 0;
        this.readCounter = 0;
    }
    /** Encrypts an outgoing `frame` with the next write nonce; advances the write counter. */
    encrypt(frame, additionalData) {
        writeNonceCounter(this.writeNonceScratch, this.writeCounter++);
        return aesGcmEncrypt(this.encryptKey, this.writeNonceScratch, frame, additionalData);
    }
    /** Decrypts an incoming `frame` with the next read nonce; advances the read counter. */
    decrypt(frame, additionalData) {
        writeNonceCounter(this.readNonceScratch, this.readCounter++);
        return aesGcmDecrypt(this.decryptKey, this.readNonceScratch, frame, additionalData);
    }
}
