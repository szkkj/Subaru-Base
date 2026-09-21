"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDeviceListLock = withDeviceListLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const WA_DEVICE_LIST_CLEAR_KEY = 'deviceList:clear';
const WA_DEVICE_LIST_CLEANUP_KEY = 'deviceList:cleanup';
function withDeviceListLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    return {
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await store.destroy?.();
        },
        upsertUserDevicesBatch: (snapshots) => gate.runShared(() => lock.runMany(snapshots.map((snapshot) => `deviceList:user:${snapshot.userJid}`), () => store.upsertUserDevicesBatch(snapshots))),
        getUserDevicesBatch: (userJids, nowMs) => gate.runShared(() => store.getUserDevicesBatch(userJids, nowMs)),
        findByAnyUserJid: (jid, nowMs) => gate.runShared(() => store.findByAnyUserJid(jid, nowMs)),
        deleteUserDevices: (userJid) => gate.runShared(() => lock.run(`deviceList:user:${userJid}`, () => store.deleteUserDevices(userJid))),
        cleanupExpired: (nowMs) => gate.runExclusive(() => lock.run(WA_DEVICE_LIST_CLEANUP_KEY, () => store.cleanupExpired(nowMs))),
        clear: () => gate.runExclusive(() => lock.run(WA_DEVICE_LIST_CLEAR_KEY, () => store.clear()))
    };
}
