"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaDeviceListMemoryStore = void 0;
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULTS = Object.freeze({
    ttlMs: 5 * 60 * 1000,
    maxUsers: 16384
});
class WaDeviceListMemoryStore {
    constructor(ttlMs = DEFAULTS.ttlMs, options = {}) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('device-list ttlMs must be a positive finite number');
        }
        this.records = new Map();
        this.altIndex = new Map();
        this.ttlMs = ttlMs;
        this.maxUsers = (0, coercion_1.resolvePositive)(options.maxUsers, DEFAULTS.maxUsers, 'WaDeviceListMemoryStoreOptions.maxUsers');
        this.logger = options.logger;
        this.capacityWarned = false;
        this.cleanup = (0, collections_1.createPeriodicCleanup)(ttlMs, () => {
            void this.cleanupExpired(Date.now());
        });
    }
    warnCapacity() {
        if (this.capacityWarned || !this.logger)
            return;
        this.capacityWarned = true;
        this.logger.warn('device list store at capacity, evicting oldest', {
            max: this.maxUsers
        });
    }
    async upsertUserDevicesBatch(snapshots) {
        for (let index = 0; index < snapshots.length; index += 1) {
            const snapshot = snapshots[index];
            const previous = this.records.get(snapshot.userJid);
            if (previous?.altUserJid && previous.altUserJid !== snapshot.altUserJid) {
                this.altIndex.delete(previous.altUserJid);
            }
            (0, collections_1.setBoundedMapEntry)(this.records, snapshot.userJid, {
                ...snapshot,
                expiresAtMs: snapshot.updatedAtMs + this.ttlMs
            }, this.maxUsers, () => this.warnCapacity());
            if (snapshot.altUserJid) {
                this.altIndex.set(snapshot.altUserJid, snapshot.userJid);
            }
        }
    }
    async getUserDevicesBatch(userJids, nowMs = Date.now()) {
        const snapshots = new Array(userJids.length);
        for (let index = 0; index < userJids.length; index += 1) {
            snapshots[index] = this.readLive(userJids[index], nowMs);
        }
        return snapshots;
    }
    async findByAnyUserJid(jid, nowMs = Date.now()) {
        const direct = this.readLive(jid, nowMs);
        if (direct)
            return direct;
        const primary = this.altIndex.get(jid);
        if (!primary)
            return null;
        return this.readLive(primary, nowMs);
    }
    async deleteUserDevices(userJid) {
        const record = this.records.get(userJid);
        if (!record)
            return 0;
        if (record.altUserJid)
            this.altIndex.delete(record.altUserJid);
        this.records.delete(userJid);
        return 1;
    }
    async cleanupExpired(nowMs) {
        let removed = 0;
        for (const [userJid, record] of this.records) {
            if (record.expiresAtMs > nowMs)
                continue;
            if (record.altUserJid)
                this.altIndex.delete(record.altUserJid);
            this.records.delete(userJid);
            removed += 1;
        }
        return removed;
    }
    async clear() {
        this.records.clear();
        this.altIndex.clear();
    }
    async destroy() {
        this.cleanup.destroy();
        await this.clear();
    }
    readLive(userJid, nowMs) {
        const record = this.records.get(userJid);
        if (!record)
            return null;
        if (record.expiresAtMs <= nowMs) {
            if (record.altUserJid)
                this.altIndex.delete(record.altUserJid);
            this.records.delete(userJid);
            return null;
        }
        return record;
    }
}
exports.WaDeviceListMemoryStore = WaDeviceListMemoryStore;
