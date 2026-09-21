import type { Logger } from '../../infra/log/types';
import type { WaGroupMetadataSnapshot, WaGroupMetadataStore } from '../contracts/group-metadata.store';
export interface WaGroupMetadataMemoryStoreOptions {
    readonly maxGroups?: number;
    /**
     * Logger for capacity-saturation warnings. Emits a single `warn` the
     * first time the bounded map evicts an entry; subsequent evictions are
     * silent to avoid spam.
     */
    readonly logger?: Logger;
}
export declare class WaGroupMetadataMemoryStore implements WaGroupMetadataStore {
    private readonly records;
    private readonly ttlMs;
    private readonly maxGroups;
    private readonly cleanup;
    private readonly logger;
    private capacityWarned;
    constructor(ttlMs?: number, options?: WaGroupMetadataMemoryStoreOptions);
    private warnCapacity;
    upsertGroupMetadata(snapshot: WaGroupMetadataSnapshot): Promise<void>;
    getGroupMetadata(groupJid: string, nowMs?: number): Promise<WaGroupMetadataSnapshot | null>;
    deleteGroupMetadata(groupJid: string): Promise<number>;
    cleanupExpired(nowMs: number): Promise<number>;
    clear(): Promise<void>;
    destroy(): Promise<void>;
}
