export interface BackgroundQueueOptions<K extends string, V> {
    readonly coalesce?: (previous: V, incoming: V, key: K) => V;
    readonly maxPendingKeys?: number;
    readonly maxWriteConcurrency?: number;
    readonly flushTimeoutMs?: number;
    readonly onError?: (key: K, error: unknown, attempt: number) => void;
    readonly onPressure?: (pendingKeys: number) => void;
    readonly onDiscard?: (key: K, value: V) => void;
    /**
     * Optional bulk writer. When set, the drain loop coalesces up to
     * {@link maxBatchSize} pending entries into a single
     * `batchWriter([...])` call instead of issuing
     * {@link maxWriteConcurrency} parallel `writer(key, value)` calls.
     *
     * Failure semantics: the batch is retried as a unit. The store-side
     * implementation should be idempotent (upsert) so a partial-success +
     * retry does not corrupt state.
     */
    readonly batchWriter?: (entries: ReadonlyArray<{
        readonly key: K;
        readonly value: V;
    }>) => Promise<void>;
    /** Max entries per `batchWriter` call. Default 250. Ignored without `batchWriter`. */
    readonly maxBatchSize?: number;
}
export interface BackgroundQueueFlushResult {
    readonly flushed: number;
    readonly remaining: number;
}
export declare class BackgroundQueue<K extends string, V> {
    private readonly writer;
    private readonly batchWriter;
    private readonly maxBatchSize;
    private readonly coalesce;
    private readonly maxPendingKeys;
    private readonly maxWriteConcurrency;
    private readonly flushTimeoutMs;
    private readonly onError?;
    private readonly onPressure?;
    private readonly onDiscard?;
    private readonly pendingByKey;
    private readonly retryTimersByKey;
    private readonly stateWaiters;
    private drainingPromise;
    private inFlight;
    private flushedCount;
    private shutdownRequested;
    private retryDisabled;
    constructor(writer: (key: K, value: V) => Promise<void>, options?: BackgroundQueueOptions<K, V>);
    enqueue(key: K, value: V): void;
    enqueueAsync(key: K, value: V): Promise<void>;
    private waitForCapacity;
    private addPendingEntry;
    private detachRetryEntry;
    flush(timeoutMs?: number): Promise<BackgroundQueueFlushResult>;
    destroy(timeoutMs?: number): Promise<BackgroundQueueFlushResult>;
    private ensureDrain;
    private drainLoop;
    private takeBatch;
    private processBatch;
    private processEntry;
    private takeNext;
    private mergeForRetry;
    private retryDelayMs;
    private scheduleRetry;
    private resolveEntry;
    private discardEntry;
    private discardPending;
    private remaining;
    private trackedKeys;
    private notifyStateChange;
    private waitForStateChange;
    private removeStateWaiter;
    private invokeOnError;
    private invokeOnPressure;
    private invokeOnDiscard;
}
