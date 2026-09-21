"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAuthLock = withAuthLock;
const StoreLock_1 = require("../../infra/perf/StoreLock");
const WA_AUTH_KEY = 'credentials';
function withAuthLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const destroyStore = store;
    return {
        load: () => lock.run(WA_AUTH_KEY, () => store.load()),
        save: (credentials) => lock.run(WA_AUTH_KEY, () => store.save(credentials)),
        clear: () => lock.run(WA_AUTH_KEY, () => store.clear()),
        destroy: async () => {
            await lock.shutdown();
            await destroyStore.destroy?.();
        }
    };
}
