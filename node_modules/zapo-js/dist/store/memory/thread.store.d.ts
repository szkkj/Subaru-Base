import type { WaThreadStore as Contract, WaStoredThreadRecord } from '../contracts/thread.store';
export interface WaThreadMemoryStoreOptions {
    readonly maxThreads?: number;
}
export declare class WaThreadMemoryStore implements Contract {
    private readonly threads;
    private readonly maxThreads;
    constructor(options?: WaThreadMemoryStoreOptions);
    upsert(record: WaStoredThreadRecord): Promise<void>;
    upsertBatch(records: readonly WaStoredThreadRecord[]): Promise<void>;
    getByJid(jid: string): Promise<WaStoredThreadRecord | null>;
    list(limit?: number): Promise<readonly WaStoredThreadRecord[]>;
    deleteByJid(jid: string): Promise<number>;
    clear(): Promise<void>;
}
