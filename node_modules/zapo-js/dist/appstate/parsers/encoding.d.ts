import type { WaAppStateStoreData, WaAppStateSyncKey } from '../types';
type StoreRow = Readonly<Record<string, unknown>>;
/** Serializes an app-state sync key fingerprint to its protobuf bytes, or `null` when absent. */
export declare function encodeAppStateFingerprint(fingerprint: WaAppStateSyncKey['fingerprint']): Uint8Array | null;
/** Inverse of {@link encodeAppStateFingerprint}; throws on malformed input. */
export declare function decodeAppStateFingerprint(raw: unknown): WaAppStateSyncKey['fingerprint'] | undefined;
/** Decodes app-state sync-key SQL rows into {@link WaAppStateSyncKey} records. */
export declare function decodeAppStateSyncKeys(rows: readonly StoreRow[]): readonly WaAppStateSyncKey[];
/**
 * Joins app-state collection-version and index-value SQL rows into the
 * `collections` shape used by the in-memory app-state store.
 */
export declare function decodeAppStateCollections(versionRows: readonly StoreRow[], valueRows: readonly StoreRow[]): WaAppStateStoreData['collections'];
export {};
