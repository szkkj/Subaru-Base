type StoreTask<T> = () => Promise<T>;
export declare class StoreLock {
    private static readonly _noop;
    private readonly chains;
    private closed;
    run<T>(key: string, task: StoreTask<T>): Promise<T>;
    private runInternal;
    runMany<T>(keys: readonly string[], task: StoreTask<T>): Promise<T>;
    shutdown(): Promise<void>;
}
export {};
