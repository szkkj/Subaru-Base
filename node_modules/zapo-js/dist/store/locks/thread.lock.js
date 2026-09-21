"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withThreadLock = withThreadLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const WA_THREAD_CLEAR_KEY = 'thread:clear';
function withThreadLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    const destroyStore = store;
    return {
        upsert: (record) => gate.runShared(() => lock.run(`thread:${record.jid}`, () => store.upsert(record))),
        upsertBatch: (records) => gate.runShared(() => lock.runMany(records.map((record) => `thread:${record.jid}`), () => store.upsertBatch(records))),
        getByJid: (jid) => gate.runShared(() => store.getByJid(jid)),
        list: (limit) => gate.runShared(() => store.list(limit)),
        deleteByJid: (jid) => gate.runShared(() => lock.run(`thread:${jid}`, () => store.deleteByJid(jid))),
        clear: () => gate.runExclusive(() => lock.run(WA_THREAD_CLEAR_KEY, () => store.clear())),
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await destroyStore.destroy?.();
        }
    };
}
