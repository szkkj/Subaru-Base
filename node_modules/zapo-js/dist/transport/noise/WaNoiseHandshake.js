"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaNoiseHandshake = void 0;
const _crypto_1 = require("../../crypto");
const WaNoiseSocket_1 = require("../noise/WaNoiseSocket");
const bytes_1 = require("../../util/bytes");
/**
 * Implements the Noise XX-style handshake state used by WaComms: tracks the
 * handshake hash, chaining key, derived cipher key, and nonce counter. Calls
 * {@link finish} to produce the post-handshake {@link WaNoiseSocket}.
 */
class WaNoiseHandshake {
    constructor() {
        this.nonceScratch = new Uint8Array(12);
        this.handshakeHash = bytes_1.EMPTY_BYTES;
        this.chainingKey = bytes_1.EMPTY_BYTES;
        this.cipherKey = null;
        this.nonce = 0;
    }
    start(protocolName, prologue) {
        const hashInput = protocolName.length === 32 ? protocolName : (0, _crypto_1.sha256)(protocolName);
        this.handshakeHash = hashInput;
        this.chainingKey = hashInput;
        this.cipherKey = this.handshakeHash;
        this.authenticate(prologue);
    }
    authenticate(data) {
        this.handshakeHash = (0, _crypto_1.sha256)([this.handshakeHash, data]);
    }
    mixIntoKey(keyMaterial) {
        this.nonce = 0;
        const [newChainingKey, nextCipherKey] = (0, _crypto_1.hkdfSplit)(keyMaterial, this.chainingKey, bytes_1.EMPTY_BYTES);
        this.chainingKey = newChainingKey;
        this.cipherKey = nextCipherKey;
    }
    encrypt(plaintext) {
        if (!this.cipherKey) {
            throw new Error('noise handshake cipher key is not initialized');
        }
        (0, _crypto_1.writeNonceCounter)(this.nonceScratch, this.nonce++);
        const ciphertext = (0, _crypto_1.aesGcmEncrypt)(this.cipherKey, this.nonceScratch, plaintext, this.handshakeHash);
        this.authenticate(ciphertext);
        return ciphertext;
    }
    decrypt(ciphertext) {
        if (!this.cipherKey) {
            throw new Error('noise handshake cipher key is not initialized');
        }
        (0, _crypto_1.writeNonceCounter)(this.nonceScratch, this.nonce++);
        const plaintext = (0, _crypto_1.aesGcmDecrypt)(this.cipherKey, this.nonceScratch, ciphertext, this.handshakeHash);
        this.authenticate(ciphertext);
        return plaintext;
    }
    finish() {
        const [writeKey, readKey] = (0, _crypto_1.hkdfSplit)(bytes_1.EMPTY_BYTES, this.chainingKey, bytes_1.EMPTY_BYTES);
        this.handshakeHash = bytes_1.EMPTY_BYTES;
        this.chainingKey = bytes_1.EMPTY_BYTES;
        this.cipherKey = null;
        this.nonce = 0;
        return new WaNoiseSocket_1.WaNoiseSocket(writeKey, readKey);
    }
}
exports.WaNoiseHandshake = WaNoiseHandshake;
