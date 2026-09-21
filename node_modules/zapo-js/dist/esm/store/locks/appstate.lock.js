import { SharedExclusiveGate } from '../../infra/perf/SharedExclusiveGate.js';
import { StoreLock } from '../../infra/perf/StoreLock.js';
import { bytesToHex } from '../../util/bytes.js';
const WA_APPSTATE_CLEAR_KEY = 'appstate:clear';
export function withAppStateLock(store) {
    const lock = new StoreLock();
    const gate = new SharedExclusiveGate();
    const destroyStore = store;
    return {
        exportData: () => gate.runShared(() => store.exportData()),
        upsertSyncKeys: (keys) => gate.runShared(() => lock.runMany(keys.map((key) => `appstate:syncKey:${bytesToHex(key.keyId)}`), () => store.upsertSyncKeys(keys))),
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
