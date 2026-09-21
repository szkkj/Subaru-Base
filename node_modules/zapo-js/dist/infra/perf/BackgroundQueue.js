"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundQueue = void 0;
const coercion_1 = require("../../util/coercion");
const primitives_1 = require("../../util/primitives");
const DEFAULT_MAX_PENDING_KEYS = 4096;
const DEFAULT_FLUSH_TIMEOUT_MS = 5000;
const DEFAULT_MAX_BATCH_SIZE = 250;
const RETRY_BACKOFF_BASE_MS = 100;
const RETRY_BACKOFF_MAX_MS = 2000;
class BackgroundQueue {
    constructor(writer, options = {}) {
        this.writer = writer;
        this.coalesce = options.coalesce ?? ((_p, i) => i);
        this.maxPendingKeys = (0, coercion_1.resolvePositive)(options.maxPendingKeys, DEFAULT_MAX_PENDING_KEYS, 'maxPendingKeys');
        this.maxWriteConcurrency = (0, coercion_1.resolvePositive)(options.maxWriteConcurrency, 1, 'maxWriteConcurrency');
        this.batchWriter = options.batchWriter ?? null;
        this.maxBatchSize = this.batchWriter
            ? (0, coercion_1.resolvePositive)(options.maxBatchSize, DEFAULT_MAX_BATCH_SIZE, 'maxBatchSize')
            : DEFAULT_MAX_BATCH_SIZE;
        const flushTimeoutMs = options.flushTimeoutMs ?? DEFAULT_FLUSH_TIMEOUT_MS;
        if (!Number.isFinite(flushTimeoutMs) || flushTimeoutMs < 1) {
            throw new Error('BackgroundQueue flushTimeoutMs must be a positive finite number');
        }
        this.flushTimeoutMs = flushTimeoutMs;
        this.onError = options.onError;
        this.onPressure = options.onPressure;
        this.onDiscard = options.onDiscard;
        this.pendingByKey = new Map();
        this.retryTimersByKey = new Map();
        this.stateWaiters = [];
        this.drainingPromise = null;
        this.inFlight = 0;
        this.flushedCount = 0;
        this.shutdownRequested = false;
        this.retryDisabled = false;
    }
    enqueue(key, value) {
        if (this.shutdownRequested) {
            this.invokeOnDiscard(key, value);
            return;
        }
        if (this.pendingByKey.has(key) || this.retryTimersByKey.has(key)) {
            this.addPendingEntry(key, value);
            this.notifyStateChange();
            this.ensureDrain();
            return;
        }
        if (this.trackedKeys() < this.maxPendingKeys) {
            this.addPendingEntry(key, value);
            this.notifyStateChange();
            this.ensureDrain();
            return;
        }
        this.invokeOnPressure(this.trackedKeys());
        this.invokeOnDiscard(key, value);
    }
    async enqueueAsync(key, value) {
        if (this.shutdownRequested) {
            this.invokeOnDiscard(key, value);
            throw new Error('background queue is destroyed');
        }
        await this.waitForCapacity(key, value);
        return new Promise((resolve, reject) => {
            const waiter = { resolve, reject };
            this.addPendingEntry(key, value, waiter);
            this.notifyStateChange();
            this.ensureDrain();
        });
    }
    async waitForCapacity(key, value) {
        while (!this.pendingByKey.has(key) &&
            !this.retryTimersByKey.has(key) &&
            this.trackedKeys() >= this.maxPendingKeys) {
            this.invokeOnPressure(this.trackedKeys());
            await this.waitForStateChange(this.flushTimeoutMs);
            if (this.shutdownRequested) {
                this.invokeOnDiscard(key, value);
                throw new Error('background queue is destroyed');
            }
        }
    }
    addPendingEntry(key, value, waiter) {
        const scheduledRetryTimer = this.retryTimersByKey.get(key) ?? null;
        const scheduledRetry = scheduledRetryTimer?.entry ?? null;
        const existing = this.pendingByKey.get(key);
        if (existing) {
            let coalescedValue = existing.value;
            let coalescedAttempt = existing.attempt;
            try {
                if (scheduledRetry) {
                    coalescedValue = this.coalesce(scheduledRetry.value, coalescedValue, key);
                    coalescedAttempt = Math.max(coalescedAttempt, scheduledRetry.attempt);
                }
                coalescedValue = this.coalesce(coalescedValue, value, key);
            }
            catch (error) {
                this.invokeOnError(key, error, Math.max(coalescedAttempt + 1, scheduledRetry?.attempt ?? 0));
                if (waiter) {
                    waiter.reject(error === undefined
                        ? new Error('background queue coalesce failed')
                        : (0, primitives_1.toError)(error));
                }
                else {
                    this.invokeOnDiscard(key, value);
                }
                return;
            }
            if (scheduledRetry) {
                this.detachRetryEntry(key, scheduledRetryTimer);
                if (scheduledRetry.waiters.length > 0) {
                    const mergedWaiters = new Array(scheduledRetry.waiters.length + existing.waiters.length);
                    let writeIndex = 0;
                    for (let i = 0; i < scheduledRetry.waiters.length; i += 1) {
                        mergedWaiters[writeIndex++] = scheduledRetry.waiters[i];
                    }
                    for (let i = 0; i < existing.waiters.length; i += 1) {
                        mergedWaiters[writeIndex++] = existing.waiters[i];
                    }
                    existing.waiters = mergedWaiters;
                }
                existing.attempt = Math.max(coalescedAttempt, scheduledRetry.attempt);
            }
            existing.value = coalescedValue;
            existing.attempt = coalescedAttempt;
            if (waiter) {
                existing.waiters[existing.waiters.length] = waiter;
            }
            return;
        }
        if (scheduledRetry) {
            let coalescedValue;
            try {
                coalescedValue = this.coalesce(scheduledRetry.value, value, key);
            }
            catch (error) {
                this.invokeOnError(key, error, scheduledRetry.attempt + 1);
                if (waiter) {
                    waiter.reject(error === undefined
                        ? new Error('background queue coalesce failed')
                        : (0, primitives_1.toError)(error));
                }
                else {
                    this.invokeOnDiscard(key, value);
                }
                return;
            }
            this.detachRetryEntry(key, scheduledRetryTimer);
            const scheduledWaiterCount = scheduledRetry.waiters.length;
            const waiters = new Array(scheduledWaiterCount + (waiter ? 1 : 0));
            for (let i = 0; i < scheduledWaiterCount; i += 1) {
                waiters[i] = scheduledRetry.waiters[i];
            }
            if (waiter) {
                waiters[scheduledWaiterCount] = waiter;
            }
            this.pendingByKey.set(key, {
                value: coalescedValue,
                waiters,
                attempt: scheduledRetry.attempt
            });
            return;
        }
        this.pendingByKey.set(key, {
            value,
            waiters: waiter ? [waiter] : [],
            attempt: 0
        });
    }
    detachRetryEntry(key, retry) {
        if (!retry) {
            return;
        }
        const current = this.retryTimersByKey.get(key);
        if (!current || current !== retry) {
            return;
        }
        this.retryTimersByKey.delete(key);
        clearTimeout(retry.timer);
    }
    async flush(timeoutMs = this.flushTimeoutMs) {
        const normalizedTimeoutMs = Math.max(0, Number.isFinite(timeoutMs) ? timeoutMs : this.flushTimeoutMs);
        const startFlushed = this.flushedCount;
        const deadline = Date.now() + normalizedTimeoutMs;
        while (true) {
            const remaining = this.remaining();
            if (remaining === 0) {
                return {
                    flushed: this.flushedCount - startFlushed,
                    remaining: 0
                };
            }
            const remainingMs = deadline - Date.now();
            if (remainingMs <= 0) {
                return {
                    flushed: this.flushedCount - startFlushed,
                    remaining
                };
            }
            await this.waitForStateChange(remainingMs, true);
        }
    }
    async destroy(timeoutMs = this.flushTimeoutMs) {
        const normalizedTimeoutMs = Math.max(0, Number.isFinite(timeoutMs) ? timeoutMs : this.flushTimeoutMs);
        this.shutdownRequested = true;
        this.notifyStateChange();
        const flushed = await this.flush(normalizedTimeoutMs);
        if (flushed.remaining > 0) {
            this.retryDisabled = true;
            this.discardPending();
        }
        return {
            flushed: flushed.flushed,
            remaining: this.remaining()
        };
    }
    ensureDrain() {
        if (this.drainingPromise) {
            return;
        }
        this.drainingPromise = this.drainLoop().finally(() => {
            this.drainingPromise = null;
            this.notifyStateChange();
            if (this.pendingByKey.size > 0) {
                this.ensureDrain();
            }
        });
    }
    async drainLoop() {
        while (true) {
            if (this.batchWriter) {
                const batch = this.takeBatch(this.maxBatchSize);
                if (batch.length === 0) {
                    return;
                }
                await this.processBatch(batch);
                continue;
            }
            const batch = this.takeBatch(this.maxWriteConcurrency);
            if (batch.length === 0) {
                return;
            }
            if (batch.length === 1) {
                await this.processEntry(batch[0].key, batch[0].entry);
                continue;
            }
            const tasks = new Array(batch.length);
            for (let i = 0; i < batch.length; i += 1) {
                tasks[i] = this.processEntry(batch[i].key, batch[i].entry);
            }
            await Promise.all(tasks);
        }
    }
    takeBatch(limit) {
        const batch = [];
        for (let i = 0; i < limit; i += 1) {
            const next = this.takeNext();
            if (!next) {
                break;
            }
            batch.push(next);
        }
        return batch;
    }
    async processBatch(batch) {
        const batchWriter = this.batchWriter;
        if (!batchWriter) {
            throw new Error('processBatch called without batchWriter');
        }
        this.inFlight += batch.length;
        const payload = new Array(batch.length);
        for (let i = 0; i < batch.length; i += 1) {
            payload[i] = { key: batch[i].key, value: batch[i].entry.value };
        }
        try {
            await batchWriter(payload);
            this.flushedCount += batch.length;
            for (const item of batch) {
                this.resolveEntry(item.entry);
            }
        }
        catch (error) {
            for (const item of batch) {
                if (this.retryDisabled) {
                    this.discardEntry(item.key, item.entry);
                }
                else {
                    const merged = this.mergeForRetry(item.key, item.entry);
                    const attempt = merged.attempt + 1;
                    merged.attempt = attempt;
                    this.invokeOnError(item.key, error, attempt);
                    this.scheduleRetry(item.key, merged, this.retryDelayMs(attempt));
                }
            }
        }
        finally {
            this.inFlight -= batch.length;
            this.notifyStateChange();
        }
    }
    async processEntry(key, entry) {
        this.inFlight += 1;
        try {
            await this.writer(key, entry.value);
            this.flushedCount += 1;
            this.resolveEntry(entry);
        }
        catch (error) {
            if (this.retryDisabled) {
                this.discardEntry(key, entry);
            }
            else {
                const merged = this.mergeForRetry(key, entry);
                const attempt = merged.attempt + 1;
                merged.attempt = attempt;
                this.invokeOnError(key, error, attempt);
                this.scheduleRetry(key, merged, this.retryDelayMs(attempt));
            }
        }
        finally {
            this.inFlight -= 1;
            this.notifyStateChange();
        }
    }
    takeNext() {
        const next = this.pendingByKey.entries().next().value;
        if (!next) {
            return null;
        }
        const [key, entry] = next;
        this.pendingByKey.delete(key);
        return { key, entry };
    }
    mergeForRetry(key, failedEntry) {
        const pending = this.pendingByKey.get(key);
        if (!pending) {
            return failedEntry;
        }
        const mergedWaiters = new Array(failedEntry.waiters.length + pending.waiters.length);
        let mergedIndex = 0;
        for (let i = 0; i < failedEntry.waiters.length; i += 1) {
            mergedWaiters[mergedIndex++] = failedEntry.waiters[i];
        }
        for (let i = 0; i < pending.waiters.length; i += 1) {
            mergedWaiters[mergedIndex++] = pending.waiters[i];
        }
        let mergedValue;
        try {
            mergedValue = this.coalesce(failedEntry.value, pending.value, key);
        }
        catch (error) {
            const fallbackAttempt = Math.max(failedEntry.attempt, pending.attempt);
            this.invokeOnError(key, error, fallbackAttempt + 1);
            this.pendingByKey.delete(key);
            this.invokeOnDiscard(key, pending.value);
            if (pending.waiters.length > 0) {
                const queueError = error === undefined
                    ? new Error('background queue coalesce failed')
                    : (0, primitives_1.toError)(error);
                for (let index = 0; index < pending.waiters.length; index += 1) {
                    pending.waiters[index].reject(queueError);
                }
            }
            return failedEntry;
        }
        this.pendingByKey.delete(key);
        return {
            value: mergedValue,
            waiters: mergedWaiters,
            attempt: Math.max(failedEntry.attempt, pending.attempt)
        };
    }
    retryDelayMs(attempt) {
        if (attempt <= 1) {
            return RETRY_BACKOFF_BASE_MS;
        }
        const unbounded = RETRY_BACKOFF_BASE_MS * 2 ** Math.min(6, attempt - 1);
        return Math.min(RETRY_BACKOFF_MAX_MS, unbounded);
    }
    scheduleRetry(key, entry, retryMs) {
        const existing = this.retryTimersByKey.get(key);
        if (existing) {
            clearTimeout(existing.timer);
        }
        const timer = setTimeout(() => {
            this.retryTimersByKey.delete(key);
            if (this.retryDisabled) {
                this.discardEntry(key, entry);
                this.notifyStateChange();
                return;
            }
            const latest = this.mergeForRetry(key, entry);
            this.pendingByKey.set(key, latest);
            this.notifyStateChange();
            this.ensureDrain();
        }, retryMs);
        timer.unref?.();
        this.retryTimersByKey.set(key, { entry, timer });
        this.notifyStateChange();
    }
    resolveEntry(entry) {
        if (entry.waiters.length === 0) {
            return;
        }
        for (const waiter of entry.waiters) {
            waiter.resolve();
        }
    }
    discardEntry(key, entry) {
        this.invokeOnDiscard(key, entry.value);
        if (entry.waiters.length === 0) {
            return;
        }
        const error = (0, primitives_1.toError)('background queue destroyed before write was flushed');
        for (const waiter of entry.waiters) {
            waiter.reject(error);
        }
    }
    discardPending() {
        if (this.pendingByKey.size > 0) {
            for (const [key, entry] of this.pendingByKey) {
                this.pendingByKey.delete(key);
                this.discardEntry(key, entry);
            }
        }
        if (this.retryTimersByKey.size > 0) {
            for (const [key, retry] of this.retryTimersByKey) {
                this.retryTimersByKey.delete(key);
                clearTimeout(retry.timer);
                this.discardEntry(key, retry.entry);
            }
        }
        this.notifyStateChange();
    }
    remaining() {
        return this.pendingByKey.size + this.retryTimersByKey.size + this.inFlight;
    }
    trackedKeys() {
        return this.pendingByKey.size + this.retryTimersByKey.size;
    }
    notifyStateChange() {
        if (this.stateWaiters.length === 0) {
            return;
        }
        const waiterCount = this.stateWaiters.length;
        for (let index = 0; index < waiterCount; index += 1) {
            const waiter = this.stateWaiters[index];
            waiter.index = -1;
            waiter.done();
        }
        this.stateWaiters.length = 0;
    }
    waitForStateChange(timeoutMs, ref = false) {
        return new Promise((resolve) => {
            let active = true;
            const waiter = {
                done: () => {
                    if (!active) {
                        return;
                    }
                    active = false;
                    clearTimeout(timer);
                    this.removeStateWaiter(waiter);
                    resolve();
                },
                index: -1
            };
            const timer = setTimeout(waiter.done, timeoutMs);
            if (!ref) {
                timer.unref?.();
            }
            waiter.index = this.stateWaiters.length;
            this.stateWaiters[waiter.index] = waiter;
        });
    }
    removeStateWaiter(waiter) {
        const index = waiter.index;
        if (index < 0) {
            return;
        }
        const lastIndex = this.stateWaiters.length - 1;
        if (index !== lastIndex) {
            const last = this.stateWaiters[lastIndex];
            this.stateWaiters[index] = last;
            last.index = index;
        }
        this.stateWaiters.length = lastIndex;
        waiter.index = -1;
    }
    invokeOnError(key, error, attempt) {
        if (!this.onError) {
            return;
        }
        try {
            this.onError(key, error, attempt);
        }
        catch {
            return;
        }
    }
    invokeOnPressure(pendingKeys) {
        if (!this.onPressure) {
            return;
        }
        try {
            this.onPressure(pendingKeys);
        }
        catch {
            return;
        }
    }
    invokeOnDiscard(key, value) {
        if (!this.onDiscard) {
            return;
        }
        try {
            this.onDiscard(key, value);
        }
        catch {
            return;
        }
    }
}
exports.BackgroundQueue = BackgroundQueue;
