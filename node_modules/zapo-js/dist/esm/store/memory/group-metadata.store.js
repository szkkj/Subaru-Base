import { resolvePositive } from '../../util/coercion.js';
import { createPeriodicCleanup, setBoundedMapEntry } from '../../util/collections.js';
const DEFAULTS = Object.freeze({
    ttlMs: 5 * 60 * 1000,
    maxGroups: 4096
});
export class WaGroupMetadataMemoryStore {
    constructor(ttlMs = DEFAULTS.ttlMs, options = {}) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('groupMetadata ttlMs must be a positive finite number');
        }
        this.records = new Map();
        this.ttlMs = ttlMs;
        this.maxGroups = resolvePositive(options.maxGroups, DEFAULTS.maxGroups, 'WaGroupMetadataMemoryStoreOptions.maxGroups');
        this.logger = options.logger;
        this.capacityWarned = false;
        this.cleanup = createPeriodicCleanup(ttlMs, () => {
            void this.cleanupExpired(Date.now());
        });
    }
    warnCapacity() {
        if (this.capacityWarned || !this.logger)
            return;
        this.capacityWarned = true;
        this.logger.warn('group metadata store at capacity, evicting oldest', {
            max: this.maxGroups
        });
    }
    async upsertGroupMetadata(snapshot) {
        setBoundedMapEntry(this.records, snapshot.groupJid, {
            ...snapshot,
            expiresAtMs: snapshot.updatedAtMs + this.ttlMs
        }, this.maxGroups, () => this.warnCapacity());
    }
    async getGroupMetadata(groupJid, nowMs = Date.now()) {
        const record = this.records.get(groupJid);
        if (!record) {
            return null;
        }
        if (record.expiresAtMs <= nowMs) {
            this.records.delete(groupJid);
            return null;
        }
        return record;
    }
    async deleteGroupMetadata(groupJid) {
        return this.records.delete(groupJid) ? 1 : 0;
    }
    async cleanupExpired(nowMs) {
        let removed = 0;
        for (const [groupJid, record] of this.records) {
            if (record.expiresAtMs > nowMs)
                continue;
            this.records.delete(groupJid);
            removed += 1;
        }
        return removed;
    }
    async clear() {
        this.records.clear();
    }
    async destroy() {
        this.cleanup.destroy();
        await this.clear();
    }
}
