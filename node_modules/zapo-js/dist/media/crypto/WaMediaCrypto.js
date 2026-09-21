"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaMediaCrypto = void 0;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_stream_1 = require("node:stream");
const hkdf_1 = require("../../crypto/core/hkdf");
const primitives_1 = require("../../crypto/core/primitives");
const random_1 = require("../../crypto/core/random");
const constants_1 = require("../constants");
const container_1 = require("../container");
const constants_2 = require("../../protocol/constants");
const bytes_1 = require("../../util/bytes");
const primitives_2 = require("../../util/primitives");
const AES_BLOCK_SIZE = 16;
function computeFirstFrameSidecar(macKey, iv, ciphertext, firstFrameLength) {
    const aligned = Math.ceil(firstFrameLength / AES_BLOCK_SIZE) * AES_BLOCK_SIZE;
    const digest = (0, primitives_1.hmacSha256Sign)(macKey, [iv, ciphertext.subarray(0, aligned)]);
    return digest.subarray(0, constants_1.SIDECAR_HMAC_SIZE);
}
class SidecarAccumulator {
    constructor(macKey, estimatedSize = 0) {
        this.resultOffset = 0;
        this.totalPushed = 0;
        this.windowOffset = 0;
        this.nextChunkStart = 0;
        this.macKey = macKey;
        this.window = new Uint8Array(constants_1.IV_SIZE + constants_1.SIDECAR_CHUNK_SIZE);
        const safeEstimate = Number.isFinite(estimatedSize) && estimatedSize > 0 ? estimatedSize : 0;
        const estimated = Math.max(Math.ceil(safeEstimate / constants_1.SIDECAR_CHUNK_SIZE) + 1, 16);
        this.result = new Uint8Array(estimated * constants_1.SIDECAR_HMAC_SIZE);
    }
    push(data) {
        let srcOffset = 0;
        while (srcOffset < data.byteLength) {
            const windowEnd = this.nextChunkStart + constants_1.IV_SIZE + constants_1.SIDECAR_CHUNK_SIZE;
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
        const digest = (0, node_crypto_1.createHmac)('sha256', this.macKey)
            .update(this.window.subarray(0, this.windowOffset))
            .digest();
        if (this.resultOffset + constants_1.SIDECAR_HMAC_SIZE > this.result.byteLength) {
            const grown = new Uint8Array(this.result.byteLength * 2);
            grown.set(this.result);
            this.result = grown;
        }
        this.result.set(digest.subarray(0, constants_1.SIDECAR_HMAC_SIZE), this.resultOffset);
        this.resultOffset += constants_1.SIDECAR_HMAC_SIZE;
        this.nextChunkStart += constants_1.SIDECAR_CHUNK_SIZE;
        const overlapSrc = this.window.subarray(this.windowOffset - constants_1.IV_SIZE, this.windowOffset);
        this.window.set(overlapSrc, 0);
        this.windowOffset = constants_1.IV_SIZE;
    }
}
/**
 * WhatsApp media payload encryption/decryption (AES-256-CBC + HMAC-SHA-256 +
 * SHA-256 hashes + streaming sidecar). Buffer-only and streaming variants are
 * provided for upload, download, and disk-staged encryption.
 */
class WaMediaCrypto {
    /** Generates a fresh 32-byte media key suitable for {@link deriveKeys}. */
    static async generateMediaKey() {
        return (0, random_1.randomBytesAsync)(32);
    }
    /**
     * Derives the per-type AES IV, AES key, and MAC key from `mediaKey` using
     * HKDF with the {@link getWaMediaHkdfInfo} context.
     */
    static deriveKeys(mediaType, mediaKey) {
        (0, bytes_1.assertByteLength)(mediaKey, 32, `invalid media key length ${mediaKey.byteLength}, expected 32`);
        const info = mediaTypeToHkdfInfo(mediaType);
        const expanded = (0, hkdf_1.hkdf)(mediaKey, null, info, constants_1.MEDIA_HKDF_SIZE);
        return {
            iv: expanded.subarray(0, constants_1.IV_SIZE),
            encKey: expanded.subarray(constants_1.ENC_KEY_START, constants_1.ENC_KEY_END),
            macKey: expanded.subarray(constants_1.MAC_KEY_START, constants_1.MAC_KEY_END)
        };
    }
    /**
     * Encrypts an in-memory buffer with the streaming sidecar (unless disabled)
     * and an optional first-frame sidecar for instant-thumbnail playback.
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    static async encryptBytes(mediaType, mediaKey, plaintext, options) {
        const keys = WaMediaCrypto.deriveKeys(mediaType, mediaKey);
        const ciphertextHmac = (0, primitives_1.aesCbcEncryptWithTrailer)(keys.encKey, keys.iv, plaintext, constants_1.HMAC_TRUNCATED_SIZE);
        const cipherLength = ciphertextHmac.length - constants_1.HMAC_TRUNCATED_SIZE;
        const ciphertext = ciphertextHmac.subarray(0, cipherLength);
        const mac = (0, primitives_1.hmacSha256Sign)(keys.macKey, [keys.iv, ciphertext]);
        const signature = mac.subarray(0, constants_1.HMAC_TRUNCATED_SIZE);
        ciphertextHmac.set(signature, cipherLength);
        let streamingSidecar;
        if (options?.sidecar !== false && (0, container_1.scanStreamable)(plaintext) !== false) {
            const acc = new SidecarAccumulator(keys.macKey, plaintext.byteLength);
            acc.push(keys.iv);
            acc.push(ciphertext);
            acc.push(signature);
            streamingSidecar = acc.finish();
        }
        const firstFrameSidecar = options?.firstFrameLength !== undefined
            ? computeFirstFrameSidecar(keys.macKey, keys.iv, ciphertext, options.firstFrameLength)
            : undefined;
        const fileSha256 = (0, primitives_1.sha256)(plaintext);
        const fileEncSha256 = (0, primitives_1.sha256)(ciphertextHmac);
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
        if (ciphertextHmac.byteLength < constants_1.HMAC_TRUNCATED_SIZE) {
            throw new Error(`ciphertext too short: ${ciphertextHmac.byteLength}`);
        }
        if (expectedFileEncSha256) {
            const computedEncHash = (0, primitives_1.sha256)(ciphertextHmac);
            if (!(0, bytes_1.uint8TimingSafeEqual)(computedEncHash, expectedFileEncSha256)) {
                throw new Error('encrypted file hash mismatch');
            }
        }
        const keys = WaMediaCrypto.deriveKeys(mediaType, mediaKey);
        const ciphertext = ciphertextHmac.subarray(0, ciphertextHmac.byteLength - constants_1.HMAC_TRUNCATED_SIZE);
        const expectedMac = ciphertextHmac.subarray(ciphertextHmac.byteLength - constants_1.HMAC_TRUNCATED_SIZE);
        if (!skipMacVerification) {
            const mac = (0, primitives_1.hmacSha256Sign)(keys.macKey, [keys.iv, ciphertext]);
            const signature = mac.subarray(0, constants_1.HMAC_TRUNCATED_SIZE);
            if (!(0, bytes_1.uint8TimingSafeEqual)(signature, expectedMac)) {
                throw new Error('media MAC mismatch');
            }
        }
        const plaintext = (0, primitives_1.aesCbcDecrypt)(keys.encKey, keys.iv, ciphertext);
        const fileSha256 = (0, primitives_1.sha256)(plaintext);
        if (expectedFileSha256 && !(0, bytes_1.uint8TimingSafeEqual)(fileSha256, expectedFileSha256)) {
            throw new Error('plaintext file hash mismatch');
        }
        const fileEncSha256 = expectedFileEncSha256 ?? (0, primitives_1.sha256)(ciphertextHmac);
        return { plaintext, fileSha256, fileEncSha256 };
    }
    /**
     * Streaming encrypt – returns an `encrypted` Readable plus a `metadata`
     * promise that resolves with hashes/sidecars after the stream ends.
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    static async encryptReadable(mediaType, mediaKey, plaintext, options) {
        const keys = WaMediaCrypto.deriveKeys(mediaType, mediaKey);
        const encrypted = new node_stream_1.PassThrough();
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
        const filePath = (0, node_path_1.join)((0, node_os_1.tmpdir)(), `zapo-enc-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const output = (0, node_fs_1.createWriteStream)(filePath);
        try {
            const metadata = await pumpEncryption(plaintext, output, keys, options?.sidecar !== false, options?.firstFrameLength, options?.expectedFileSize);
            const fileSize = (await (0, promises_1.stat)(filePath)).size;
            return { filePath, fileSize, ...metadata };
        }
        catch (error) {
            await (0, promises_1.unlink)(filePath).catch(() => undefined);
            throw error;
        }
    }
    /** Removes a temporary file produced by {@link encryptToFile}; missing files are ignored. */
    static async cleanupEncryptedFile(filePath) {
        await (0, promises_1.unlink)(filePath).catch(() => undefined);
    }
    /**
     * Streaming decrypt – returns a `plaintext` Readable plus a `metadata`
     * promise that resolves with the verified hashes after the stream ends
     * (or rejects on MAC/hash failure).
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    static async decryptReadable(encrypted, options) {
        const keys = WaMediaCrypto.deriveKeys(options.mediaType, options.mediaKey);
        const plaintext = new node_stream_1.PassThrough();
        const metadata = pumpDecryption(encrypted, plaintext, keys, options);
        return { plaintext, metadata };
    }
    /** Returns the ciphertext byte length (AES-CBC padded + 10-byte MAC) for a given plaintext size. */
    static encryptedLength(plaintextLength) {
        if (!Number.isFinite(plaintextLength) || plaintextLength < 0) {
            throw new Error(`invalid plaintext length ${plaintextLength}`);
        }
        const paddedLength = Math.ceil((plaintextLength + 1) / 16) * 16;
        return paddedLength + constants_1.HMAC_TRUNCATED_SIZE;
    }
}
exports.WaMediaCrypto = WaMediaCrypto;
async function pumpEncryption(plaintext, output, keys, computeSidecar, firstFrameLength, expectedFileSize) {
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-cbc', keys.encKey, keys.iv);
    const plainHash = (0, node_crypto_1.createHash)('sha256');
    const encHash = (0, node_crypto_1.createHash)('sha256');
    const hmac = (0, node_crypto_1.createHmac)('sha256', keys.macKey);
    let sidecar = computeSidecar ? new SidecarAccumulator(keys.macKey, expectedFileSize) : null;
    const scanner = computeSidecar ? new container_1.WaStreamableScanner() : null;
    const ffTarget = firstFrameLength !== undefined
        ? constants_1.IV_SIZE + Math.ceil(firstFrameLength / AES_BLOCK_SIZE) * AES_BLOCK_SIZE
        : 0;
    const ffChunks = ffTarget > 0 ? [keys.iv] : [];
    let ffCollected = ffTarget > 0 ? constants_1.IV_SIZE : 0;
    let plaintextLength = 0;
    hmac.update(keys.iv);
    sidecar?.push(keys.iv);
    const consumeCiphertext = async (raw) => {
        if (raw.byteLength === 0)
            return;
        const bytes = (0, bytes_1.toBytesView)(raw);
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
            const plainChunk = (0, bytes_1.toChunkBytes)(chunk);
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
        const signature = (0, bytes_1.toBytesView)(hmac.digest().subarray(0, constants_1.HMAC_TRUNCATED_SIZE));
        encHash.update(signature);
        sidecar?.push(signature);
        await writeChunkToWritable(output, signature);
        await endWritable(output);
        let firstFrameSidecar;
        if (ffTarget > 0) {
            const ffDigest = (0, primitives_1.hmacSha256Sign)(keys.macKey, ffChunks);
            firstFrameSidecar = ffDigest.subarray(0, constants_1.SIDECAR_HMAC_SIZE);
        }
        return {
            fileSha256: (0, bytes_1.toBytesView)(plainHash.digest()),
            fileEncSha256: (0, bytes_1.toBytesView)(encHash.digest()),
            plaintextLength,
            streamingSidecar: sidecar?.finish(),
            firstFrameSidecar
        };
    }
    catch (error) {
        const normalized = (0, primitives_2.toError)(error);
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
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-cbc', keys.encKey, keys.iv);
    const plainHash = (0, node_crypto_1.createHash)('sha256');
    const encHash = (0, node_crypto_1.createHash)('sha256');
    const hmac = (0, node_crypto_1.createHmac)('sha256', keys.macKey);
    const trailingScratch = new Uint8Array(constants_1.HMAC_TRUNCATED_SIZE);
    let trailingLength = 0;
    const consumeCiphertext = async (part) => {
        hmac.update(part);
        const dec = decipher.update(part);
        if (dec.byteLength > 0) {
            const decBytes = (0, bytes_1.toBytesView)(dec);
            plainHash.update(decBytes);
            await writeChunkToWritable(plaintext, decBytes);
        }
    };
    hmac.update(keys.iv);
    try {
        for await (const chunk of encrypted) {
            const bytes = (0, bytes_1.toChunkBytes)(chunk);
            if (bytes.byteLength === 0) {
                continue;
            }
            encHash.update(bytes);
            const total = trailingLength + bytes.byteLength;
            if (total <= constants_1.HMAC_TRUNCATED_SIZE) {
                trailingScratch.set(bytes, trailingLength);
                trailingLength = total;
                continue;
            }
            const cipherLength = total - constants_1.HMAC_TRUNCATED_SIZE;
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
            trailingLength = constants_1.HMAC_TRUNCATED_SIZE;
        }
        if (trailingLength !== constants_1.HMAC_TRUNCATED_SIZE) {
            throw new Error(`ciphertext too short: ${trailingLength}`);
        }
        if (!options.skipMacVerification) {
            const signature = hmac.digest().subarray(0, constants_1.HMAC_TRUNCATED_SIZE);
            if (!(0, bytes_1.uint8TimingSafeEqual)(signature, trailingScratch)) {
                throw new Error('media MAC mismatch');
            }
        }
        const finalDec = decipher.final();
        if (finalDec.byteLength > 0) {
            const bytes = (0, bytes_1.toBytesView)(finalDec);
            plainHash.update(bytes);
            await writeChunkToWritable(plaintext, bytes);
        }
        const fileSha256 = (0, bytes_1.toBytesView)(plainHash.digest());
        const fileEncSha256 = (0, bytes_1.toBytesView)(encHash.digest());
        if (options.expectedFileEncSha256 &&
            !(0, bytes_1.uint8TimingSafeEqual)(fileEncSha256, options.expectedFileEncSha256)) {
            throw new Error('encrypted file hash mismatch');
        }
        if (options.expectedFileSha256 &&
            !(0, bytes_1.uint8TimingSafeEqual)(fileSha256, options.expectedFileSha256)) {
            throw new Error('plaintext file hash mismatch');
        }
        plaintext.end();
        return { fileSha256, fileEncSha256 };
    }
    catch (error) {
        const normalized = (0, primitives_2.toError)(error);
        plaintext.destroy(normalized);
        throw normalized;
    }
}
function mediaTypeToHkdfInfo(mediaType) {
    if (mediaType === 'ptv') {
        return (0, constants_2.getWaMediaHkdfInfo)('video');
    }
    if (mediaType === 'history') {
        return (0, constants_2.getWaMediaHkdfInfo)(constants_2.WA_APP_STATE_KEY_TYPES.MD_MSG_HIST);
    }
    return (0, constants_2.getWaMediaHkdfInfo)(mediaType);
}
