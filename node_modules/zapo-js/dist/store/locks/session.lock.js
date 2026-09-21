"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSessionLock = withSessionLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
function withSessionLock(store) {
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    const destroyStore = store;
    return {
        hasSession: (address) => gate.runShared(() => store.hasSession(address)),
        hasSessions: (addresses) => gate.runShared(() => store.hasSessions(addresses)),
        getSession: (address) => gate.runShared(() => store.getSession(address)),
        getSessionsBatch: (addresses) => gate.runShared(() => store.getSessionsBatch(addresses)),
        setSession: (address, session) => gate.runShared(() => store.setSession(address, session)),
        setSessionsBatch: (entries) => gate.runShared(() => store.setSessionsBatch(entries)),
        deleteSession: (address) => gate.runShared(() => store.deleteSession(address)),
        clear: () => gate.runExclusive(() => store.clear()),
        destroy: async () => {
            await gate.close();
            await destroyStore.destroy?.();
        }
    };
}
