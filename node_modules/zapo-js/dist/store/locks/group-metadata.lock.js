"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGroupMetadataLock = withGroupMetadataLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const WA_GROUP_METADATA_CLEAR_KEY = 'group-metadata:clear';
const WA_GROUP_METADATA_CLEANUP_KEY = 'group-metadata:cleanup';
function withGroupMetadataLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    return {
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await store.destroy?.();
        },
        upsertGroupMetadata: (snapshot) => gate.runShared(() => lock.run(`group-metadata:group:${snapshot.groupJid}`, () => store.upsertGroupMetadata(snapshot))),
        getGroupMetadata: (groupJid, nowMs) => gate.runShared(() => store.getGroupMetadata(groupJid, nowMs)),
        deleteGroupMetadata: (groupJid) => gate.runShared(() => lock.run(`group-metadata:group:${groupJid}`, () => store.deleteGroupMetadata(groupJid))),
        cleanupExpired: (nowMs) => gate.runExclusive(() => lock.run(WA_GROUP_METADATA_CLEANUP_KEY, () => store.cleanupExpired(nowMs))),
        clear: () => gate.runExclusive(() => lock.run(WA_GROUP_METADATA_CLEAR_KEY, () => store.clear()))
    };
}
