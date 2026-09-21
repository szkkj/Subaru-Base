import { SharedExclusiveGate } from '../../infra/perf/SharedExclusiveGate.js';
export function withIdentityLock(store) {
    const gate = new SharedExclusiveGate();
    const destroyStore = store;
    return {
        getRemoteIdentity: (address) => gate.runShared(() => store.getRemoteIdentity(address)),
        getRemoteIdentities: (addresses) => gate.runShared(() => store.getRemoteIdentities(addresses)),
        setRemoteIdentity: (address, identityKey) => gate.runShared(() => store.setRemoteIdentity(address, identityKey)),
        setRemoteIdentities: (entries) => gate.runShared(() => store.setRemoteIdentities(entries)),
        clear: () => gate.runExclusive(() => store.clear()),
        destroy: async () => {
            await gate.close();
            await destroyStore.destroy?.();
        }
    };
}
