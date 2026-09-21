type Task<T> = () => Promise<T>;
export declare class BoundedTaskQueueFullError extends Error {
    readonly code = "BOUNDED_TASK_QUEUE_FULL";
    constructor(message?: string);
}
export declare class BoundedTaskQueue {
    private readonly maxQueueSize;
    private readonly maxConcurrency;
    private readonly queue;
    private head;
    private running;
    constructor(maxQueueSize?: number, maxConcurrency?: number);
    private readonly settleTask;
    enqueue<T>(task: Task<T>): Promise<T>;
    pending(): number;
    inFlight(): number;
    private drain;
}
export {};
