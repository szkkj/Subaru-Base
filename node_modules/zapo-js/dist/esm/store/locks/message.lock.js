import { SharedExclusiveGate } from '../../infra/perf/SharedExclusiveGate.js';
import { StoreLock } from '../../infra/perf/StoreLock.js';
const WA_MESSAGE_CLEAR_KEY = 'message:clear';
export function withMessageLock(store) {
    const lock = new StoreLock();
    const gate = new SharedExclusiveGate();
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
