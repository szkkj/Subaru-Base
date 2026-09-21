import { aesGcmDecrypt, aesGcmEncrypt, hkdfSplit, sha256, writeNonceCounter } from '../../crypto/index.js';
import { WaNoiseSocket } from '../noise/WaNoiseSocket.js';
import { EMPTY_BYTES } from '../../util/bytes.js';
/**
 * Implements the Noise XX-style handshake state used by WaComms: tracks the
 * handshake hash, chaining key, derived cipher key, and nonce counter. Calls
 * {@link finish} to produce the post-handshake {@link WaNoiseSocket}.
 */
export class WaNoiseHandshake {
    constructor() {
        this.nonceScratch = new Uint8Array(12);
        this.handshakeHash = EMPTY_BYTES;
        this.chainingKey = EMPTY_BYTES;
        this.cipherKey = null;
        this.nonce = 0;
    }
    start(protocolName, prologue) {
        const hashInput = protocolName.length === 32 ? protocolName : sha256(protocolName);
        this.handshakeHash = hashInput;
        this.chainingKey = hashInput;
        this.cipherKey = this.handshakeHash;
        this.authenticate(prologue);
    }
    authenticate(data) {
        this.handshakeHash = sha256([this.handshakeHash, data]);
    }
    mixIntoKey(keyMaterial) {
        this.nonce = 0;
        const [newChainingKey, nextCipherKey] = hkdfSplit(keyMaterial, this.chainingKey, EMPTY_BYTES);
        this.chainingKey = newChainingKey;
        this.cipherKey = nextCipherKey;
    }
    encrypt(plaintext) {
        if (!this.cipherKey) {
            throw new Error('noise handshake cipher key is not initialized');
        }
        writeNonceCounter(this.nonceScratch, this.nonce++);
        const ciphertext = aesGcmEncrypt(this.cipherKey, this.nonceScratch, plaintext, this.handshakeHash);
        this.authenticate(ciphertext);
        return ciphertext;
    }
    decrypt(ciphertext) {
        if (!this.cipherKey) {
            throw new Error('noise handshake cipher key is not initialized');
        }
        writeNonceCounter(this.nonceScratch, this.nonce++);
        const plaintext = aesGcmDecrypt(this.cipherKey, this.nonceScratch, ciphertext, this.handshakeHash);
        this.authenticate(ciphertext);
        return plaintext;
    }
    finish() {
        const [writeKey, readKey] = hkdfSplit(EMPTY_BYTES, this.chainingKey, EMPTY_BYTES);
        this.handshakeHash = EMPTY_BYTES;
        this.chainingKey = EMPTY_BYTES;
        this.cipherKey = null;
        this.nonce = 0;
        return new WaNoiseSocket(writeKey, readKey);
    }
}
