import { resolvePositive } from '../../util/coercion.js';
import { normalizeQueryLimit, setBoundedMapEntry } from '../../util/collections.js';
const DEFAULT_MESSAGE_MEMORY_STORE_LIMITS = Object.freeze({
    messages: 50000
});
export class WaMessageMemoryStore {
    constructor(options = {}) {
        this.messages = new Map();
        this.maxMessages = resolvePositive(options.maxMessages, DEFAULT_MESSAGE_MEMORY_STORE_LIMITS.messages, 'WaMessageMemoryStoreOptions.maxMessages');
    }
    async upsert(record) {
        setBoundedMapEntry(this.messages, record.id, record, this.maxMessages);
    }
    async upsertBatch(records) {
        for (const record of records) {
            setBoundedMapEntry(this.messages, record.id, record, this.maxMessages);
        }
    }
    async getById(id) {
        return this.messages.get(id) ?? null;
    }
    async listByThread(threadJid, limit, beforeTimestampMs) {
        const normalizedLimit = normalizeQueryLimit(limit, 50);
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
