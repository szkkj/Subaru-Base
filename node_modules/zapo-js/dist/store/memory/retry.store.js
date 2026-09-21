"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaRetryMemoryStore = void 0;
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULTS = Object.freeze({
    ttlMs: 60 * 1000,
    maxOutboundMessages: 10000,
    maxInboundCounters: 20000
});
class WaRetryMemoryStore {
    constructor(ttlMs = DEFAULTS.ttlMs, options = {}) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('retry ttlMs must be a positive finite number');
        }
        this.outboundMessages = new Map();
        this.eligibleSets = new Map();
        this.inboundCounters = new Map();
        this.ttlMs = ttlMs;
        this.maxOutboundMessages = (0, coercion_1.resolvePositive)(options.maxOutboundMessages, DEFAULTS.maxOutboundMessages, 'WaRetryMemoryStoreOptions.maxOutboundMessages');
        this.maxInboundCounters = (0, coercion_1.resolvePositive)(options.maxInboundCounters, DEFAULTS.maxInboundCounters, 'WaRetryMemoryStoreOptions.maxInboundCounters');
        this.logger = options.logger;
        this.outboundCapacityWarned = false;
        this.inboundCapacityWarned = false;
        this.cleanup = (0, collections_1.createPeriodicCleanup)(this.ttlMs, () => {
            void this.cleanupExpired(Date.now());
        });
    }
    warnOutboundCapacity() {
        if (this.outboundCapacityWarned || !this.logger)
            return;
        this.outboundCapacityWarned = true;
        this.logger.warn('retry outbound store at capacity, evicting oldest', {
            max: this.maxOutboundMessages
        });
    }
    warnInboundCapacity() {
        if (this.inboundCapacityWarned || !this.logger)
            return;
        this.inboundCapacityWarned = true;
        this.logger.warn('retry inbound counters at capacity, evicting oldest', {
            max: this.maxInboundCounters
        });
    }
    getTtlMs() {
        return this.ttlMs;
    }
    supportsRawReplayPayload() {
        return true;
    }
    async getOutboundRequesterStatus(messageId, requesterDeviceJid) {
        const current = this.outboundMessages.get(messageId);
        if (!current) {
            return null;
        }
        const eligible = current.eligibleRequesterDeviceJids;
        if (!eligible || eligible.length === 0) {
            return null;
        }
        const eligibleSet = this.eligibleSets.get(current.messageId);
        let isEligible = false;
        if (eligibleSet) {
            isEligible = eligibleSet.has(requesterDeviceJid);
        }
        else {
            for (let index = 0; index < eligible.length; index += 1) {
                if (eligible[index] === requesterDeviceJid) {
                    isEligible = true;
                    break;
                }
            }
        }
        if (!isEligible) {
            return { eligible: false, delivered: false };
        }
        const delivered = current.deliveredRequesterDeviceJids;
        if (!delivered || delivered.length === 0) {
            return { eligible: true, delivered: false };
        }
        for (let index = 0; index < delivered.length; index += 1) {
            if (delivered[index] === requesterDeviceJid) {
                return { eligible: true, delivered: true };
            }
        }
        return { eligible: true, delivered: false };
    }
    async upsertOutboundMessage(record) {
        const storedRecord = {
            ...record,
            eligibleRequesterDeviceJids: record.eligibleRequesterDeviceJids
                ? [...record.eligibleRequesterDeviceJids]
                : undefined,
            deliveredRequesterDeviceJids: record.deliveredRequesterDeviceJids
                ? [...record.deliveredRequesterDeviceJids]
                : undefined
        };
        (0, collections_1.setBoundedMapEntry)(this.outboundMessages, record.messageId, storedRecord, this.maxOutboundMessages, (messageId) => {
            this.eligibleSets.delete(messageId);
            this.warnOutboundCapacity();
        });
        if (record.eligibleRequesterDeviceJids && record.eligibleRequesterDeviceJids.length > 0) {
            this.eligibleSets.set(record.messageId, new Set(record.eligibleRequesterDeviceJids));
        }
        else {
            this.eligibleSets.delete(record.messageId);
        }
    }
    async deleteOutboundMessage(messageId) {
        const existed = this.outboundMessages.delete(messageId);
        this.eligibleSets.delete(messageId);
        return existed ? 1 : 0;
    }
    async getOutboundMessage(messageId) {
        return this.outboundMessages.get(messageId) ?? null;
    }
    async updateOutboundMessageState(messageId, state, updatedAtMs, expiresAtMs) {
        const current = this.outboundMessages.get(messageId);
        if (!current) {
            return;
        }
        (0, collections_1.setBoundedMapEntry)(this.outboundMessages, messageId, {
            ...current,
            state,
            updatedAtMs,
            expiresAtMs
        }, this.maxOutboundMessages, (evictedMessageId) => {
            this.eligibleSets.delete(evictedMessageId);
            this.warnOutboundCapacity();
        });
    }
    async markOutboundRequesterDelivered(messageId, requesterDeviceJid, updatedAtMs, expiresAtMs) {
        const current = this.outboundMessages.get(messageId);
        if (!current) {
            return;
        }
        const delivered = new Set(current.deliveredRequesterDeviceJids ?? []);
        delivered.add(requesterDeviceJid);
        (0, collections_1.setBoundedMapEntry)(this.outboundMessages, messageId, {
            ...current,
            deliveredRequesterDeviceJids: Array.from(delivered),
            updatedAtMs,
            expiresAtMs
        }, this.maxOutboundMessages, (evictedMessageId) => {
            this.eligibleSets.delete(evictedMessageId);
            this.warnOutboundCapacity();
        });
    }
    async incrementInboundCounter(messageId, requesterJid, _updatedAtMs, expiresAtMs) {
        const key = this.counterKey(messageId, requesterJid);
        const current = this.inboundCounters.get(key);
        const count = current ? current.count + 1 : 1;
        (0, collections_1.setBoundedMapEntry)(this.inboundCounters, key, { count, expiresAtMs }, this.maxInboundCounters, () => this.warnInboundCapacity());
        return count;
    }
    async cleanupExpired(nowMs) {
        let removed = 0;
        for (const [messageId, record] of this.outboundMessages) {
            if (record.expiresAtMs > nowMs)
                continue;
            this.outboundMessages.delete(messageId);
            this.eligibleSets.delete(messageId);
            removed += 1;
        }
        for (const [key, record] of this.inboundCounters) {
            if (record.expiresAtMs > nowMs)
                continue;
            this.inboundCounters.delete(key);
            removed += 1;
        }
        return removed;
    }
    async clear() {
        this.outboundMessages.clear();
        this.eligibleSets.clear();
        this.inboundCounters.clear();
    }
    async destroy() {
        this.cleanup.destroy();
        await this.clear();
    }
    counterKey(messageId, requesterJid) {
        return `${messageId}|${requesterJid}`;
    }
}
exports.WaRetryMemoryStore = WaRetryMemoryStore;
