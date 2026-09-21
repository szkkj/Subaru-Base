"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeAppStateFingerprint = encodeAppStateFingerprint;
exports.decodeAppStateFingerprint = decodeAppStateFingerprint;
exports.decodeAppStateSyncKeys = decodeAppStateSyncKeys;
exports.decodeAppStateCollections = decodeAppStateCollections;
const _proto_1 = require("../../proto");
const coercion_1 = require("../../util/coercion");
const primitives_1 = require("../../util/primitives");
/** Serializes an app-state sync key fingerprint to its protobuf bytes, or `null` when absent. */
function encodeAppStateFingerprint(fingerprint) {
    if (!fingerprint) {
        return null;
    }
    return _proto_1.proto.Message.AppStateSyncKeyFingerprint.encode(fingerprint).finish();
}
/** Inverse of {@link encodeAppStateFingerprint}; throws on malformed input. */
function decodeAppStateFingerprint(raw) {
    const bytes = (0, coercion_1.asOptionalBytes)(raw, 'appstate_sync_keys.fingerprint');
    if (!bytes) {
        return undefined;
    }
    try {
        return _proto_1.proto.Message.AppStateSyncKeyFingerprint.decode(bytes);
    }
    catch (error) {
        throw new Error(`invalid appstate_sync_keys.fingerprint protobuf payload: ${(0, primitives_1.toError)(error).message}`);
    }
}
/** Decodes app-state sync-key SQL rows into {@link WaAppStateSyncKey} records. */
function decodeAppStateSyncKeys(rows) {
    const decoded = new Array(rows.length);
    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        decoded[i] = {
            keyId: (0, coercion_1.asBytes)(row.key_id, 'appstate_sync_keys.key_id'),
            keyData: (0, coercion_1.asBytes)(row.key_data, 'appstate_sync_keys.key_data'),
            timestamp: (0, coercion_1.asNumber)(row.timestamp, 'appstate_sync_keys.timestamp'),
            fingerprint: decodeAppStateFingerprint(row.fingerprint)
        };
    }
    return decoded;
}
/**
 * Joins app-state collection-version and index-value SQL rows into the
 * `collections` shape used by the in-memory app-state store.
 */
function decodeAppStateCollections(versionRows, valueRows) {
    const valueMapByCollection = new Map();
    for (const row of valueRows) {
        const collection = (0, coercion_1.asString)(row.collection, 'appstate_collection_index_values.collection');
        const byIndex = valueMapByCollection.get(collection) ?? {};
        byIndex[(0, coercion_1.asString)(row.index_mac_hex, 'appstate_collection_index_values.index_mac_hex')] =
            (0, coercion_1.asBytes)(row.value_mac, 'appstate_collection_index_values.value_mac');
        valueMapByCollection.set(collection, byIndex);
    }
    const collections = {};
    for (const row of versionRows) {
        const collection = (0, coercion_1.asString)(row.collection, 'appstate_collection_versions.collection');
        collections[collection] = {
            version: (0, coercion_1.asNumber)(row.version, 'appstate_collection_versions.version'),
            hash: (0, coercion_1.asBytes)(row.hash, 'appstate_collection_versions.hash'),
            indexValueMap: valueMapByCollection.get(collection) ?? {}
        };
    }
    return collections;
}
