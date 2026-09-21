import type { AppStateCollectionName, WaAppStateStoreData, WaAppStateSyncKey } from '../../appstate/types';
import type { WaAppStateCollectionStateUpdate, WaAppStateCollectionStoreState, WaAppStateStore } from '../contracts/appstate.store';
export interface WaAppStateMemoryStoreOptions {
    readonly maxSyncKeys?: number;
    readonly maxCollectionEntries?: number;
}
export declare class WaAppStateMemoryStore implements WaAppStateStore {
    private readonly keys;
    private readonly collections;
    private readonly maxSyncKeys;
    private readonly maxCollectionEntries;
    constructor(initial?: WaAppStateStoreData, options?: WaAppStateMemoryStoreOptions);
    exportData(): Promise<WaAppStateStoreData>;
    upsertSyncKeys(keys: readonly WaAppStateSyncKey[]): Promise<number>;
    getSyncKeysBatch(keyIds: readonly Uint8Array[]): Promise<readonly (WaAppStateSyncKey | null)[]>;
    getSyncKeyData(keyId: Uint8Array): Promise<Uint8Array | null>;
    getSyncKeyDataBatch(keyIds: readonly Uint8Array[]): Promise<readonly (Uint8Array | null)[]>;
    getActiveSyncKey(): Promise<WaAppStateSyncKey | null>;
    getCollectionState(collection: AppStateCollectionName): Promise<WaAppStateCollectionStoreState>;
    getCollectionStates(collections: readonly AppStateCollectionName[]): Promise<readonly WaAppStateCollectionStoreState[]>;
    setCollectionStates(updates: readonly WaAppStateCollectionStateUpdate[]): Promise<void>;
    clear(): Promise<void>;
}
