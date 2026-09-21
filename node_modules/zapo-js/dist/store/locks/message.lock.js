"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMessageLock = withMessageLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const WA_MESSAGE_CLEAR_KEY = 'message:clear';
function withMessageLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    const destroyStore = store;
    return {
        upsert: (record) => gate.runShared(() => lock.run(`message:${record.id}`, () => store.upsert(record))),
        upsertBatch: (records) => gate.runShared(() => lock.runMany(records.map((record) => `message:${record.id}`), () => store.upsertBatch(records))),
        getById: (id) => gate.runShared(() => store.getById(id)),
        listByThread: (threadJid, limit, beforeTimestampMs) => gate.runShared(() => store.listByThread(threadJid, limit, beforeTimestampMs)),
        deleteById: (id) => gate.runShared(() => lock.run(`message:${id}`, () => store.deleteById(id))),
        clear: () => gate.runExclusive(() => lock.run(WA_MESSAGE_CLEAR_KEY, () => store.clear())),
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await destroyStore.destroy?.();
        }
    };
}
