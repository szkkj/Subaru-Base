"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIdentityLock = withIdentityLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
function withIdentityLock(store) {
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
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
