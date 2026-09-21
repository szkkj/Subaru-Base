"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaMessageSecretMemoryStore = void 0;
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULTS = Object.freeze({
    ttlMs: 30 * 60 * 1000,
    maxSecrets: 10000
});
class WaMessageSecretMemoryStore {
    constructor(ttlMs = DEFAULTS.ttlMs, options = {}) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('message-secret ttlMs must be a positive finite number');
        }
        this.secrets = new Map();
        this.ttlMs = ttlMs;
        this.maxSecrets = (0, coercion_1.resolvePositive)(options.maxSecrets, DEFAULTS.maxSecrets, 'WaMessageSecretMemoryStoreOptions.maxSecrets');
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
        this.logger.warn('message secret store at capacity, evicting oldest', {
            max: this.maxSecrets
        });
    }
    async get(messageId, nowMs = Date.now()) {
        const cached = this.secrets.get(messageId);
        if (!cached)
            return null;
        if (cached.expiresAtMs <= nowMs) {
            this.secrets.delete(messageId);
            return null;
        }
        return { secret: cached.secret, senderJid: cached.senderJid };
    }
    async getBatch(messageIds, nowMs = Date.now()) {
        const result = new Array(messageIds.length);
        for (let i = 0; i < messageIds.length; i += 1) {
            const cached = this.secrets.get(messageIds[i]);
            if (!cached) {
                result[i] = null;
                continue;
            }
            if (cached.expiresAtMs <= nowMs) {
                this.secrets.delete(messageIds[i]);
                result[i] = null;
                continue;
            }
            result[i] = { secret: cached.secret, senderJid: cached.senderJid };
        }
        return result;
    }
    async set(messageId, entry) {
        (0, collections_1.setBoundedMapEntry)(this.secrets, messageId, {
            secret: entry.secret,
            senderJid: entry.senderJid,
            expiresAtMs: Date.now() + this.ttlMs
        }, this.maxSecrets, () => this.warnCapacity());
    }
    async setBatch(entries) {
        const nowMs = Date.now();
        for (let i = 0; i < entries.length; i += 1) {
            (0, collections_1.setBoundedMapEntry)(this.secrets, entries[i].messageId, {
                secret: entries[i].entry.secret,
                senderJid: entries[i].entry.senderJid,
                expiresAtMs: nowMs + this.ttlMs
            }, this.maxSecrets, () => this.warnCapacity());
        }
    }
    async cleanupExpired(nowMs) {
        let removed = 0;
        for (const [messageId, entry] of this.secrets) {
            if (entry.expiresAtMs > nowMs)
                continue;
            this.secrets.delete(messageId);
            removed += 1;
        }
        return removed;
    }
    async clear() {
        this.secrets.clear();
    }
    async destroy() {
        this.cleanup.destroy();
        this.secrets.clear();
    }
}
exports.WaMessageSecretMemoryStore = WaMessageSecretMemoryStore;
