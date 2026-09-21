"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSignalLock = withSignalLock;
const SharedExclusiveGate_1 = require("../../infra/perf/SharedExclusiveGate");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const WA_SIGNAL_REGISTRATION_KEY = 'signal:registration';
const WA_SIGNAL_SIGNED_PREKEY_KEY = 'signal:signedPreKey';
const WA_SIGNAL_CLEAR_KEY = 'signal:clear';
function withSignalLock(store) {
    const lock = new StoreLock_1.StoreLock();
    const gate = new SharedExclusiveGate_1.SharedExclusiveGate();
    const destroyStore = store;
    let cachedRegInfo;
    return {
        getRegistrationInfo: () => gate.runShared(async () => {
            if (cachedRegInfo !== undefined) {
                return cachedRegInfo;
            }
            const info = await store.getRegistrationInfo();
            cachedRegInfo = info;
            return info;
        }),
        setRegistrationInfo: (info) => gate.runShared(() => lock.run(WA_SIGNAL_REGISTRATION_KEY, async () => {
            await store.setRegistrationInfo(info);
            cachedRegInfo = info;
        })),
        getSignedPreKey: () => gate.runShared(() => store.getSignedPreKey()),
        setSignedPreKey: (record) => gate.runShared(() => lock.run(WA_SIGNAL_SIGNED_PREKEY_KEY, () => store.setSignedPreKey(record))),
        getSignedPreKeyById: (keyId) => gate.runShared(() => store.getSignedPreKeyById(keyId)),
        setSignedPreKeyRotationTs: (value) => gate.runShared(() => lock.run(WA_SIGNAL_SIGNED_PREKEY_KEY, () => store.setSignedPreKeyRotationTs(value))),
        getSignedPreKeyRotationTs: () => gate.runShared(() => store.getSignedPreKeyRotationTs()),
        clear: () => gate.runExclusive(() => lock.run(WA_SIGNAL_CLEAR_KEY, async () => {
            await store.clear();
            cachedRegInfo = undefined;
        })),
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await destroyStore.destroy?.();
        }
    };
}
