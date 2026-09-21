"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDeviceKeyHash = computeDeviceKeyHash;
exports.resolveIcdcMeta = resolveIcdcMeta;
exports.injectDeviceListMetadata = injectDeviceListMetadata;
const _crypto_1 = require("../../crypto");
const jid_1 = require("../../protocol/jid");
const ICDC_DEFAULT_HASH_LENGTH = 8;
const ICDC_FRESHNESS_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
const DEVICE_LIST_METADATA_VERSION = 2;
function computeDeviceKeyHash(identityKeys, hashLength) {
    const length = hashLength ?? ICDC_DEFAULT_HASH_LENGTH;
    if (identityKeys.length === 0) {
        return new Uint8Array(length);
    }
    const rawKeys = new Array(identityKeys.length);
    for (let i = 0; i < identityKeys.length; i += 1) {
        rawKeys[i] =
            identityKeys[i].byteLength === 33 ? (0, _crypto_1.toRawPubKey)(identityKeys[i]) : identityKeys[i];
    }
    const hash = (0, _crypto_1.sha256)(rawKeys);
    return hash.subarray(0, length);
}
async function resolveIcdcMeta(deviceJids, identityStore, updatedAtMs, localIdentity, hashLength) {
    if (deviceJids.length === 0) {
        return null;
    }
    const addresses = new Array(deviceJids.length);
    for (let i = 0; i < deviceJids.length; i += 1) {
        addresses[i] = (0, jid_1.parseSignalAddressFromJid)(deviceJids[i]);
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
function injectDeviceListMetadata(message, senderIcdc, recipientIcdc) {
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
