import { StoreLock } from '../../infra/perf/StoreLock.js';
const WA_AUTH_KEY = 'credentials';
export function withAuthLock(store) {
    const lock = new StoreLock();
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
