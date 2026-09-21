import { SharedExclusiveGate } from '../../infra/perf/SharedExclusiveGate.js';
import { StoreLock } from '../../infra/perf/StoreLock.js';
const WA_CONTACT_CLEAR_KEY = 'contact:clear';
export function withContactLock(store) {
    const lock = new StoreLock();
    const gate = new SharedExclusiveGate();
    const destroyStore = store;
    return {
        upsert: (record) => gate.runShared(() => lock.run(`contact:${record.jid}`, () => store.upsert(record))),
        upsertBatch: (records) => gate.runShared(() => lock.runMany(records.map((record) => `contact:${record.jid}`), () => store.upsertBatch(records))),
        getByJid: (jid) => gate.runShared(() => store.getByJid(jid)),
        getByPhoneNumber: (pn) => gate.runShared(() => store.getByPhoneNumber(pn)),
        deleteByJid: (jid) => gate.runShared(() => lock.run(`contact:${jid}`, () => store.deleteByJid(jid))),
        clear: () => gate.runExclusive(() => lock.run(WA_CONTACT_CLEAR_KEY, () => store.clear())),
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await destroyStore.destroy?.();
        }
    };
}
