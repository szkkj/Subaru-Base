"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedExclusiveGate = void 0;
class SharedExclusiveGate {
    constructor() {
        this.activeShared = 0;
        this.pendingExclusive = 0;
        this.exclusiveActive = false;
        this.closed = false;
        this.waiters = [];
    }
    runShared(task) {
        if (this.closed) {
            return Promise.reject(new Error('shared-exclusive gate is closed'));
        }
        if (!this.exclusiveActive && this.pendingExclusive === 0) {
            this.activeShared += 1;
            let current;
            try {
                current = task();
            }
            catch (error) {
                current = Promise.reject(error);
            }
            return current.finally(() => {
                this.activeShared -= 1;
                this.notifyStateChange();
            });
        }
        return this.runSharedSlow(task);
    }
    async runSharedSlow(task) {
        await this.acquireShared();
        try {
            return await task();
        }
        finally {
            this.activeShared -= 1;
            this.notifyStateChange();
        }
    }
    async runExclusive(task) {
        await this.acquireExclusive();
        try {
            return await task();
        }
        finally {
            this.exclusiveActive = false;
            this.notifyStateChange();
        }
    }
    async close() {
        if (this.closed) {
            while (this.activeShared > 0 || this.exclusiveActive || this.pendingExclusive > 0) {
                await this.waitForStateChange();
            }
            return;
        }
        this.closed = true;
        this.notifyStateChange();
        while (this.activeShared > 0 || this.exclusiveActive || this.pendingExclusive > 0) {
            await this.waitForStateChange();
        }
    }
    async acquireShared() {
        if (this.closed) {
            throw new Error('shared-exclusive gate is closed');
        }
        while (this.exclusiveActive || this.pendingExclusive > 0) {
            await this.waitForStateChange();
            if (this.closed) {
                throw new Error('shared-exclusive gate is closed');
            }
        }
        this.activeShared += 1;
    }
    async acquireExclusive() {
        if (this.closed) {
            throw new Error('shared-exclusive gate is closed');
        }
        this.pendingExclusive += 1;
        this.notifyStateChange();
        try {
            while (this.exclusiveActive || this.activeShared > 0) {
                await this.waitForStateChange();
                if (this.closed) {
                    throw new Error('shared-exclusive gate is closed');
                }
            }
            this.exclusiveActive = true;
        }
        finally {
            this.pendingExclusive -= 1;
            this.notifyStateChange();
        }
    }
    notifyStateChange() {
        if (this.waiters.length === 0) {
            return;
        }
        const waiterCount = this.waiters.length;
        for (let index = 0; index < waiterCount; index += 1) {
            this.waiters[index]();
        }
        this.waiters.length = 0;
    }
    waitForStateChange() {
        return new Promise((resolve) => {
            this.waiters[this.waiters.length] = resolve;
        });
    }
}
exports.SharedExclusiveGate = SharedExclusiveGate;
