"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaChatMetadataMemoryStore = void 0;
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULTS = Object.freeze({
    ttlMs: 30 * 60 * 1000,
    maxChats: 2048
});
class WaChatMetadataMemoryStore {
    constructor(ttlMs = DEFAULTS.ttlMs, options = {}) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('chatMetadata ttlMs must be a positive finite number');
        }
        this.records = new Map();
        this.ttlMs = ttlMs;
        this.maxChats = (0, coercion_1.resolvePositive)(options.maxChats, DEFAULTS.maxChats, 'WaChatMetadataMemoryStoreOptions.maxChats');
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
        this.logger.warn('chat metadata store at capacity, evicting oldest', {
            max: this.maxChats
        });
    }
    async upsertChatMetadata(snapshot) {
        (0, collections_1.setBoundedMapEntry)(this.records, snapshot.chatJid, {
            ...snapshot,
            expiresAtMs: snapshot.updatedAtMs + this.ttlMs
        }, this.maxChats, () => this.warnCapacity());
    }
    async getChatMetadata(chatJid, nowMs = Date.now()) {
        const record = this.records.get(chatJid);
        if (!record) {
            return null;
        }
        if (record.expiresAtMs <= nowMs) {
            this.records.delete(chatJid);
            return null;
        }
        return record;
    }
    async deleteChatMetadata(chatJid) {
        return this.records.delete(chatJid) ? 1 : 0;
    }
    async cleanupExpired(nowMs) {
        let removed = 0;
        for (const [chatJid, record] of this.records) {
            if (record.expiresAtMs > nowMs)
                continue;
            this.records.delete(chatJid);
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
exports.WaChatMetadataMemoryStore = WaChatMetadataMemoryStore;
