import type { Logger } from '../../infra/log/types';
import type { WaDeviceListSnapshot, WaDeviceListStore } from '../contracts/device-list.store';
export interface WaDeviceListMemoryStoreOptions {
    readonly maxUsers?: number;
    /**
     * Logger for capacity-saturation warnings. Emits a single `warn` the
     * first time the bounded map evicts an entry; subsequent evictions are
     * silent to avoid spam.
     */
    readonly logger?: Logger;
}
export declare class WaDeviceListMemoryStore implements WaDeviceListStore {
    private readonly records;
    private readonly altIndex;
    private readonly ttlMs;
    private readonly maxUsers;
    private readonly cleanup;
    private readonly logger;
    private capacityWarned;
    constructor(ttlMs?: number, options?: WaDeviceListMemoryStoreOptions);
    private warnCapacity;
    upsertUserDevicesBatch(snapshots: readonly WaDeviceListSnapshot[]): Promise<void>;
    getUserDevicesBatch(userJids: readonly string[], nowMs?: number): Promise<readonly (WaDeviceListSnapshot | null)[]>;
    findByAnyUserJid(jid: string, nowMs?: number): Promise<WaDeviceListSnapshot | null>;
    deleteUserDevices(userJid: string): Promise<number>;
    cleanupExpired(nowMs: number): Promise<number>;
    clear(): Promise<void>;
    destroy(): Promise<void>;
    private readLive;
}
