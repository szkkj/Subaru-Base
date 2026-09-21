import { sha256, toRawPubKey } from '../../crypto/index.js';
import { parseSignalAddressFromJid } from '../../protocol/jid.js';
const ICDC_DEFAULT_HASH_LENGTH = 8;
const ICDC_FRESHNESS_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
const DEVICE_LIST_METADATA_VERSION = 2;
export function computeDeviceKeyHash(identityKeys, hashLength) {
    const length = hashLength ?? ICDC_DEFAULT_HASH_LENGTH;
    if (identityKeys.length === 0) {
        return new Uint8Array(length);
    }
    const rawKeys = new Array(identityKeys.length);
    for (let i = 0; i < identityKeys.length; i += 1) {
        rawKeys[i] =
            identityKeys[i].byteLength === 33 ? toRawPubKey(identityKeys[i]) : identityKeys[i];
    }
    const hash = sha256(rawKeys);
    return hash.subarray(0, length);
}
export async function resolveIcdcMeta(deviceJids, identityStore, updatedAtMs, localIdentity, hashLength) {
    if (deviceJids.length === 0) {
        return null;
    }
    const addresses = new Array(deviceJids.length);
    for (let i = 0; i < deviceJids.length; i += 1) {
        addresses[i] = parseSignalAddressFromJid(deviceJids[i]);
    }
    const remoteKeys = await identityStore.getRemoteIdentities(addresses);
    const keys = [];
    for (let i = 0; i < addresses.length; i += 1) {
        const key = remoteKeys[i];
        if (key) {
            keys.push(key);
        }
        else if (localIdentity &&
            addresses[i].user === localIdentity.address.user &&
            addresses[i].device === localIdentity.address.device) {
            keys.push(localIdentity.pubKey);
        }
    }
    if (keys.length === 0) {
        return null;
    }
    const keyHash = computeDeviceKeyHash(keys, hashLength);
    const timestamp = updatedAtMs !== undefined && Date.now() - updatedAtMs < ICDC_FRESHNESS_THRESHOLD_MS
        ? Math.floor(updatedAtMs / 1000)
        : undefined;
    return { keyHash, timestamp };
}
export function injectDeviceListMetadata(message, senderIcdc, recipientIcdc) {
    if (!senderIcdc && !recipientIcdc) {
        return message;
    }
    const deviceListMetadata = {};
    if (senderIcdc) {
        deviceListMetadata.senderKeyHash = senderIcdc.keyHash;
        if (senderIcdc.timestamp !== undefined) {
            deviceListMetadata.senderTimestamp = senderIcdc.timestamp;
        }
    }
    if (recipientIcdc) {
        deviceListMetadata.recipientKeyHash = recipientIcdc.keyHash;
        if (recipientIcdc.timestamp !== undefined) {
            deviceListMetadata.recipientTimestamp = recipientIcdc.timestamp;
        }
    }
    return {
        ...message,
        messageContextInfo: {
            ...message.messageContextInfo,
            deviceListMetadata,
            deviceListMetadataVersion: DEVICE_LIST_METADATA_VERSION
        }
    };
}
