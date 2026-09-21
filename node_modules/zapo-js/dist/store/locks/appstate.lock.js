"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAppStateLock = withAppStateLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const bytes_1 = require("../../util/bytes");
const WA_APPSTATE_CLEAR_KEY = 'appstate:clear';
function withAppStateLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    const destroyStore = store;
    return {
        exportData: () => gate.runShared(() => store.exportData()),
        upsertSyncKeys: (keys) => gate.runShared(() => lock.runMany(keys.map((key) => `appstate:syncKey:${(0, bytes_1.bytesToHex)(key.keyId)}`), () => store.upsertSyncKeys(keys))),
        getSyncKeysBatch: (keyIds) => gate.runShared(() => store.getSyncKeysBatch(keyIds)),
        getSyncKeyData: (keyId) => gate.runShared(() => store.getSyncKeyData(keyId)),
        getSyncKeyDataBatch: (keyIds) => gate.runShared(() => store.getSyncKeyDataBatch(keyIds)),
        getActiveSyncKey: () => gate.runShared(() => store.getActiveSyncKey()),
        getCollectionState: (collection) => gate.runShared(() => store.getCollectionState(collection)),
        getCollectionStates: (collections) => gate.runShared(() => store.getCollectionStates(collections)),
        setCollectionStates: (updates) => gate.runShared(() => lock.runMany(updates.map((update) => `appstate:collection:${update.collection}`), () => store.setCollectionStates(updates))),
        clear: () => gate.runExclusive(() => lock.run(WA_APPSTATE_CLEAR_KEY, () => store.clear())),
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await destroyStore.destroy?.();
        }
    };
}
