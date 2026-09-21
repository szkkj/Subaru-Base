export class StoreLock {
    constructor() {
        this.chains = new Map();
        this.closed = false;
    }
    run(key, task) {
        return this.runInternal(key, task, true);
    }
    runInternal(key, task, rejectWhenClosed) {
        if (this.closed) {
            if (rejectWhenClosed) {
                throw new Error('store lock is closed');
            }
        }
        const previous = this.chains.get(key);
        let current;
        if (previous) {
            current = previous.then(task);
        }
        else {
            try {
                current = task();
            }
            catch (error) {
                current = Promise.reject(error);
            }
        }
        const tracker = current.then(StoreLock._noop, StoreLock._noop);
        this.chains.set(key, tracker);
        tracker.then(() => {
            if (this.chains.get(key) === tracker)
                this.chains.delete(key);
        }, () => {
            if (this.chains.get(key) === tracker)
                this.chains.delete(key);
        });
        return current;
    }
    runMany(keys, task) {
        if (this.closed) {
            throw new Error('store lock is closed');
        }
        if (keys.length <= 1) {
            return keys.length === 0 ? task() : this.runInternal(keys[0], task, false);
        }
        const ordered = new Array(keys.length);
        for (let index = 0; index < keys.length; index += 1) {
            ordered[index] = keys[index];
        }
        ordered.sort();
        let uniqueCount = 1;
        let previousKey = ordered[0];
        for (let index = 1; index < ordered.length; index += 1) {
            const key = ordered[index];
            if (key === previousKey) {
                continue;
            }
            ordered[uniqueCount] = key;
            uniqueCount += 1;
            previousKey = key;
        }
        const acquire = (index) => index >= uniqueCount
            ? task()
            : this.runInternal(ordered[index], () => Promise.resolve().then(() => acquire(index + 1)), false);
        return acquire(0);
    }
    async shutdown() {
        this.closed = true;
        while (this.chains.size > 0) {
            const pending = new Array(this.chains.size);
            let pendingIndex = 0;
            for (const chain of this.chains.values()) {
                pending[pendingIndex] = chain;
                pendingIndex += 1;
            }
            await Promise.allSettled(pending);
        }
    }
}
StoreLock._noop = () => undefined;
