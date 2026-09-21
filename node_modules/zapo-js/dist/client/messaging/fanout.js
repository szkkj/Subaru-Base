"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeviceFanoutResolver = createDeviceFanoutResolver;
const PromiseDedup_1 = require("../../infra/perf/PromiseDedup");
const jid_1 = require("../../protocol/jid");
const primitives_1 = require("../../util/primitives");
function createDeviceFanoutResolver(options) {
    const { signalDeviceSync, getCurrentCredentials, logger } = options;
    const dedup = new PromiseDedup_1.PromiseDedup();
    const resolveDirectFanoutDeviceJids = async (recipientJid, selfDeviceJidForRecipient) => {
        const recipientUserJid = (0, jid_1.toUserJid)(recipientJid);
        const meUserJid = (0, jid_1.toUserJid)(selfDeviceJidForRecipient);
        const targets = recipientUserJid === meUserJid ? [recipientUserJid] : [recipientUserJid, meUserJid];
        try {
            const synced = await signalDeviceSync.syncDeviceList(targets);
            const byUser = new Map();
            for (let index = 0; index < synced.length; index += 1) {
                const entry = synced[index];
                byUser.set((0, jid_1.toUserJid)(entry.jid), entry.deviceJids);
            }
            const fanout = new Set();
            const recipientDevices = byUser.get(recipientUserJid) ?? [];
            if (recipientDevices.length === 0) {
                fanout.add(recipientUserJid);
            }
            else {
                for (let index = 0; index < recipientDevices.length; index += 1) {
                    fanout.add(recipientDevices[index]);
                }
            }
            const meDevices = byUser.get(meUserJid) ?? [];
            const normalizedMeJid = (0, jid_1.normalizeDeviceJid)(selfDeviceJidForRecipient);
            for (let index = 0; index < meDevices.length; index += 1) {
                const deviceJid = meDevices[index];
                if ((0, jid_1.normalizeDeviceJid)(deviceJid) === normalizedMeJid) {
                    continue;
                }
                fanout.add(deviceJid);
            }
            return [...fanout];
        }
        catch (error) {
            logger.debug('signal device fanout sync failed, falling back to direct recipient', {
                to: recipientJid,
                message: (0, primitives_1.toError)(error).message
            });
            return [recipientUserJid];
        }
    };
    const resolveGroupParticipantDeviceJidsInternal = async (participantUserJids) => {
        const meDeviceJids = new Set();
        const credentials = getCurrentCredentials();
        const meJid = credentials?.meJid;
        if (meJid) {
            try {
                meDeviceJids.add((0, jid_1.normalizeDeviceJid)(meJid));
            }
            catch (error) {
                logger.trace('ignoring malformed me jid', {
                    meJid,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        }
        const meLid = credentials?.meLid;
        if (meLid && meLid.includes('@')) {
            try {
                meDeviceJids.add((0, jid_1.normalizeDeviceJid)(meLid));
            }
            catch (error) {
                logger.trace('ignoring malformed me lid jid', {
                    meLid,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        }
        const candidateUserSet = new Set();
        for (let index = 0; index < participantUserJids.length; index += 1) {
            candidateUserSet.add(participantUserJids[index]);
        }
        const candidateUsers = Array.from(candidateUserSet);
        if (candidateUsers.length === 0) {
            return [];
        }
        try {
            const synced = await signalDeviceSync.syncDeviceList(candidateUsers);
            const fanout = new Set();
            for (const entry of synced) {
                if (entry.deviceJids.length === 0) {
                    const normalizedEntryJid = (0, jid_1.normalizeDeviceJid)(entry.jid);
                    if (meDeviceJids.has(normalizedEntryJid)) {
                        continue;
                    }
                    fanout.add(normalizedEntryJid);
                    continue;
                }
                for (const deviceJid of entry.deviceJids) {
                    const normalizedDeviceJid = (0, jid_1.normalizeDeviceJid)(deviceJid);
                    if (meDeviceJids.has(normalizedDeviceJid)) {
                        continue;
                    }
                    fanout.add(normalizedDeviceJid);
                }
            }
            return [...fanout];
        }
        catch (error) {
            logger.debug('group participant device sync failed, falling back to participant user jids', {
                participants: candidateUsers.length,
                message: (0, primitives_1.toError)(error).message
            });
            const fallbackJids = new Set();
            for (const candidateJid of candidateUsers) {
                try {
                    const normalizedCandidateJid = (0, jid_1.normalizeDeviceJid)(candidateJid);
                    if (meDeviceJids.has(normalizedCandidateJid)) {
                        continue;
                    }
                    fallbackJids.add(normalizedCandidateJid);
                }
                catch (fallbackError) {
                    logger.trace('ignoring malformed participant jid in fallback fanout resolution', {
                        participantJid: candidateJid,
                        message: (0, primitives_1.toError)(fallbackError).message
                    });
                }
            }
            return [...fallbackJids];
        }
    };
    const resolveOwnPeerDeviceJids = async () => {
        const credentials = getCurrentCredentials();
        const meJid = credentials?.meJid;
        if (!meJid) {
            throw new Error('resolveOwnPeerDeviceJids requires registered meJid');
        }
        const meUserJid = (0, jid_1.toUserJid)(meJid);
        const meDevices = new Set();
        meDevices.add((0, jid_1.normalizeDeviceJid)(meJid));
        const meLid = credentials?.meLid;
        if (meLid && meLid.includes('@')) {
            try {
                meDevices.add((0, jid_1.normalizeDeviceJid)(meLid));
            }
            catch (error) {
                logger.trace('ignoring malformed me lid jid while resolving peer devices', {
                    meLid,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        }
        try {
            const synced = await signalDeviceSync.syncDeviceList([meUserJid]);
            const peerDevices = new Set();
            for (const entry of synced) {
                const sourceDevices = entry.deviceJids.length > 0 ? entry.deviceJids : [entry.jid];
                for (const deviceJid of sourceDevices) {
                    try {
                        const normalized = (0, jid_1.normalizeDeviceJid)(deviceJid);
                        if (meDevices.has(normalized)) {
                            continue;
                        }
                        peerDevices.add(normalized);
                    }
                    catch (error) {
                        logger.trace('ignoring malformed peer device jid while resolving app-state peers', {
                            deviceJid,
                            message: (0, primitives_1.toError)(error).message
                        });
                    }
                }
            }
            return [...peerDevices];
        }
        catch (error) {
            logger.warn('failed to resolve peer devices for app-state key request', {
                message: (0, primitives_1.toError)(error).message
            });
            return [];
        }
    };
    const resolveSelfDeviceJidForRecipient = (recipientJid, meJid, meLid) => {
        if ((0, jid_1.splitJid)(recipientJid).server !== 'lid') {
            return meJid;
        }
        if (!meLid || !meLid.includes('@')) {
            return meJid;
        }
        return meLid;
    };
    const resolveGroupParticipantDeviceJids = (participantUserJids) => dedup.run(`group:${participantUserJids.join(',')}`, () => resolveGroupParticipantDeviceJidsInternal(participantUserJids));
    return {
        resolveDirectFanoutDeviceJids,
        resolveGroupParticipantDeviceJids,
        resolveOwnPeerDeviceJids,
        resolveSelfDeviceJidForRecipient
    };
}
