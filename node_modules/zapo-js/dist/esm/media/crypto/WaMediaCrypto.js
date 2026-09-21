import { createCipheriv, createDecipheriv, createHash, createHmac } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { hkdf } from '../../crypto/core/hkdf.js';
import { aesCbcDecrypt, aesCbcEncryptWithTrailer, hmacSha256Sign, sha256 } from '../../crypto/core/primitives.js';
import { randomBytesAsync } from '../../crypto/core/random.js';
import { ENC_KEY_END, ENC_KEY_START, HMAC_TRUNCATED_SIZE, IV_SIZE, MAC_KEY_END, MAC_KEY_START, MEDIA_HKDF_SIZE, SIDECAR_CHUNK_SIZE, SIDECAR_HMAC_SIZE } from '../constants.js';
import { scanStreamable, WaStreamableScanner } from '../container.js';
import { getWaMediaHkdfInfo, WA_APP_STATE_KEY_TYPES } from '../../protocol/constants.js';
import { assertByteLength, toBytesView, toChunkBytes, uint8TimingSafeEqual } from '../../util/bytes.js';
import { toError } from '../../util/primitives.js';
const AES_BLOCK_SIZE = 16;
function computeFirstFrameSidecar(macKey, iv, ciphertext, firstFrameLength) {
    const aligned = Math.ceil(firstFrameLength / AES_BLOCK_SIZE) * AES_BLOCK_SIZE;
    const digest = hmacSha256Sign(macKey, [iv, ciphertext.subarray(0, aligned)]);
    return digest.subarray(0, SIDECAR_HMAC_SIZE);
}
class SidecarAccumulator {
    constructor(macKey, estimatedSize = 0) {
        this.resultOffset = 0;
        this.totalPushed = 0;
        this.windowOffset = 0;
        this.nextChunkStart = 0;
        this.macKey = macKey;
        this.window = new Uint8Array(IV_SIZE + SIDECAR_CHUNK_SIZE);
        const safeEstimate = Number.isFinite(estimatedSize) && estimatedSize > 0 ? estimatedSize : 0;
        const estimated = Math.max(Math.ceil(safeEstimate / SIDECAR_CHUNK_SIZE) + 1, 16);
        this.result = new Uint8Array(estimated * SIDECAR_HMAC_SIZE);
    }
    push(data) {
        let srcOffset = 0;
        while (srcOffset < data.byteLength) {
            const windowEnd = this.nextChunkStart + IV_SIZE + SIDECAR_CHUNK_SIZE;
            const remaining = windowEnd - this.totalPushed;
            const toCopy = Math.min(remaining, data.byteLength - srcOffset);
            this.window.set(data.subarray(srcOffset, srcOffset + toCopy), this.windowOffset);
            this.windowOffset += toCopy;
            this.totalPushed += toCopy;
            srcOffset += toCopy;
            if (this.totalPushed === windowEnd) {
                this.flushChunk();
            }
        }
    }
    finish() {
        if (this.windowOffset > 0) {
            this.flushChunk();
        }
        return this.result.subarray(0, this.resultOffset);
    }
    flushChunk() {
        const digest = createHmac('sha256', this.macKey)
            .update(this.window.subarray(0, this.windowOffset))
            .digest();
        if (this.resultOffset + SIDECAR_HMAC_SIZE > this.result.byteLength) {
            const grown = new Uint8Array(this.result.byteLength * 2);
            grown.set(this.result);
            this.result = grown;
        }
        this.result.set(digest.subarray(0, SIDECAR_HMAC_SIZE), this.resultOffset);
        this.resultOffset += SIDECAR_HMAC_SIZE;
        this.nextChunkStart += SIDECAR_CHUNK_SIZE;
        const overlapSrc = this.window.subarray(this.windowOffset - IV_SIZE, this.windowOffset);
        this.window.set(overlapSrc, 0);
        this.windowOffset = IV_SIZE;
    }
}
/**
 * WhatsApp media payload encryption/decryption (AES-256-CBC + HMAC-SHA-256 +
 * SHA-256 hashes + streaming sidecar). Buffer-only and streaming variants are
 * provided for upload, download, and disk-staged encryption.
 */
