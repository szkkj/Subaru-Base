"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaPreKeyMemoryStore = void 0;
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULT_MAX_PRE_KEYS = 4096;
class WaPreKeyMemoryStore {
    constructor(options = {}) {
        this.preKeys = new Map();
        this.uploadedPreKeys = new Set();
        this.serverHasPreKeys = false;
        this.nextPreKeyId = 1;
        this.maxPreKeys = (0, coercion_1.resolvePositive)(options.maxPreKeys, DEFAULT_MAX_PRE_KEYS, 'WaPreKeyMemoryStoreOptions.maxPreKeys');
    }
    async putPreKey(record) {
        (0, collections_1.setBoundedMapEntry)(this.preKeys, record.keyId, record, this.maxPreKeys, (keyId) => {
            this.uploadedPreKeys.delete(keyId);
        });
        if (record.keyId >= this.nextPreKeyId) {
            this.nextPreKeyId = record.keyId + 1;
        }
    }
    async getOrGenPreKeys(count, generator) {
        if (!Number.isSafeInteger(count) || count <= 0) {
            throw new Error(`invalid prekey count: ${count}`);
        }
        const available = [];
        const availableKeyIds = [];
        for (const keyId of this.preKeys.keys()) {
            if (!this.uploadedPreKeys.has(keyId)) {
                availableKeyIds.push(keyId);
            }
        }
        availableKeyIds.sort((left, right) => left - right);
        for (let index = 0; index < availableKeyIds.length; index += 1) {
            const keyId = availableKeyIds[index];
            const record = this.preKeys.get(keyId);
            if (!record) {
                continue;
            }
            available.push(record);
            if (available.length >= count) {
                return available;
            }
        }
        while (available.length < count) {
            const record = await generator(this.nextPreKeyId++);
            (0, collections_1.setBoundedMapEntry)(this.preKeys, record.keyId, record, this.maxPreKeys, (keyId) => {
                this.uploadedPreKeys.delete(keyId);
            });
            available.push(record);
        }
        return available;
    }
    async getPreKeyById(keyId) {
        return this.preKeys.get(keyId) ?? null;
    }
    async getPreKeysById(keyIds) {
        const result = new Array(keyIds.length);
        for (let i = 0; i < keyIds.length; i += 1) {
            result[i] = this.preKeys.get(keyIds[i]) ?? null;
        }
        return result;
    }
    async consumePreKeyById(keyId) {
        const record = this.preKeys.get(keyId) ?? null;
        if (!record) {
            return null;
        }
        this.preKeys.delete(keyId);
        this.uploadedPreKeys.delete(keyId);
        return record;
    }
    async getOrGenSinglePreKey(generator) {
        const preKeys = await this.getOrGenPreKeys(1, generator);
        return preKeys[0];
    }
    async markKeyAsUploaded(keyId) {
        if (keyId < 0 || keyId >= this.nextPreKeyId) {
            throw new Error(`prekey ${keyId} is out of boundary`);
        }
        for (const candidate of this.preKeys.keys()) {
            if (candidate <= keyId) {
                this.uploadedPreKeys.add(candidate);
            }
        }
    }
    async setServerHasPreKeys(value) {
        this.serverHasPreKeys = value;
    }
    async getServerHasPreKeys() {
        return this.serverHasPreKeys;
    }
    async clear() {
        this.preKeys.clear();
        this.uploadedPreKeys.clear();
        this.serverHasPreKeys = false;
        this.nextPreKeyId = 1;
    }
}
exports.WaPreKeyMemoryStore = WaPreKeyMemoryStore;
