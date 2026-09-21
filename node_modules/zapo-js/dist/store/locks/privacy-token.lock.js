"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPrivacyTokenLock = withPrivacyTokenLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
function withPrivacyTokenLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    return {
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await store.destroy?.();
        },
        upsert: (record) => gate.runShared(() => lock.run(`pt:${record.jid}`, () => store.upsert(record))),
        upsertBatch: (records) => gate.runExclusive(() => store.upsertBatch(records)),
        getByJid: (jid) => gate.runShared(() => store.getByJid(jid)),
        deleteByJid: (jid) => gate.runShared(() => lock.run(`pt:${jid}`, () => store.deleteByJid(jid))),
        clear: () => gate.runExclusive(() => store.clear())
    };
}
