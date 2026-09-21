"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withContactLock = withContactLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const WA_CONTACT_CLEAR_KEY = 'contact:clear';
function withContactLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
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
