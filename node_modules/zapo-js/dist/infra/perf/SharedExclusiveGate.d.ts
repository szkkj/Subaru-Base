type SharedExclusiveTask<T> = () => Promise<T>;
export declare class SharedExclusiveGate {
    private activeShared;
    private pendingExclusive;
    private exclusiveActive;
    private closed;
    private readonly waiters;
    runShared<T>(task: SharedExclusiveTask<T>): Promise<T>;
    private runSharedSlow;
    runExclusive<T>(task: SharedExclusiveTask<T>): Promise<T>;
    close(): Promise<void>;
    private acquireShared;
    private acquireExclusive;
    private notifyStateChange;
    private waitForStateChange;
}
export {};
