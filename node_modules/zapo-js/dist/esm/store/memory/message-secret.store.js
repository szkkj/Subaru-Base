import { resolvePositive } from '../../util/coercion.js';
import { createPeriodicCleanup, setBoundedMapEntry } from '../../util/collections.js';
const DEFAULTS = Object.freeze({
    ttlMs: 30 * 60 * 1000,
    maxSecrets: 10000
});
export class WaMessageSecretMemoryStore {
    constructor(ttlMs = DEFAULTS.ttlMs, options = {}) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('message-secret ttlMs must be a positive finite number');
        }
        this.secrets = new Map();
        this.ttlMs = ttlMs;
        this.maxSecrets = resolvePositive(options.maxSecrets, DEFAULTS.maxSecrets, 'WaMessageSecretMemoryStoreOptions.maxSecrets');
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
        setBoundedMapEntry(this.secrets, messageId, {
            secret: entry.secret,
            senderJid: entry.senderJid,
            expiresAtMs: Date.now() + this.ttlMs
        }, this.maxSecrets, () => this.warnCapacity());
    }
    async setBatch(entries) {
        const nowMs = Date.now();
        for (let i = 0; i < entries.length; i += 1) {
            setBoundedMapEntry(this.secrets, entries[i].messageId, {
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
