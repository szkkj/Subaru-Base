"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaAppStateMemoryStore = void 0;
const constants_1 = require("../../appstate/constants");
const utils_1 = require("../../appstate/utils");
const bytes_1 = require("../../util/bytes");
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const DEFAULT_APPSTATE_MEMORY_STORE_LIMITS = Object.freeze({
    syncKeys: 4096,
    collectionEntries: 50000
});
class WaAppStateMemoryStore {
    constructor(initial, options = {}) {
        this.keys = new Map();
        this.collections = new Map();
        this.maxSyncKeys = (0, coercion_1.resolvePositive)(options.maxSyncKeys, DEFAULT_APPSTATE_MEMORY_STORE_LIMITS.syncKeys, 'WaAppStateMemoryStoreOptions.maxSyncKeys');
        this.maxCollectionEntries = (0, coercion_1.resolvePositive)(options.maxCollectionEntries, DEFAULT_APPSTATE_MEMORY_STORE_LIMITS.collectionEntries, 'WaAppStateMemoryStoreOptions.maxCollectionEntries');
        if (initial) {
            for (const key of initial.keys) {
                (0, collections_1.setBoundedMapEntry)(this.keys, (0, bytes_1.bytesToHex)(key.keyId), key, this.maxSyncKeys);
            }
            for (const [collectionName, collection] of Object.entries(initial.collections)) {
                if (!collection) {
                    continue;
                }
                const indexValueMap = new Map();
                for (const [key, value] of Object.entries(collection.indexValueMap)) {
                    (0, collections_1.setBoundedMapEntry)(indexValueMap, key, value, this.maxCollectionEntries);
                }
                this.collections.set(collectionName, {
                    initialized: true,
                    version: collection.version,
                    hash: collection.hash,
                    indexValueMap
                });
            }
        }
    }
    async exportData() {
        const keys = Array.from(this.keys.values());
        const collections = {};
        for (const [collection, state] of this.collections.entries()) {
            collections[collection] = {
                version: state.version,
                hash: state.hash,
                indexValueMap: Object.fromEntries(state.indexValueMap.entries())
            };
        }
        return {
            keys,
            collections
        };
    }
    async upsertSyncKeys(keys) {
        let inserted = 0;
        for (const key of keys) {
            const keyHex = (0, bytes_1.bytesToHex)(key.keyId);
            const existing = this.keys.get(keyHex);
            if (existing && (0, bytes_1.uint8Equal)(existing.keyData, key.keyData)) {
                continue;
            }
            (0, collections_1.setBoundedMapEntry)(this.keys, keyHex, key, this.maxSyncKeys);
            inserted += 1;
        }
        return inserted;
    }
    async getSyncKeysBatch(keyIds) {
        const keys = new Array(keyIds.length);
        for (let index = 0; index < keyIds.length; index += 1) {
            keys[index] = this.keys.get((0, bytes_1.bytesToHex)(keyIds[index])) ?? null;
        }
        return keys;
    }
    async getSyncKeyData(keyId) {
        return this.keys.get((0, bytes_1.bytesToHex)(keyId))?.keyData ?? null;
    }
    async getSyncKeyDataBatch(keyIds) {
        const keys = new Array(keyIds.length);
        for (let index = 0; index < keyIds.length; index += 1) {
            keys[index] = this.keys.get((0, bytes_1.bytesToHex)(keyIds[index]))?.keyData ?? null;
        }
        return keys;
    }
    async getActiveSyncKey() {
        return (0, utils_1.pickActiveSyncKey)(this.keys.values());
    }
    async getCollectionState(collection) {
        let state = this.collections.get(collection);
        if (!state) {
            state = {
                initialized: false,
                version: 0,
                hash: constants_1.APP_STATE_EMPTY_LT_HASH,
                indexValueMap: new Map()
            };
            this.collections.set(collection, state);
        }
        return state;
    }
    async getCollectionStates(collections) {
        const result = new Array(collections.length);
        for (let index = 0; index < collections.length; index += 1) {
            result[index] = await this.getCollectionState(collections[index]);
        }
        return result;
    }
    async setCollectionStates(updates) {
        for (const update of updates) {
            const indexValueMap = new Map();
            for (const [key, value] of update.indexValueMap.entries()) {
                (0, collections_1.setBoundedMapEntry)(indexValueMap, key, value, this.maxCollectionEntries);
            }
            this.collections.set(update.collection, {
                initialized: true,
                version: update.version,
                hash: update.hash,
                indexValueMap
            });
        }
    }
    async clear() {
        this.keys.clear();
        this.collections.clear();
    }
}
exports.WaAppStateMemoryStore = WaAppStateMemoryStore;
