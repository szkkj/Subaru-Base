"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromiseDedup = void 0;
class PromiseDedup {
    constructor() {
        this.inFlight = new Map();
    }
    run(key, task) {
        const existing = this.inFlight.get(key);
        if (existing) {
            return existing;
        }
        const created = Promise.resolve()
            .then(() => task())
            .finally(() => {
            if (this.inFlight.get(key) === created) {
                this.inFlight.delete(key);
            }
        });
        this.inFlight.set(key, created);
        return created;
    }
}
exports.PromiseDedup = PromiseDedup;
