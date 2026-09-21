"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaThreadMemoryStore = void 0;
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULT_THREAD_MEMORY_STORE_LIMITS = Object.freeze({
    threads: 10000
});
class WaThreadMemoryStore {
    constructor(options = {}) {
        this.threads = new Map();
        this.maxThreads = (0, coercion_1.resolvePositive)(options.maxThreads, DEFAULT_THREAD_MEMORY_STORE_LIMITS.threads, 'WaThreadMemoryStoreOptions.maxThreads');
    }
    async upsert(record) {
        (0, collections_1.setBoundedMapEntry)(this.threads, record.jid, record, this.maxThreads);
    }
    async upsertBatch(records) {
        for (const record of records) {
            (0, collections_1.setBoundedMapEntry)(this.threads, record.jid, record, this.maxThreads);
        }
    }
    async getByJid(jid) {
        return this.threads.get(jid) ?? null;
    }
    async list(limit) {
        const normalizedLimit = (0, collections_1.normalizeQueryLimit)(limit, 100);
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
exports.WaThreadMemoryStore = WaThreadMemoryStore;
