"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignalSessionResolver = createSignalSessionResolver;
const keys_1 = require("../../crypto/core/keys");
const PromiseDedup_1 = require("../../infra/perf/PromiseDedup");
const jid_1 = require("../../protocol/jid");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
/** Builds a {@link SignalSessionResolver} backed by the given Signal APIs and stores. */
function createSignalSessionResolver(options) {
    const { signalProtocol, sessionStore, identityStore, signalIdentitySync, signalSessionSync, logger } = options;
    const dedup = new PromiseDedup_1.PromiseDedup();
    const ensureSessionInternal = async (address, jid, expectedIdentity, reasonIdentity = false, prefetchedBundle, knownAbsent = false) => {
        const jidLogger = logger.child({ jid });
        const expectedSerializedIdentity = expectedIdentity
            ? (0, keys_1.toSerializedPubKey)(expectedIdentity)
            : null;
        if (reasonIdentity) {
            await signalIdentitySync.syncIdentityKeys([jid]);
        }
        if (!knownAbsent && (await sessionStore.hasSession(address))) {
            if (expectedSerializedIdentity) {
                const storedIdentity = await identityStore.getRemoteIdentity(address);
                if (!storedIdentity || !(0, bytes_1.uint8Equal)(storedIdentity, expectedSerializedIdentity)) {
                    jidLogger.warn('signal identity mismatch on stored identity', {
                        source: 'stored_vs_expected',
                        expected: (0, bytes_1.bytesToHex)(expectedSerializedIdentity),
                        stored: storedIdentity ? (0, bytes_1.bytesToHex)(storedIdentity) : null
                    });
                    throw new Error('identity mismatch');
                }
            }
            return null;
        }
        let fetched;
        if (prefetchedBundle) {
            fetched = {
                jid,
                bundle: prefetchedBundle
            };
        }
        else {
            jidLogger.debug('signal session missing, fetching remote key bundle');
            fetched = await signalSessionSync.fetchKeyBundle({
                jid,
                reasonIdentity
            });
        }
        const remoteIdentity = (0, keys_1.toSerializedPubKey)(fetched.bundle.identity);
        if (reasonIdentity) {
            const storedIdentity = await identityStore.getRemoteIdentity(address);
            if (storedIdentity && !(0, bytes_1.uint8Equal)(remoteIdentity, storedIdentity)) {
                jidLogger.warn('signal identity mismatch on fetched bundle vs stored', {
                    source: 'remote_vs_stored',
                    remote: (0, bytes_1.bytesToHex)(remoteIdentity),
                    stored: (0, bytes_1.bytesToHex)(storedIdentity)
                });
                throw new Error('identity mismatch');
            }
        }
        if (expectedSerializedIdentity && !(0, bytes_1.uint8Equal)(remoteIdentity, expectedSerializedIdentity)) {
            jidLogger.warn('signal identity mismatch on fetched bundle vs expected', {
                source: 'remote_vs_expected',
                remote: (0, bytes_1.bytesToHex)(remoteIdentity),
                expected: (0, bytes_1.bytesToHex)(expectedSerializedIdentity)
            });
            throw new Error('identity mismatch');
        }
        const session = await signalProtocol.establishOutgoingSession(address, fetched.bundle, {
            reuseExisting: true,
            knownAbsent
        });
        jidLogger.debug('signal session synchronized', {
            regId: fetched.bundle.regId,
            hasOneTimeKey: fetched.bundle.oneTimeKey !== undefined
        });
        return session;
    };
    const ensureSessionWithDedup = (address, jid, expectedIdentity, reasonIdentity = false, prefetchedBundle, knownAbsent = false) => {
        const expectedIdentityKey = expectedIdentity ? (0, bytes_1.bytesToHex)(expectedIdentity) : 'none';
        // knownAbsent is part of the dedup key: single-caller (false) and
        // batch (true) must NOT share a Promise, or the unsafe variant
        // could leak to the safe caller. Per-address lock + the recheck
        // inside persistOutgoingSessionsBatch resolves any race.
        const dedupKey = `signalSession:${(0, jid_1.signalAddressKey)(address)}:${reasonIdentity ? '1' : '0'}:${expectedIdentityKey}:${knownAbsent ? '1' : '0'}`;
        return dedup.run(dedupKey, () => ensureSessionInternal(address, jid, expectedIdentity, reasonIdentity, prefetchedBundle, knownAbsent));
    };
    const ensureSession = (address, jid, expectedIdentity, reasonIdentity = false) => ensureSessionWithDedup(address, jid, expectedIdentity, reasonIdentity).then(() => { });
    const ensureSessionsBatch = async (targetJids, expectedIdentityByJid) => {
        const seenTargetJids = new Set();
        const normalizedTargetJids = new Array(targetJids.length);
        const normalizedTargetAddresses = new Array(targetJids.length);
        let normalizedTargetCount = 0;
        for (let index = 0; index < targetJids.length; index += 1) {
            const jid = (0, jid_1.normalizeDeviceJid)(targetJids[index]);
            if (seenTargetJids.has(jid)) {
                continue;
            }
            seenTargetJids.add(jid);
            normalizedTargetJids[normalizedTargetCount] = jid;
            normalizedTargetAddresses[normalizedTargetCount] = (0, jid_1.parseSignalAddressFromJid)(jid);
            normalizedTargetCount += 1;
        }
        if (normalizedTargetCount === 0) {
            return [];
        }
        normalizedTargetJids.length = normalizedTargetCount;
        normalizedTargetAddresses.length = normalizedTargetCount;
        const normalizedExpectedIdentityByJid = expectedIdentityByJid && expectedIdentityByJid.size > 0
            ? new Map()
            : undefined;
        if (normalizedExpectedIdentityByJid && expectedIdentityByJid) {
            for (const [jid, identity] of expectedIdentityByJid.entries()) {
                try {
                    (0, keys_1.toSerializedPubKey)(identity);
                    normalizedExpectedIdentityByJid.set((0, jid_1.normalizeDeviceJid)(jid), identity);
                }
                catch (error) {
                    logger.trace('ignoring malformed expected identity jid during batch normalization', { jid, message: (0, primitives_1.toError)(error).message });
                }
            }
        }
        const resolvedByIndex = (await sessionStore.getSessionsBatch(normalizedTargetAddresses));
        const collectResolvedTargets = () => {
            const resolvedTargets = new Array(normalizedTargetJids.length);
            let resolvedTargetCount = 0;
            for (let index = 0; index < normalizedTargetJids.length; index += 1) {
                const session = resolvedByIndex[index];
                if (!session) {
                    continue;
                }
                resolvedTargets[resolvedTargetCount] = {
                    jid: normalizedTargetJids[index],
                    address: normalizedTargetAddresses[index],
                    session
                };
                resolvedTargetCount += 1;
            }
            resolvedTargets.length = resolvedTargetCount;
            return resolvedTargets;
        };
        const missingIndices = [];
        for (let index = 0; index < normalizedTargetJids.length; index += 1) {
            const session = resolvedByIndex[index];
            const expectedIdentity = normalizedExpectedIdentityByJid?.get(normalizedTargetJids[index]);
            if (session && expectedIdentity) {
                const expectedSerialized = (0, keys_1.toSerializedPubKey)(expectedIdentity);
                if (!(0, bytes_1.uint8Equal)(session.remote.pubKey, expectedSerialized)) {
                    logger.warn('signal identity mismatch on existing session vs expected', {
                        jid: normalizedTargetJids[index],
                        source: 'session_vs_expected',
                        session: (0, bytes_1.bytesToHex)(session.remote.pubKey),
                        expected: (0, bytes_1.bytesToHex)(expectedSerialized)
                    });
                    throw new Error('identity mismatch');
                }
            }
            if (!session) {
                missingIndices.push(index);
            }
        }
        if (missingIndices.length === 0) {
            return collectResolvedTargets();
        }
        const batchRequest = new Array(missingIndices.length);
        for (let index = 0; index < missingIndices.length; index += 1) {
            batchRequest[index] = { jid: normalizedTargetJids[missingIndices[index]] };
        }
        let batchResults;
        try {
            batchResults = await signalSessionSync.fetchKeyBundles(batchRequest);
        }
        catch (error) {
            logger.warn('signal batch key fetch failed', {
                requested: missingIndices.length,
                message: (0, primitives_1.toError)(error).message
            });
            return collectResolvedTargets();
        }
        // Prepare under per-address locks (no persist). Bulk persist below
        // holds every per-address lock at once via persistOutgoingSessionsBatch.
        const prepareTargetIndices = new Array(missingIndices.length);
        const preparePromises = new Array(missingIndices.length);
        let prepareCount = 0;
        const missingBundleTargets = [];
        let localIdentityPromise = null;
        for (let index = 0; index < missingIndices.length; index += 1) {
            const targetIndex = missingIndices[index];
            const targetJid = normalizedTargetJids[targetIndex];
            const batchResult = batchResults[index];
            if (!batchResult?.bundle) {
                missingBundleTargets.push({
                    jid: targetJid,
                    reason: batchResult?.errorText ?? 'missing key bundle user in response'
                });
                continue;
            }
            const expectedIdentity = normalizedExpectedIdentityByJid?.get(targetJid);
            const expectedSerializedIdentity = expectedIdentity
                ? (0, keys_1.toSerializedPubKey)(expectedIdentity)
                : null;
            const bundleIdentity = (0, keys_1.toSerializedPubKey)(batchResult.bundle.identity);
            if (expectedSerializedIdentity &&
                !(0, bytes_1.uint8Equal)(bundleIdentity, expectedSerializedIdentity)) {
                logger.warn('signal identity mismatch on fetched batch bundle vs expected', {
                    jid: targetJid,
                    source: 'bundle_vs_expected',
                    bundle: (0, bytes_1.bytesToHex)(bundleIdentity),
                    expected: (0, bytes_1.bytesToHex)(expectedSerializedIdentity)
                });
                throw new Error('identity mismatch');
            }
            const targetAddress = normalizedTargetAddresses[targetIndex];
            const bundle = batchResult.bundle;
            prepareTargetIndices[prepareCount] = targetIndex;
            localIdentityPromise ?? (localIdentityPromise = signalProtocol.loadLocalIdentity());
            preparePromises[prepareCount] = localIdentityPromise
                .then((localIdentity) => signalProtocol.prepareOutgoingSession(targetAddress, bundle, {
                reuseExisting: true,
                knownAbsent: true,
                localIdentity
            }))
                .then((prep) => ({
                session: prep.session,
                remoteIdentity: prep.remoteIdentity
            }));
            prepareCount += 1;
        }
        if (missingBundleTargets.length > 0) {
            logger.warn('signal batch key fetch returned targets without bundle', {
                droppedCount: missingBundleTargets.length,
                totalRequested: missingIndices.length,
                sample: missingBundleTargets.slice(0, 3)
            });
        }
        if (prepareCount === 0) {
            return collectResolvedTargets();
        }
        prepareTargetIndices.length = prepareCount;
        preparePromises.length = prepareCount;
        const prepareResults = await Promise.allSettled(preparePromises);
        const batchEntries = [];
        const entryToTargetIndex = [];
        const fallbackIndices = [];
        const fallbackIndexSet = new Set();
        for (let i = 0; i < prepareTargetIndices.length; i += 1) {
            const targetIndex = prepareTargetIndices[i];
            const result = prepareResults[i];
            if (result.status === 'rejected') {
                const normalized = (0, primitives_1.toError)(result.reason);
                if (normalized.message === 'identity mismatch') {
                    throw normalized;
                }
                logger.warn('signal session prepare failed during batch resolution', {
                    jid: normalizedTargetJids[targetIndex],
                    message: normalized.message
                });
                continue;
            }
            batchEntries.push({
                address: normalizedTargetAddresses[targetIndex],
                session: result.value.session,
                remoteIdentity: result.value.remoteIdentity
            });
            entryToTargetIndex.push(targetIndex);
        }
        if (batchEntries.length === 0) {
            return collectResolvedTargets();
        }
        let persistResult;
        try {
            persistResult = await signalProtocol.persistOutgoingSessionsBatch(batchEntries);
        }
        catch (error) {
            const normalized = (0, primitives_1.toError)(error);
            logger.warn('signal batched session persist failed', {
                requested: batchEntries.length,
                message: normalized.message
            });
            for (let i = 0; i < entryToTargetIndex.length; i += 1) {
                fallbackIndexSet.add(entryToTargetIndex[i]);
                fallbackIndices.push(entryToTargetIndex[i]);
            }
            persistResult = { resolved: [], skipped: [] };
        }
        const sessionByAddressKey = new Map();
        for (const r of persistResult.resolved) {
            sessionByAddressKey.set((0, jid_1.signalAddressKey)(r.address), r.session);
        }
        const skippedByAddressKey = new Set();
        for (const s of persistResult.skipped) {
            skippedByAddressKey.add((0, jid_1.signalAddressKey)(s.address));
            logger.warn('signal session persist skipped due to identity conflict', {
                user: s.address.user,
                server: s.address.server,
                device: s.address.device
            });
        }
        for (let i = 0; i < entryToTargetIndex.length; i += 1) {
            const targetIndex = entryToTargetIndex[i];
            const addrKey = (0, jid_1.signalAddressKey)(normalizedTargetAddresses[targetIndex]);
            const session = sessionByAddressKey.get(addrKey);
            if (session) {
                resolvedByIndex[targetIndex] = session;
                continue;
            }
            if (skippedByAddressKey.has(addrKey)) {
                continue;
            }
            if (!fallbackIndexSet.has(targetIndex)) {
                fallbackIndexSet.add(targetIndex);
                fallbackIndices.push(targetIndex);
            }
        }
        if (fallbackIndices.length > 0) {
            const fallbackAddresses = new Array(fallbackIndices.length);
            for (let i = 0; i < fallbackIndices.length; i++) {
                fallbackAddresses[i] = normalizedTargetAddresses[fallbackIndices[i]];
            }
            const fallbackSessions = await sessionStore.getSessionsBatch(fallbackAddresses);
            for (let i = 0; i < fallbackIndices.length; i++) {
                const session = fallbackSessions[i];
                if (session) {
                    resolvedByIndex[fallbackIndices[i]] = session;
                }
                else {
                    logger.warn('signal session ensure completed without persisted session', {
                        jid: normalizedTargetJids[fallbackIndices[i]]
                    });
                }
            }
        }
        return collectResolvedTargets();
    };
    return {
        ensureSession,
        ensureSessionsBatch
    };
}
