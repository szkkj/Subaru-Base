"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppStateSyncKeyProtocol = createAppStateSyncKeyProtocol;
const _proto_1 = require("../../proto");
const jid_1 = require("../../protocol/jid");
const bytes_1 = require("../../util/bytes");
/**
 * Valid app-state sync key ids are exactly 6 bytes: a 2-byte device id followed
 * by a 4-byte big-endian epoch (matching the phone primary's `crypto_info`
 * (device_id, epoch) schema and WhatsApp Web's `handleAppStateSyncKeyShare`,
 * which fatally rejects any share whose keyId byte length is not 6). A primary
 * must never emit a malformed key, so legacy/short key ids are dropped from
 * outgoing shares rather than poisoning the peer's syncd engine.
 */
const APP_STATE_SYNC_KEY_ID_LENGTH = 6;
function createAppStateSyncKeyProtocol(options) {
    const { publishProtocolMessageToDevice, fanoutResolver, getCurrentCredentials, logger } = options;
    const requireCurrentIdentity = (context) => {
        const credentials = getCurrentCredentials();
        if (credentials?.meJid || credentials?.meLid) {
            return;
        }
        throw new Error(`${context} requires registered identity`);
    };
    const requestKeys = async (keyIds) => {
        requireCurrentIdentity('requestKeys');
        const normalizedKeyIds = [];
        const seenKeyIds = new Set();
        for (const keyId of keyIds) {
            if (keyId.byteLength === 0) {
                continue;
            }
            const keyHex = (0, bytes_1.bytesToHex)(keyId);
            if (seenKeyIds.has(keyHex)) {
                continue;
            }
            seenKeyIds.add(keyHex);
            normalizedKeyIds.push(keyId);
        }
        if (normalizedKeyIds.length === 0) {
            return [];
        }
        const peerDeviceJids = await fanoutResolver.resolveOwnPeerDeviceJids();
        if (peerDeviceJids.length === 0) {
            logger.warn('app-state sync key request skipped: no peer devices available', {
                keys: normalizedKeyIds.length
            });
            return [];
        }
        const protocolMessage = {
            type: _proto_1.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_REQUEST,
            appStateSyncKeyRequest: {
                keyIds: normalizedKeyIds.map((keyId) => ({
                    keyId
                }))
            }
        };
        const publishResults = await Promise.allSettled(peerDeviceJids.map((deviceJid) => publishProtocolMessageToDevice(deviceJid, protocolMessage)));
        const failedPublishes = publishResults.filter((result) => result.status === 'rejected').length;
        if (failedPublishes > 0) {
            logger.warn('some app-state sync key requests failed', {
                total: peerDeviceJids.length,
                failed: failedPublishes
            });
        }
        logger.info('app-state sync key request sent to peer devices', {
            devices: peerDeviceJids.length,
            keys: normalizedKeyIds.length,
            keyIds: normalizedKeyIds.map((keyId) => (0, bytes_1.bytesToHex)(keyId)).join(',')
        });
        return peerDeviceJids;
    };
    const sendKeyShare = async (toDeviceJid, keys, missingKeyIds = []) => {
        requireCurrentIdentity('sendKeyShare');
        const normalizedTo = (0, jid_1.normalizeDeviceJid)(toDeviceJid);
        const seenKeyIds = new Set();
        const keyShareEntries = [];
        let sharedKeyCount = 0;
        const droppedKeyIds = [];
        for (const key of keys) {
            if (key.keyId.byteLength !== APP_STATE_SYNC_KEY_ID_LENGTH) {
                droppedKeyIds.push((0, bytes_1.bytesToHex)(key.keyId));
                continue;
            }
            const keyHex = (0, bytes_1.bytesToHex)(key.keyId);
            if (seenKeyIds.has(keyHex)) {
                continue;
            }
            seenKeyIds.add(keyHex);
            sharedKeyCount += 1;
            keyShareEntries.push({
                keyId: { keyId: key.keyId },
                keyData: {
                    keyData: key.keyData,
                    timestamp: key.timestamp,
                    ...(key.fingerprint ? { fingerprint: key.fingerprint } : {})
                }
            });
        }
        for (const keyId of missingKeyIds) {
            if (keyId.byteLength !== APP_STATE_SYNC_KEY_ID_LENGTH) {
                if (keyId.byteLength > 0) {
                    droppedKeyIds.push((0, bytes_1.bytesToHex)(keyId));
                }
                continue;
            }
            const keyHex = (0, bytes_1.bytesToHex)(keyId);
            if (seenKeyIds.has(keyHex)) {
                continue;
            }
            seenKeyIds.add(keyHex);
            keyShareEntries.push({
                keyId: { keyId }
            });
        }
        if (droppedKeyIds.length > 0) {
            logger.warn('app-state refusing to share malformed sync keys: keyId byte length must be 6', {
                droppedCount: droppedKeyIds.length,
                totalExpected: keys.length + missingKeyIds.length,
                sample: droppedKeyIds.slice(0, 5)
            });
        }
        const protocolMessage = {
            type: _proto_1.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE,
            appStateSyncKeyShare: {
                keys: keyShareEntries
            }
        };
        await publishProtocolMessageToDevice(normalizedTo, protocolMessage);
        logger.info('app-state sync key share sent', {
            to: normalizedTo,
            keys: sharedKeyCount,
            orphanKeys: keyShareEntries.length - sharedKeyCount
        });
    };
    return {
        requestKeys,
        sendKeyShare
    };
}
