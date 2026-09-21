import { resolvePositive } from '../../util/coercion.js';
import { normalizeQueryLimit, setBoundedMapEntry } from '../../util/collections.js';
const DEFAULT_THREAD_MEMORY_STORE_LIMITS = Object.freeze({
    threads: 10000
});
export class WaThreadMemoryStore {
    constructor(options = {}) {
        this.threads = new Map();
        this.maxThreads = resolvePositive(options.maxThreads, DEFAULT_THREAD_MEMORY_STORE_LIMITS.threads, 'WaThreadMemoryStoreOptions.maxThreads');
    }
    async upsert(record) {
        setBoundedMapEntry(this.threads, record.jid, record, this.maxThreads);
    }
    async upsertBatch(records) {
        for (const record of records) {
            setBoundedMapEntry(this.threads, record.jid, record, this.maxThreads);
        }
    }
    async getByJid(jid) {
        return this.threads.get(jid) ?? null;
    }
    async list(limit) {
        const normalizedLimit = normalizeQueryLimit(limit, 100);
        const out = [];
        for (const thread of this.threads.values()) {
            out.push(thread);
            if (out.length >= normalizedLimit) {
                break;
            }
        }
        return out;
    }
    async deleteByJid(jid) {
        return this.threads.delete(jid) ? 1 : 0;
    }
    async clear() {
        this.threads.clear();
    }
}