export class WaMediaCrypto {
    /** Generates a fresh 32-byte media key suitable for {@link deriveKeys}. */
    static async generateMediaKey() {
        return randomBytesAsync(32);
    }
    /**
     * Derives the per-type AES IV, AES key, and MAC key from `mediaKey` using
     * HKDF with the {@link getWaMediaHkdfInfo} context.
     */
    static deriveKeys(mediaType, mediaKey) {
        assertByteLength(mediaKey, 32, `invalid media key length ${mediaKey.byteLength}, expected 32`);
        const info = mediaTypeToHkdfInfo(mediaType);
        const expanded = hkdf(mediaKey, null, info, MEDIA_HKDF_SIZE);
        return {
            iv: expanded.subarray(0, IV_SIZE),
            encKey: expanded.subarray(ENC_KEY_START, ENC_KEY_END),
            macKey: expanded.subarray(MAC_KEY_START, MAC_KEY_END)
        };
    }
    /**
     * Encrypts an in-memory buffer with the streaming sidecar (unless disabled)
     * and an optional first-frame sidecar for instant-thumbnail playback.
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    static async encryptBytes(mediaType, mediaKey, plaintext, options) {
        const keys = WaMediaCrypto.deriveKeys(mediaType, mediaKey);
        const ciphertextHmac = aesCbcEncryptWithTrailer(keys.encKey, keys.iv, plaintext, HMAC_TRUNCATED_SIZE);
        const cipherLength = ciphertextHmac.length - HMAC_TRUNCATED_SIZE;
        const ciphertext = ciphertextHmac.subarray(0, cipherLength);
        const mac = hmacSha256Sign(keys.macKey, [keys.iv, ciphertext]);
        const signature = mac.subarray(0, HMAC_TRUNCATED_SIZE);
        ciphertextHmac.set(signature, cipherLength);
        let streamingSidecar;
        if (options?.sidecar !== false && scanStreamable(plaintext) !== false) {
            const acc = new SidecarAccumulator(keys.macKey, plaintext.byteLength);
            acc.push(keys.iv);
            acc.push(ciphertext);
            acc.push(signature);
            streamingSidecar = acc.finish();
        }
        const firstFrameSidecar = options?.firstFrameLength !== undefined
            ? computeFirstFrameSidecar(keys.macKey, keys.iv, ciphertext, options.firstFrameLength)
            : undefined;
        const fileSha256 = sha256(plaintext);
        const fileEncSha256 = sha256(ciphertextHmac);
        return {
            ciphertextHmac,
            fileSha256,
            fileEncSha256,
            streamingSidecar,
            firstFrameSidecar
        };
    }
    /**
     * Decrypts an in-memory `ciphertext||mac` buffer. Verifies the encrypted
     * SHA-256, the MAC, and (when supplied) the plaintext SHA-256. Pass
     * `skipMacVerification` only when the MAC was checked elsewhere.
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    static async decryptBytes(mediaType, mediaKey, ciphertextHmac, expectedFileSha256, expectedFileEncSha256, skipMacVerification = false) {
        if (ciphertextHmac.byteLength < HMAC_TRUNCATED_SIZE) {
            throw new Error(`ciphertext too short: ${ciphertextHmac.byteLength}`);
        }
        if (expectedFileEncSha256) {
            const computedEncHash = sha256(ciphertextHmac);
            if (!uint8TimingSafeEqual(computedEncHash, expectedFileEncSha256)) {
                throw new Error('encrypted file hash mismatch');
            }
        }
        const keys = WaMediaCrypto.deriveKeys(mediaType, mediaKey);
        const ciphertext = ciphertextHmac.subarray(0, ciphertextHmac.byteLength - HMAC_TRUNCATED_SIZE);
        const expectedMac = ciphertextHmac.subarray(ciphertextHmac.byteLength - HMAC_TRUNCATED_SIZE);
        if (!skipMacVerification) {
            const mac = hmacSha256Sign(keys.macKey, [keys.iv, ciphertext]);
            const signature = mac.subarray(0, HMAC_TRUNCATED_SIZE);
            if (!uint8TimingSafeEqual(signature, expectedMac)) {
                throw new Error('media MAC mismatch');
            }
        }
        const plaintext = aesCbcDecrypt(keys.encKey, keys.iv, ciphertext);
        const fileSha256 = sha256(plaintext);
        if (expectedFileSha256 && !uint8TimingSafeEqual(fileSha256, expectedFileSha256)) {
            throw new Error('plaintext file hash mismatch');
        }
        const fileEncSha256 = expectedFileEncSha256 ?? sha256(ciphertextHmac);
        return { plaintext, fileSha256, fileEncSha256 };
    }
    /**
     * Streaming encrypt – returns an `encrypted` Readable plus a `metadata`
     * promise that resolves with hashes/sidecars after the stream ends.
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    static async encryptReadable(mediaType, mediaKey, plaintext, options) {
        const keys = WaMediaCrypto.deriveKeys(mediaType, mediaKey);
        const encrypted = new PassThrough();
        const metadata = pumpEncryption(plaintext, encrypted, keys, options?.sidecar !== false, options?.firstFrameLength, options?.expectedFileSize);
        return { encrypted, metadata };
    }
    /**
     * Encrypts `plaintext` to a temporary file in `tmpdir()` and returns its
     * path/size/hashes. The file is removed on failure; call
     * {@link cleanupEncryptedFile} after a successful upload.
     */
    static async encryptToFile(mediaType, mediaKey, plaintext, options) {
        const keys = WaMediaCrypto.deriveKeys(mediaType, mediaKey);
        const filePath = join(tmpdir(), `zapo-enc-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const output = createWriteStream(filePath);
        try {
            const metadata = await pumpEncryption(plaintext, output, keys, options?.sidecar !== false, options?.firstFrameLength, options?.expectedFileSize);
            const fileSize = (await stat(filePath)).size;
            return { filePath, fileSize, ...metadata };
        }
        catch (error) {
            await unlink(filePath).catch(() => undefined);
            throw error;
        }
    }
    /** Removes a temporary file produced by {@link encryptToFile}; missing files are ignored. */
    static async cleanupEncryptedFile(filePath) {
        await unlink(filePath).catch(() => undefined);
    }
    /**
     * Streaming decrypt – returns a `plaintext` Readable plus a `metadata`
     * promise that resolves with the verified hashes after the stream ends
     * (or rejects on MAC/hash failure).
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    static async decryptReadable(encrypted, options) {
        const keys = WaMediaCrypto.deriveKeys(options.mediaType, options.mediaKey);
        const plaintext = new PassThrough();
        const metadata = pumpDecryption(encrypted, plaintext, keys, options);
        return { plaintext, metadata };
    }
    /** Returns the ciphertext byte length (AES-CBC padded + 10-byte MAC) for a given plaintext size. */
    static encryptedLength(plaintextLength) {
        if (!Number.isFinite(plaintextLength) || plaintextLength < 0) {
            throw new Error(`invalid plaintext length ${plaintextLength}`);
        }
        const paddedLength = Math.ceil((plaintextLength + 1) / 16) * 16;
        return paddedLength + HMAC_TRUNCATED_SIZE;
    }
}
async function pumpEncryption(plaintext, output, keys, computeSidecar, firstFrameLength, expectedFileSize) {
    const cipher = createCipheriv('aes-256-cbc', keys.encKey, keys.iv);
    const plainHash = createHash('sha256');
    const encHash = createHash('sha256');
    const hmac = createHmac('sha256', keys.macKey);
    let sidecar = computeSidecar ? new SidecarAccumulator(keys.macKey, expectedFileSize) : null;
    const scanner = computeSidecar ? new WaStreamableScanner() : null;
    const ffTarget = firstFrameLength !== undefined
        ? IV_SIZE + Math.ceil(firstFrameLength / AES_BLOCK_SIZE) * AES_BLOCK_SIZE
        : 0;
    const ffChunks = ffTarget > 0 ? [keys.iv] : [];
    let ffCollected = ffTarget > 0 ? IV_SIZE : 0;
    let plaintextLength = 0;
    hmac.update(keys.iv);
    sidecar?.push(keys.iv);
    const consumeCiphertext = async (raw) => {
        if (raw.byteLength === 0)
            return;
        const bytes = toBytesView(raw);
        hmac.update(bytes);
        encHash.update(bytes);
        sidecar?.push(bytes);
        if (ffCollected < ffTarget) {
            const need = ffTarget - ffCollected;
            ffChunks.push(bytes.subarray(0, Math.min(need, bytes.byteLength)));
            ffCollected += bytes.byteLength;
        }
        await writeChunkToWritable(output, bytes);
    };
    try {
        for await (const chunk of plaintext) {
            const plainChunk = toChunkBytes(chunk);
            if (plainChunk.byteLength === 0)
                continue;
            plaintextLength += plainChunk.byteLength;
            plainHash.update(plainChunk);
            if (scanner !== null && scanner.verdict === null) {
                scanner.push(plainChunk);
                if (scanner.verdict === false)
                    sidecar = null;
            }
            await consumeCiphertext(cipher.update(plainChunk));
        }
        await consumeCiphertext(cipher.final());
        const signature = toBytesView(hmac.digest().subarray(0, HMAC_TRUNCATED_SIZE));
        encHash.update(signature);
        sidecar?.push(signature);
        await writeChunkToWritable(output, signature);
        await endWritable(output);
        let firstFrameSidecar;
        if (ffTarget > 0) {
            const ffDigest = hmacSha256Sign(keys.macKey, ffChunks);
            firstFrameSidecar = ffDigest.subarray(0, SIDECAR_HMAC_SIZE);
        }
        return {
            fileSha256: toBytesView(plainHash.digest()),
            fileEncSha256: toBytesView(encHash.digest()),
            plaintextLength,
            streamingSidecar: sidecar?.finish(),
            firstFrameSidecar
        };
    }
    catch (error) {
        const normalized = toError(error);
        output.destroy(normalized);
        throw normalized;
    }
}
async function writeChunkToWritable(stream, chunk) {
    if (chunk.byteLength === 0) {
        return;
    }
    if (stream.write(chunk)) {
        return;
    }
    await new Promise((resolve, reject) => {
        const onDrain = () => {
            stream.off('error', onError);
            resolve();
        };
        const onError = (err) => {
            stream.off('drain', onDrain);
            reject(err);
        };
        stream.once('drain', onDrain);
        stream.once('error', onError);
    });
}
async function endWritable(stream) {
    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.end(() => resolve());
    });
}
async function pumpDecryption(encrypted, plaintext, keys, options) {
    const decipher = createDecipheriv('aes-256-cbc', keys.encKey, keys.iv);
    const plainHash = createHash('sha256');
    const encHash = createHash('sha256');
    const hmac = createHmac('sha256', keys.macKey);
    const trailingScratch = new Uint8Array(HMAC_TRUNCATED_SIZE);
    let trailingLength = 0;
    const consumeCiphertext = async (part) => {
        hmac.update(part);
        const dec = decipher.update(part);
        if (dec.byteLength > 0) {
            const decBytes = toBytesView(dec);
            plainHash.update(decBytes);
            await writeChunkToWritable(plaintext, decBytes);
        }
    };
    hmac.update(keys.iv);
    try {
        for await (const chunk of encrypted) {
            const bytes = toChunkBytes(chunk);
            if (bytes.byteLength === 0) {
                continue;
            }
            encHash.update(bytes);
            const total = trailingLength + bytes.byteLength;
            if (total <= HMAC_TRUNCATED_SIZE) {
                trailingScratch.set(bytes, trailingLength);
                trailingLength = total;
                continue;
            }
            const cipherLength = total - HMAC_TRUNCATED_SIZE;
            const fromTrailing = Math.min(trailingLength, cipherLength);
            if (fromTrailing > 0) {
                await consumeCiphertext(trailingScratch.subarray(0, fromTrailing));
            }
            const fromBytes = cipherLength - fromTrailing;
            if (fromBytes > 0) {
                await consumeCiphertext(bytes.subarray(0, fromBytes));
            }
            const keepFromTrailing = trailingLength - fromTrailing;
            if (keepFromTrailing > 0) {
                trailingScratch.copyWithin(0, fromTrailing, trailingLength);
            }
            trailingScratch.set(bytes.subarray(fromBytes), keepFromTrailing);
            trailingLength = HMAC_TRUNCATED_SIZE;
        }
        if (trailingLength !== HMAC_TRUNCATED_SIZE) {
            throw new Error(`ciphertext too short: ${trailingLength}`);
        }
        if (!options.skipMacVerification) {
            const signature = hmac.digest().subarray(0, HMAC_TRUNCATED_SIZE);
            if (!uint8TimingSafeEqual(signature, trailingScratch)) {
                throw new Error('media MAC mismatch');
            }
        }
        const finalDec = decipher.final();
        if (finalDec.byteLength > 0) {
            const bytes = toBytesView(finalDec);
            plainHash.update(bytes);
            await writeChunkToWritable(plaintext, bytes);
        }
        const fileSha256 = toBytesView(plainHash.digest());
        const fileEncSha256 = toBytesView(encHash.digest());
        if (options.expectedFileEncSha256 &&
            !uint8TimingSafeEqual(fileEncSha256, options.expectedFileEncSha256)) {
            throw new Error('encrypted file hash mismatch');
        }
        if (options.expectedFileSha256 &&
            !uint8TimingSafeEqual(fileSha256, options.expectedFileSha256)) {
            throw new Error('plaintext file hash mismatch');
        }
        plaintext.end();
        return { fileSha256, fileEncSha256 };
    }
    catch (error) {
        const normalized = toError(error);
        plaintext.destroy(normalized);
        throw normalized;
    }
}
function mediaTypeToHkdfInfo(mediaType) {
    if (mediaType === 'ptv') {
        return getWaMediaHkdfInfo('video');
    }
    if (mediaType === 'history') {
        return getWaMediaHkdfInfo(WA_APP_STATE_KEY_TYPES.MD_MSG_HIST);
    }
    return getWaMediaHkdfInfo(mediaType);
}
