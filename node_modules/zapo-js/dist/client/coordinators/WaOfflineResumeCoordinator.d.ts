import type { WaOfflineResumeEvent } from '../types';
import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../../transport/types';
interface WaOfflineResumeRuntime {
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    readonly emitOfflineResume: (event: WaOfflineResumeEvent) => void;
}
interface WaOfflineResumeCoordinatorOptions {
    readonly logger: Logger;
    readonly runtime: WaOfflineResumeRuntime;
}
export declare class WaOfflineResumeCoordinator {
    private readonly logger;
    private readonly runtime;
    private state;
    private totalStanzas;
    private pendingStanzas;
    private batchInFlight;
    private batchRetries;
    private resumeGeneration;
    private lastBatchRequestMs;
    private batchTimeout;
    private stanzaTimeout;
    constructor(options: WaOfflineResumeCoordinatorOptions);
    get isComplete(): boolean;
    get isResuming(): boolean;
    handleOfflinePreview(stanzaCount: number): void;
    handleOfflineComplete(serverStanzaCount: number): void;
    trackOfflineStanza(): void;
    reset(): void;
    private completeResume;
    /**
     * Ask the server for the next window of queued stanzas, at most one request
     * per `REQUEST_DEBOUNCE_MS` and never while one is still outstanding. Only a
     * delivered stanza schedules a request, so the loop winds down on its own
     * once the queue dries up; the resume itself ends on the terminal `offline`
     * bulletin or on the stanza timeout, never on the preview counter, which is
     * a progress estimate rather than an authoritative total.
     */
    private scheduleNextBatch;
    private requestOfflineBatch;
    /**
     * A rejected request delivers no stanza, and only a delivered stanza
     * schedules the next one, so without a retry here a single transport blip
     * strands the whole queue until the stanza timeout. `generation` pins the
     * outcome to the resume that issued it: a rejection from a torn-down resume
     * must not clear the current one's in-flight flag or retry on its behalf.
     */
    private sendOfflineBatch;
    private resetStanzaTimeout;
    private clearTimers;
}
export {};
