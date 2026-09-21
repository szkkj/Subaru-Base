import { WA_APP_STATE_COLLECTIONS, WA_APP_STATE_KEY_TYPES } from '../protocol/constants.js';
import { decodeProtoBytes } from '../util/bytes.js';
const APP_STATE_COLLECTION_NAMES = new Set(Object.values(WA_APP_STATE_COLLECTIONS));
/**
 * Returns `value` typed as a known {@link AppStateCollectionName}, or `null`
 * when the string is unrecognized.
 */
export function parseCollectionName(value) {
    return value && APP_STATE_COLLECTION_NAMES.has(value) ? value : null;
}
function keyDeviceId(keyId) {
    return keyId.byteLength < 6 ? null : (keyId[0] << 8) | keyId[1];
}
/**
 * Reads the 32-bit big-endian epoch encoded in bytes 2..5 of an app-state key id.
 * Returns `-1` when the key id is too short.
 */
export function keyEpoch(keyId) {
    return keyId.byteLength < 6
        ? -1
        : keyId[2] * 16777216 + keyId[3] * 65536 + keyId[4] * 256 + keyId[5];
}
/**
 * Picks the highest-epoch app-state sync key from `keys`. Ties are broken by
 * the lower device id. Returns `null` when the iterable is empty.
 */
export function pickActiveSyncKey(keys) {
    let active = null;
    for (const key of keys) {
        if (!active) {
            active = key;
            continue;
        }
        const currentEpoch = keyEpoch(active.keyId);
        const nextEpoch = keyEpoch(key.keyId);
        if (nextEpoch > currentEpoch) {
            active = key;
            continue;
        }
        if (nextEpoch < currentEpoch) {
            continue;
        }
        const nextDeviceId = keyDeviceId(key.keyId);
        const currentDeviceId = keyDeviceId(active.keyId);
        if (nextDeviceId !== null && currentDeviceId !== null && nextDeviceId < currentDeviceId) {
            active = key;
        }
    }
    return active;
}
/**
 * Downloads and decrypts an external app-state blob via the media transfer
 * client. Throws when the reference is missing required fields.
 */
export async function downloadExternalBlobReference(mediaTransfer, reference) {
    if (!reference.directPath) {
        throw new Error('external blob reference is missing directPath');
    }
    const mediaKey = decodeProtoBytes(reference.mediaKey, 'external blob mediaKey');
    const fileSha256 = decodeProtoBytes(reference.fileSha256, 'external blob fileSha256');
    const fileEncSha256 = decodeProtoBytes(reference.fileEncSha256, 'external blob fileEncSha256');
    return mediaTransfer.downloadAndDecrypt({
        directPath: reference.directPath,
        mediaType: WA_APP_STATE_KEY_TYPES.MD_APP_STATE,
        mediaKey,
        fileSha256,
        fileEncSha256
    });
}
