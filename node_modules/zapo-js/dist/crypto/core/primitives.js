"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha1 = sha1;
exports.sha256 = sha256;
exports.sha512 = sha512;
exports.md5Bytes = md5Bytes;
exports.aesGcmEncrypt = aesGcmEncrypt;
exports.aesGcmDecrypt = aesGcmDecrypt;
exports.aesCbcEncrypt = aesCbcEncrypt;
exports.aesCbcEncryptWithTrailer = aesCbcEncryptWithTrailer;
exports.aesCbcDecrypt = aesCbcDecrypt;
exports.aesCtrEncrypt = aesCtrEncrypt;
exports.aesCtrDecrypt = aesCtrDecrypt;
exports.hmacSha256Sign = hmacSha256Sign;
exports.hmacSha512Sign = hmacSha512Sign;
exports.pbkdf2Sha256 = pbkdf2Sha256;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const bytes_1 = require("../../util/bytes");
const AES_GCM_TAG_LENGTH = 16;
const AES_CBC_BLOCK_SIZE = 16;
/** Bounds the transient buffer `cipher.update` returns per call. */
const AES_CBC_CHUNK_SIZE = 262144;
const pbkdf2Async = (0, node_util_1.promisify)(node_crypto_1.pbkdf2);
function feed(target, input) {
    if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i += 1) {
            target.update(input[i]);
        }
    }
    else {
        target.update(input);
    }
    return target;
}
/** Computes the SHA-1 digest of `value`. Accepts a single chunk or array of chunks. */
function sha1(value) {
    return (0, bytes_1.toBytesView)(feed((0, node_crypto_1.createHash)('sha1'), value).digest());
}
/** Computes the SHA-256 digest of `value`. */
function sha256(value) {
    return (0, bytes_1.toBytesView)(feed((0, node_crypto_1.createHash)('sha256'), value).digest());
}
/** Computes the SHA-512 digest of `value`. */
function sha512(value) {
    return (0, bytes_1.toBytesView)(feed((0, node_crypto_1.createHash)('sha512'), value).digest());
}
/** Computes the MD5 digest of `input`, accepting a string or raw chunks. */
function md5Bytes(input) {
    const hash = (0, node_crypto_1.createHash)('md5');
    if (typeof input === 'string') {
        hash.update(input);
    }
    else {
        feed(hash, input);
    }
    return (0, bytes_1.toBytesView)(hash.digest());
}
/**
 * AES-256-GCM encrypt. The 16-byte auth tag is appended to the ciphertext.
 * Pass `aad` when binding the ciphertext to associated data.
 */
function aesGcmEncrypt(key, nonce, plaintext, aad = bytes_1.EMPTY_BYTES) {
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', key, nonce);
    if (aad.length > 0) {
        cipher.setAAD(aad);
    }
    const head = cipher.update(plaintext);
    const tail = cipher.final();
    const tag = cipher.getAuthTag();
    return (0, bytes_1.concatBytes)([head, tail, tag]);
}
/**
 * AES-256-GCM decrypt. Expects the 16-byte auth tag appended to the
 * ciphertext (matching {@link aesGcmEncrypt}'s layout). Throws on auth failure.
 */
