export class BoundedTaskQueueFullError extends Error {
    constructor(message = 'queue is full') {
        super(message);
        this.code = 'BOUNDED_TASK_QUEUE_FULL';
        this.name = 'BoundedTaskQueueFullError';
    }
}
export class BoundedTaskQueue {
    constructor(maxQueueSize = 256, maxConcurrency = 1) {
        this.settleTask = () => {
            this.running--;
            if (this.head >= 1024 && this.head * 2 >= this.queue.length) {
                const remaining = this.queue.length - this.head;
                this.queue.copyWithin(0, this.head);
                this.queue.length = remaining;
                this.head = 0;
            }
            this.drain();
        };
        if (maxQueueSize <= 0) {
            throw new Error('maxQueueSize must be > 0');
        }
        if (maxConcurrency <= 0) {
            throw new Error('maxConcurrency must be > 0');
        }
        this.maxQueueSize = maxQueueSize;
        this.maxConcurrency = maxConcurrency;
        this.queue = [];
        this.head = 0;
        this.running = 0;
    }
    enqueue(task) {
        if (this.pending() >= this.maxQueueSize) {
            return Promise.reject(new BoundedTaskQueueFullError());
        }
        return new Promise((resolve, reject) => {
            this.queue.push({
                task: task,
                resolve: resolve,
                reject
            });
            this.drain();
        });
    }
    pending() {
        return this.queue.length - this.head;
    }
    inFlight() {
        return this.running;
    }
    drain() {
        while (this.running < this.maxConcurrency && this.head < this.queue.length) {
            const item = this.queue[this.head];
            this.queue[this.head] = null;
            this.head++;
            this.running++;
            void item.task().then(item.resolve, item.reject).finally(this.settleTask);
        }
    }
}
