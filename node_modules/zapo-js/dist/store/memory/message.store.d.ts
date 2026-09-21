import type { WaMessageStore as Contract, WaStoredMessageRecord } from '../contracts/message.store';
export interface WaMessageMemoryStoreOptions {
    readonly maxMessages?: number;
}
export declare class WaMessageMemoryStore implements Contract {
    private readonly messages;
    private readonly maxMessages;
    constructor(options?: WaMessageMemoryStoreOptions);
    upsert(record: WaStoredMessageRecord): Promise<void>;
    upsertBatch(records: readonly WaStoredMessageRecord[]): Promise<void>;
    getById(id: string): Promise<WaStoredMessageRecord | null>;
    listByThread(threadJid: string, limit?: number, beforeTimestampMs?: number): Promise<readonly WaStoredMessageRecord[]>;
    deleteById(id: string): Promise<number>;
    clear(): Promise<void>;
}
