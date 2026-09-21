"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hkdf = hkdf;
exports.hkdfSplit = hkdfSplit;
const node_crypto_1 = require("node:crypto");
const bytes_1 = require("../../util/bytes");
/**
 * HKDF (HMAC-SHA-256) – derives `outLength` bytes from `ikm` using the given
 * `salt` (empty bytes when `null`) and `info` context.
 */
function hkdf(ikm, salt, info, outLength) {
    return (0, bytes_1.toBytesView)((0, node_crypto_1.hkdfSync)('sha256', ikm, salt ?? bytes_1.EMPTY_BYTES, info, outLength));
}
/**
 * Derives a 64-byte HKDF output and returns it split into two 32-byte halves
 * (Signal/WhatsApp pair-key derivation pattern).
 */
function hkdfSplit(ikm, salt, info) {
    const out = hkdf(ikm, salt, info, 64);
    return [out.subarray(0, 32), out.subarray(32)];
}
