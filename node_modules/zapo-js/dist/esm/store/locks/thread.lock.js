import { SharedExclusiveGate } from '../../infra/perf/SharedExclusiveGate.js';
import { StoreLock } from '../../infra/perf/StoreLock.js';
const WA_THREAD_CLEAR_KEY = 'thread:clear';
export function withThreadLock(store) {
    const lock = new StoreLock();
    const gate = new SharedExclusiveGate();
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
