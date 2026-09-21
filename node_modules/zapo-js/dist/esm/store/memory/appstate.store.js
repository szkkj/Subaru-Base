import { APP_STATE_EMPTY_LT_HASH } from '../../appstate/constants.js';
import { pickActiveSyncKey } from '../../appstate/utils.js';
import { bytesToHex, uint8Equal } from '../../util/bytes.js';
import { resolvePositive } from '../../util/coercion.js';
import { setBoundedMapEntry } from '../../util/collections.js';
const DEFAULT_APPSTATE_MEMORY_STORE_LIMITS = Object.freeze({
    syncKeys: 4096,
    collectionEntries: 50000
});
export class WaAppStateMemoryStore {
    constructor(initial, options = {}) {
        this.keys = new Map();
        this.collections = new Map();
        this.maxSyncKeys = resolvePositive(options.maxSyncKeys, DEFAULT_APPSTATE_MEMORY_STORE_LIMITS.syncKeys, 'WaAppStateMemoryStoreOptions.maxSyncKeys');
        this.maxCollectionEntries = resolvePositive(options.maxCollectionEntries, DEFAULT_APPSTATE_MEMORY_STORE_LIMITS.collectionEntries, 'WaAppStateMemoryStoreOptions.maxCollectionEntries');
        if (initial) {
            for (const key of initial.keys) {
                setBoundedMapEntry(this.keys, bytesToHex(key.keyId), key, this.maxSyncKeys);
            }
            for (const [collectionName, collection] of Object.entries(initial.collections)) {
                if (!collection) {
                    continue;
                }
                const indexValueMap = new Map();
                for (const [key, value] of Object.entries(collection.indexValueMap)) {
                    setBoundedMapEntry(indexValueMap, key, value, this.maxCollectionEntries);
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
            const keyHex = bytesToHex(key.keyId);
            const existing = this.keys.get(keyHex);
            if (existing && uint8Equal(existing.keyData, key.keyData)) {
                continue;
            }
            setBoundedMapEntry(this.keys, keyHex, key, this.maxSyncKeys);
            inserted += 1;
        }
        return inserted;
    }
    async getSyncKeysBatch(keyIds) {
        const keys = new Array(keyIds.length);
        for (let index = 0; index < keyIds.length; index += 1) {
            keys[index] = this.keys.get(bytesToHex(keyIds[index])) ?? null;
        }
        return keys;
    }
    async getSyncKeyData(keyId) {
        return this.keys.get(bytesToHex(keyId))?.keyData ?? null;
    }
    async getSyncKeyDataBatch(keyIds) {
        const keys = new Array(keyIds.length);
        for (let index = 0; index < keyIds.length; index += 1) {
            keys[index] = this.keys.get(bytesToHex(keyIds[index]))?.keyData ?? null;
        }
        return keys;
    }
    async getActiveSyncKey() {
        return pickActiveSyncKey(this.keys.values());
    }
    async getCollectionState(collection) {
        let state = this.collections.get(collection);
        if (!state) {
            state = {
                initialized: false,
                version: 0,
                hash: APP_STATE_EMPTY_LT_HASH,
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
                setBoundedMapEntry(indexValueMap, key, value, this.maxCollectionEntries);
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
