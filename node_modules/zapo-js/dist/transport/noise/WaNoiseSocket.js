"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaNoiseSocket = void 0;
const node_crypto_1 = require("node:crypto");
const _crypto_1 = require("../../crypto");
/**
 * Post-handshake symmetric channel: applies AES-GCM with per-direction
 * 12-byte nonces (counter in the trailing 4 bytes) using a per-instance
 * scratch buffer to avoid allocations on the hot path.
 */
class WaNoiseSocket {
    constructor(encryptKey, decryptKey) {
        this.writeNonceScratch = new Uint8Array(12);
        this.readNonceScratch = new Uint8Array(12);
        this.encryptKey = (0, node_crypto_1.createSecretKey)(encryptKey);
        this.decryptKey = (0, node_crypto_1.createSecretKey)(decryptKey);
        this.writeCounter = 0;
        this.readCounter = 0;
    }
    /** Encrypts an outgoing `frame` with the next write nonce; advances the write counter. */
    encrypt(frame, additionalData) {
        (0, _crypto_1.writeNonceCounter)(this.writeNonceScratch, this.writeCounter++);
        return (0, _crypto_1.aesGcmEncrypt)(this.encryptKey, this.writeNonceScratch, frame, additionalData);
    }
    /** Decrypts an incoming `frame` with the next read nonce; advances the read counter. */
    decrypt(frame, additionalData) {
        (0, _crypto_1.writeNonceCounter)(this.readNonceScratch, this.readCounter++);
        return (0, _crypto_1.aesGcmDecrypt)(this.decryptKey, this.readNonceScratch, frame, additionalData);
    }
}
exports.WaNoiseSocket = WaNoiseSocket;
