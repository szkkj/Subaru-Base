import { randomBytesAsync } from '../../crypto/index.js';
const RANDOM_PAD_MAX_16_MASK = 0x0f;
const PAD_SEED_BATCH_SIZE = 1024;
let padSeedBuffer = null;
let padSeedCursor = 0;
export async function writeRandomPadMax16(message) {
    if (!padSeedBuffer || padSeedCursor >= padSeedBuffer.length) {
        padSeedBuffer = await randomBytesAsync(PAD_SEED_BATCH_SIZE);
        padSeedCursor = 0;
    }
    const padLength = (padSeedBuffer[padSeedCursor++] & RANDOM_PAD_MAX_16_MASK) + 1;
    const out = new Uint8Array(message.length + padLength);
    out.set(message, 0);
    out.fill(padLength, message.length);
    return out;
}
export function unpadPkcs7(bytes) {
    if (bytes.length === 0) {
        throw new Error('unpadPkcs7 given empty bytes');
    }
    const padLength = bytes[bytes.length - 1];
    if (padLength > bytes.length) {
        throw new Error(`unpadPkcs7 given ${bytes.length} bytes, but pad is ${padLength}`);
    }
    return bytes.subarray(0, bytes.length - padLength);
}
