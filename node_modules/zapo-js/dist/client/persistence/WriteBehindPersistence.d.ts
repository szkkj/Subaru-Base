import type { WaWriteBehindOptions } from '../types';
import type { Logger } from '../../infra/log/types';
import { type BackgroundQueueFlushResult } from '../../infra/perf/BackgroundQueue';
import type { WaContactStore, WaStoredContactRecord } from '../../store/contracts/contact.store';
import type { WaMessageStore, WaStoredMessageRecord } from '../../store/contracts/message.store';
import type { WaStoredThreadRecord, WaThreadStore } from '../../store/contracts/thread.store';
interface WriteBehindStores {
    readonly messageStore: WaMessageStore;
    readonly threadStore: WaThreadStore;
    readonly contactStore: WaContactStore;
}
export interface WriteBehindDrainResult {
    readonly messages: BackgroundQueueFlushResult;
    readonly threads: BackgroundQueueFlushResult;
    readonly contacts: BackgroundQueueFlushResult;
    readonly flushed: number;
    readonly remaining: number;
}
export declare class WriteBehindPersistence {
    private readonly logger;
    private readonly stores;
    private readonly options;
    private queues;
    private readonly flushTimeoutMs;
    private destroyed;
    constructor(stores: WriteBehindStores, logger: Logger, options?: WaWriteBehindOptions);
    private buildQueues;
    /**
     * Re-arm the queues after a previous {@link destroy} call. Idempotent —
     * a no-op when the persistence is already live. Used by `WaClient.connect`
     * to recover from a logout/clear-stored-state cycle without leaking the
     * old destroyed queues into the next session.
     */
    restart(): void;
    persistMessage(record: WaStoredMessageRecord): void;
    persistMessageAsync(record: WaStoredMessageRecord): Promise<void>;
    persistThread(record: WaStoredThreadRecord): void;
    persistThreadAsync(record: WaStoredThreadRecord): Promise<void>;
    persistContact(record: WaStoredContactRecord): void;
    persistContactAsync(record: WaStoredContactRecord): Promise<void>;
    flush(timeoutMs?: number): Promise<WriteBehindDrainResult>;
    destroy(timeoutMs?: number): Promise<WriteBehindDrainResult>;
    private toDrainResult;
}
export {};
