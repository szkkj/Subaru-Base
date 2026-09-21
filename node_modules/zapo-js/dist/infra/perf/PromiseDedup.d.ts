export declare class PromiseDedup {
    private readonly inFlight;
    run<T>(key: string, task: () => Promise<T>): Promise<T>;
}
