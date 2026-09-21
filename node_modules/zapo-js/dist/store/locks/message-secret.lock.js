"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMessageSecretLock = withMessageSecretLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
function withMessageSecretLock(store) {
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
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
