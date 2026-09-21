import type { Logger } from '../../infra/log/types';
import type { WaRetryOutboundMessageRecord, WaRetryOutboundState } from '../../retry/types';
import type { WaRetryStore } from '../contracts/retry.store';
export interface WaRetryMemoryStoreOptions {
    readonly maxOutboundMessages?: number;
    readonly maxInboundCounters?: number;
    /**
     * Logger for capacity-saturation warnings. Emits a single `warn` the
     * first time either bounded map evicts an entry (signals you've hit
     * `maxOutboundMessages` / `maxInboundCounters`). Subsequent evictions
     * are silent to avoid spam.
     */
    readonly logger?: Logger;
}
export declare class WaRetryMemoryStore implements WaRetryStore {
    private readonly outboundMessages;
    private readonly eligibleSets;
    private readonly inboundCounters;
    private readonly ttlMs;
    private readonly maxOutboundMessages;
    private readonly maxInboundCounters;
    private readonly cleanup;
    private readonly logger;
    private outboundCapacityWarned;
    private inboundCapacityWarned;
    constructor(ttlMs?: number, options?: WaRetryMemoryStoreOptions);
    private warnOutboundCapacity;
    private warnInboundCapacity;
    getTtlMs(): number;
    supportsRawReplayPayload(): boolean;
    getOutboundRequesterStatus(messageId: string, requesterDeviceJid: string): Promise<{
        readonly eligible: boolean;
        readonly delivered: boolean;
    } | null>;
    upsertOutboundMessage(record: WaRetryOutboundMessageRecord): Promise<void>;
    deleteOutboundMessage(messageId: string): Promise<number>;
    getOutboundMessage(messageId: string): Promise<WaRetryOutboundMessageRecord | null>;
    updateOutboundMessageState(messageId: string, state: WaRetryOutboundState, updatedAtMs: number, expiresAtMs: number): Promise<void>;
    markOutboundRequesterDelivered(messageId: string, requesterDeviceJid: string, updatedAtMs: number, expiresAtMs: number): Promise<void>;
    incrementInboundCounter(messageId: string, requesterJid: string, _updatedAtMs: number, expiresAtMs: number): Promise<number>;
    cleanupExpired(nowMs: number): Promise<number>;
    clear(): Promise<void>;
    destroy(): Promise<void>;
    private counterKey;
}
