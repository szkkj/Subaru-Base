import { SharedExclusiveGate } from '../../infra/perf/SharedExclusiveGate.js';
export function withMessageSecretLock(store) {
    const gate = new SharedExclusiveGate();
    const destroyStore = store;
    return {
        get: (messageId, nowMs) => gate.runShared(() => store.get(messageId, nowMs)),
        getBatch: (messageIds, nowMs) => gate.runShared(() => store.getBatch(messageIds, nowMs)),
        set: (messageId, entry) => gate.runShared(() => store.set(messageId, entry)),
        setBatch: (entries) => gate.runShared(() => store.setBatch(entries)),
        cleanupExpired: (nowMs) => gate.runExclusive(() => store.cleanupExpired(nowMs)),
        clear: () => gate.runExclusive(() => store.clear()),
        destroy: async () => {
            await gate.close();
            await destroyStore.destroy?.();
        }
    };
}
