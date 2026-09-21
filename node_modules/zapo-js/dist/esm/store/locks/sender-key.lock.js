import { SharedExclusiveGate } from '../../infra/perf/SharedExclusiveGate.js';
import { StoreLock } from '../../infra/perf/StoreLock.js';
import { signalAddressKey } from '../../protocol/jid.js';
const WA_SENDER_KEY_CLEAR_KEY = 'senderKey:clear';
function senderKeyLockKey(groupId, sender) {
    return `senderKey:${groupId}:${signalAddressKey(sender)}`;
}
function senderDistributionLockKey(groupId, sender) {
    return `senderKeyDistribution:${groupId}:${signalAddressKey(sender)}`;
}
function senderAnyLockKey(sender) {
    return `senderKey:any:${signalAddressKey(sender)}`;
}
export function withSenderKeyLock(store) {
    const lock = new StoreLock();
    const gate = new SharedExclusiveGate();
    const destroyStore = store;
    return {
        upsertSenderKey: (record) => gate.runShared(() => lock.runMany([
            senderAnyLockKey(record.sender),
            senderKeyLockKey(record.groupId, record.sender)
        ], () => store.upsertSenderKey(record))),
        upsertSenderKeyDistribution: (record) => gate.runShared(() => lock.runMany([
            senderAnyLockKey(record.sender),
            senderDistributionLockKey(record.groupId, record.sender)
        ], () => store.upsertSenderKeyDistribution(record))),
        upsertSenderKeyDistributions: (records) => gate.runShared(() => lock.runMany(records.flatMap((record) => [
            senderAnyLockKey(record.sender),
            senderDistributionLockKey(record.groupId, record.sender)
        ]), () => store.upsertSenderKeyDistributions(records))),
        getGroupSenderKeyList: (groupId) => gate.runShared(() => store.getGroupSenderKeyList(groupId)),
        getDeviceSenderKey: (groupId, sender) => gate.runShared(() => store.getDeviceSenderKey(groupId, sender)),
        getDeviceSenderKeyDistributions: (groupId, senders) => gate.runShared(() => store.getDeviceSenderKeyDistributions(groupId, senders)),
        deleteDeviceSenderKey: (target, groupId) => gate.runShared(() => lock.runMany(groupId
            ? [
                senderAnyLockKey(target),
                senderKeyLockKey(groupId, target),
                senderDistributionLockKey(groupId, target)
            ]
            : [senderAnyLockKey(target)], () => store.deleteDeviceSenderKey(target, groupId))),
        markForgetSenderKey: (groupId, participants) => gate.runShared(() => lock.runMany(participants.flatMap((participant) => [
            senderAnyLockKey(participant),
            senderKeyLockKey(groupId, participant)
        ]), () => store.markForgetSenderKey(groupId, participants))),
        clear: () => gate.runExclusive(() => lock.run(WA_SENDER_KEY_CLEAR_KEY, () => store.clear())),
        destroy: async () => {
            await gate.close();
            await lock.shutdown();
            await destroyStore.destroy?.();
        }
    };
}