function aesGcmDecrypt(key, nonce, ciphertext, aad = bytes_1.EMPTY_BYTES) {
    const tagOffset = ciphertext.length - AES_GCM_TAG_LENGTH;
    const tag = ciphertext.subarray(tagOffset);
    const ct = ciphertext.subarray(0, tagOffset);
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', key, nonce);
    if (aad.length > 0) {
        decipher.setAAD(aad);
    }
    decipher.setAuthTag(tag);
    const head = decipher.update(ct);
    const tail = decipher.final();
    if (tail.length === 0) {
        return (0, bytes_1.toBytesView)(head);
    }
    return (0, bytes_1.concatBytes)([head, tail]);
}
/** AES-256-CBC encrypt with PKCS#7 padding (default Node behavior). */
function aesCbcEncrypt(key, iv, plaintext) {
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-cbc', key, iv);
    const head = cipher.update(plaintext);
    const tail = cipher.final();
    if (tail.length === 0) {
        return (0, bytes_1.toBytesView)(head);
    }
    return (0, bytes_1.concatBytes)([head, tail]);
}
/**
 * AES-256-CBC encrypt into a buffer that reserves `trailerBytes` of spare room
 * after the ciphertext, for a caller that has to append a MAC to it.
 *
 * Appending to the result of {@link aesCbcEncrypt} means copying the whole
 * ciphertext a second time, which on a media payload is a copy of the entire
 * file to make room for ten bytes. Sizing the destination from the PKCS#7
 * output length up front removes that copy, and feeding the cipher in bounded
 * chunks keeps the transient buffer Node hands back to a chunk rather than a
 * second full-size ciphertext, so peak memory stays near one copy of the
 * payload instead of two.
 *
 * The ciphertext occupies `result.length - trailerBytes`; the reserved tail is
 * left zeroed for the caller to fill.
 *
 * @throws when `trailerBytes` is not a non-negative safe integer, or when the
 * cipher yields a length other than the PKCS#7 size the destination was cut to.
 */
function aesCbcEncryptWithTrailer(key, iv, plaintext, trailerBytes) {
    if (!Number.isSafeInteger(trailerBytes) || trailerBytes < 0) {
        throw new Error(`invalid trailer length ${trailerBytes}`);
    }
    const cipherLength = (Math.floor(plaintext.length / AES_CBC_BLOCK_SIZE) + 1) * AES_CBC_BLOCK_SIZE;
    const out = new Uint8Array(cipherLength + trailerBytes);
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-cbc', key, iv);
    let offset = 0;
    for (let start = 0; start < plaintext.length; start += AES_CBC_CHUNK_SIZE) {
        const end = Math.min(start + AES_CBC_CHUNK_SIZE, plaintext.length);
        const block = cipher.update(plaintext.subarray(start, end));
        if (block.length > 0) {
            out.set(block, offset);
            offset += block.length;
        }
    }
    const tail = cipher.final();
    if (tail.length > 0) {
        out.set(tail, offset);
        offset += tail.length;
    }
    if (offset !== cipherLength) {
        throw new Error(`aes-cbc produced ${offset} bytes, expected ${cipherLength}`);
    }
    return out;
}
/** AES-256-CBC decrypt with PKCS#7 padding. */
function aesCbcDecrypt(key, iv, ciphertext) {
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-cbc', key, iv);
    const head = decipher.update(ciphertext);
    const tail = decipher.final();
    if (tail.length === 0) {
        return (0, bytes_1.toBytesView)(head);
    }
    return (0, bytes_1.concatBytes)([head, tail]);
}
/** AES-256-CTR encrypt with the given 16-byte counter. */
function aesCtrEncrypt(key, counter, plaintext) {
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-ctr', key, counter);
    const head = cipher.update(plaintext);
    const tail = cipher.final();
    if (tail.length === 0) {
        return (0, bytes_1.toBytesView)(head);
    }
    return (0, bytes_1.concatBytes)([head, tail]);
}
/** AES-256-CTR decrypt with the given 16-byte counter. */
function aesCtrDecrypt(key, counter, ciphertext) {
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-ctr', key, counter);
    const head = decipher.update(ciphertext);
    const tail = decipher.final();
    if (tail.length === 0) {
        return (0, bytes_1.toBytesView)(head);
    }
    return (0, bytes_1.concatBytes)([head, tail]);
}
/** Computes the HMAC-SHA-256 MAC of `data` keyed by `key`. */
function hmacSha256Sign(key, data) {
    return (0, bytes_1.toBytesView)(feed((0, node_crypto_1.createHmac)('sha256', key), data).digest());
}
/** Computes the HMAC-SHA-512 MAC of `data` keyed by `key`. */
function hmacSha512Sign(key, data) {
    return (0, bytes_1.toBytesView)(feed((0, node_crypto_1.createHmac)('sha512', key), data).digest());
}
/** PBKDF2 over HMAC-SHA-256 – derives `length` bytes from `password` + `salt`. */
async function pbkdf2Sha256(password, salt, iterations, length) {
    return (0, bytes_1.toBytesView)(await pbkdf2Async(password, salt, iterations, length, 'sha256'));
}
