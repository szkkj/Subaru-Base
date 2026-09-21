"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaMessageMemoryStore = void 0;
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULT_MESSAGE_MEMORY_STORE_LIMITS = Object.freeze({
    messages: 50000
});
class WaMessageMemoryStore {
    constructor(options = {}) {
        this.messages = new Map();
        this.maxMessages = (0, coercion_1.resolvePositive)(options.maxMessages, DEFAULT_MESSAGE_MEMORY_STORE_LIMITS.messages, 'WaMessageMemoryStoreOptions.maxMessages');
    }
    async upsert(record) {
        (0, collections_1.setBoundedMapEntry)(this.messages, record.id, record, this.maxMessages);
    }
    async upsertBatch(records) {
        for (const record of records) {
            (0, collections_1.setBoundedMapEntry)(this.messages, record.id, record, this.maxMessages);
        }
    }
    async getById(id) {
        return this.messages.get(id) ?? null;
    }
    async listByThread(threadJid, limit, beforeTimestampMs) {
        const normalizedLimit = (0, collections_1.normalizeQueryLimit)(limit, 50);
        const records = [];
        for (const record of this.messages.values()) {
            if (record.threadJid !== threadJid)
                continue;
            if (beforeTimestampMs !== undefined &&
                (record.timestampMs === undefined || record.timestampMs >= beforeTimestampMs)) {
                continue;
            }
            records.push(record);
        }
        records.sort((left, right) => (right.timestampMs ?? 0) - (left.timestampMs ?? 0));
        if (records.length > normalizedLimit) {
            records.length = normalizedLimit;
        }
        return records;
    }
    async deleteById(id) {
        return this.messages.delete(id) ? 1 : 0;
    }
    async clear() {
        this.messages.clear();
    }
}
exports.WaMessageMemoryStore = WaMessageMemoryStore;
