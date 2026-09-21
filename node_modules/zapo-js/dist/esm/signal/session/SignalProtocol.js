import { toSerializedPubKey } from '../../crypto/index.js';
import { ConsoleLogger } from '../../infra/log/ConsoleLogger.js';
import { StoreLock } from '../../infra/perf/StoreLock.js';
import { signalAddressKey } from '../../protocol/jid.js';
import { MAX_PREV_SESSIONS } from '../constants.js';
import { encodeSignalSessionSnapshot } from '../session/encoding.js';
import { decryptMsg, decryptMsgFromSession, encryptMsg } from '../session/SignalRatchet.js';
import { deserializeMsg, deserializePkMsg, requirePreKey, requireSignedPreKey } from '../session/SignalSerializer.js';
import { findMatchingSession, generateSerializedKeyPair, initiateSessionIncoming, initiateSessionOutgoing, requireLocalIdentity, toSerializedKeyPair } from '../session/SignalSession.js';
import { uint8Equal } from '../../util/bytes.js';
function signalAddressLockKey(address) {
    return `signal:${signalAddressKey(address)}`;
}
/**
 * High-level Signal protocol session orchestrator: establishes outgoing
 * sessions from prekey bundles, encrypts/decrypts ratchet messages, and owns
 * the per-address session mutation lock.
 */
export class SignalProtocol {
    constructor(stores, logger = new ConsoleLogger('info')) {
        this.stores = stores;
        this.logger = logger;
        this.sessionMutationLock = new StoreLock();
    }
    /**
     * Loads the local registration identity once so batch callers can share
     * it across many `prepareOutgoingSession` calls via
     * `options.localIdentity` instead of re-reading the store per address.
     */
    async loadLocalIdentity() {
        return requireLocalIdentity(this.stores.signal);
    }
    /**
     * Builds an outgoing Signal session against a remote prekey bundle. Set
     * `options.reuseExisting` to skip the handshake when a session already
     * exists for the same remote identity. Set `options.knownAbsent` only
     * when the caller already proved (within the same logical step) that no
     * session exists; it skips the in-lock recheck and forces a new handshake.
     */
    async establishOutgoingSession(address, remoteBundle, options = {}) {
        return this.runWithAddressLock(address, async () => {
            if (options.reuseExisting && !options.knownAbsent) {
                const existing = await this.stores.session.getSession(address);
                if (existing) {
                    const remoteIdentity = toSerializedPubKey(remoteBundle.identity);
                    if (!uint8Equal(existing.remote.pubKey, remoteIdentity)) {
                        throw new Error('identity mismatch');
                    }
                    return existing;
                }
            }
            const [local, localOneTimeBase] = await Promise.all([
                options.localIdentity ?? requireLocalIdentity(this.stores.signal),
                generateSerializedKeyPair()
            ]);
            const session = await initiateSessionOutgoing(local, remoteBundle, localOneTimeBase);
            // Keep writes ordered: a stored session without matching remote identity causes false mismatch checks.
            await this.stores.identity.setRemoteIdentity(address, session.remote.pubKey);
            await this.stores.session.setSession(address, session);
            return session;
        });
    }
    /**
     * Compute an outgoing session under the per-address lock without
     * persisting. Caller batches results and persists via
     * {@link persistOutgoingSessionsBatch} to collapse N `setRemoteIdentity`
     * + `setSession` round-trips into one bulk write per store.
     */
    async prepareOutgoingSession(address, remoteBundle, options = {}) {
        return this.runWithAddressLock(address, async () => {
            if (options.reuseExisting && !options.knownAbsent) {
                const existing = await this.stores.session.getSession(address);
                if (existing) {
                    const remoteIdentity = toSerializedPubKey(remoteBundle.identity);
                    if (!uint8Equal(existing.remote.pubKey, remoteIdentity)) {
                        throw new Error('identity mismatch');
                    }
                    return {
                        session: existing,
                        remoteIdentity: existing.remote.pubKey,
                        reusedExisting: true
                    };
                }
            }
            const [local, localOneTimeBase] = await Promise.all([
                options.localIdentity ?? requireLocalIdentity(this.stores.signal),
                generateSerializedKeyPair()
            ]);
            const session = await initiateSessionOutgoing(local, remoteBundle, localOneTimeBase);
            return {
                session,
                remoteIdentity: session.remote.pubKey,
                reusedExisting: false
            };
        });
    }
    /**
     * Persist prepared outgoing sessions while holding every per-address
     * lock (same discipline as {@link encryptMessagesBatch}). Re-reads
     * sessions inside the lock; defers to a concurrent writer's session
     * when identities agree to avoid clobbering a fresher ratchet advance,
     * and reports identity conflicts via `skipped`.
     */
    async persistOutgoingSessionsBatch(entries) {
        if (entries.length === 0)
            return { resolved: [], skipped: [] };
        const lockKeys = new Array(entries.length);
        for (let i = 0; i < entries.length; i += 1) {
            lockKeys[i] = signalAddressLockKey(entries[i].address);
        }
        return this.sessionMutationLock.runMany(lockKeys, async () => {
            const addresses = entries.map((e) => e.address);
            const existingSessions = await this.stores.session.getSessionsBatch(addresses);
            const identityUpdates = [];
            const sessionUpdates = [];
            const resolved = [];
            const skipped = [];
            for (let i = 0; i < entries.length; i += 1) {
                const entry = entries[i];
                const existing = existingSessions[i];
                if (existing) {
                    if (uint8Equal(existing.remote.pubKey, entry.remoteIdentity)) {
                        resolved.push({ address: entry.address, session: existing });
                        continue;
                    }
                    skipped.push({ address: entry.address, reason: 'identity-mismatch' });
                    continue;
                }
                identityUpdates.push({
                    address: entry.address,
                    identityKey: entry.remoteIdentity
                });
                sessionUpdates.push({ address: entry.address, session: entry.session });
                resolved.push({ address: entry.address, session: entry.session });
            }
            if (identityUpdates.length > 0) {
                await this.stores.identity.setRemoteIdentities(identityUpdates);
            }
            if (sessionUpdates.length > 0) {
                await this.stores.session.setSessionsBatch(sessionUpdates);
            }
            return { resolved, skipped };
        });
    }
    /**
     * Encrypts `plaintext` for `address`. Returns `pkmsg` when this is the
     * first message of the session, `msg` otherwise. `expectedIdentity`
     * enforces identity continuity.
     */
    async encryptMessage(address, plaintext, expectedIdentity) {
        const [encrypted] = await this.encryptMessagesBatch([
            { address, plaintext, expectedIdentity }
        ]);
        return encrypted;
    }
    /** Batch variant of {@link encryptMessage} that shares per-address locks. */
    async encryptMessagesBatch(requests, prefetchedSessions) {
        if (requests.length === 0) {
            return [];
        }
        const lockKeySet = new Set();
        for (let i = 0; i < requests.length; i += 1)
            lockKeySet.add(signalAddressLockKey(requests[i].address));
        const lockKeys = [...lockKeySet];
        return this.sessionMutationLock.runMany(lockKeys, async () => {
            const prefetchedByAddress = new Map();
            if (prefetchedSessions && prefetchedSessions.length > 0) {
                for (let index = 0; index < prefetchedSessions.length; index += 1) {
                    const entry = prefetchedSessions[index];
                    prefetchedByAddress.set(signalAddressKey(entry.address), entry.session);
                }
            }
            const addressKeys = new Array(requests.length);
            const seenAddressKeys = new Set();
            const uniqueAddressKeys = [];
            const uniqueAddresses = [];
            for (let index = 0; index < requests.length; index += 1) {
                const address = requests[index].address;
                const addressKey = signalAddressKey(address);
                addressKeys[index] = addressKey;
                if (seenAddressKeys.has(addressKey)) {
                    continue;
                }
                seenAddressKeys.add(addressKey);
                uniqueAddressKeys.push(addressKey);
                uniqueAddresses.push(address);
            }
            const currentSessions = await this.stores.session.getSessionsBatch(uniqueAddresses);
            const latestSessionByAddress = new Map();
            for (let index = 0; index < uniqueAddresses.length; index += 1) {
                const addressKey = uniqueAddressKeys[index];
                const current = currentSessions[index];
                if (current) {
                    latestSessionByAddress.set(addressKey, current);
                    continue;
                }
                const prefetched = prefetchedByAddress.get(addressKey);
                if (prefetched) {
                    latestSessionByAddress.set(addressKey, prefetched);
                }
            }
            const sessionUpdatesByAddress = new Map();
            const identityUpdatesByAddress = new Map();
            const results = new Array(requests.length);
            for (let index = 0; index < requests.length; index += 1) {
                const request = requests[index];
                const address = request.address;
                const addressKey = addressKeys[index];
                const session = latestSessionByAddress.get(addressKey);
                if (!session) {
                    throw new Error('signal session not found');
                }
                if (request.expectedIdentity &&
                    !uint8Equal(toSerializedPubKey(request.expectedIdentity), session.remote.pubKey)) {
                    throw new Error('identity mismatch');
                }
                const [updatedSession, encrypted] = encryptMsg(session, request.plaintext);
                latestSessionByAddress.set(addressKey, updatedSession);
                sessionUpdatesByAddress.set(addressKey, {
                    address,
                    session: updatedSession
                });
                if (!uint8Equal(updatedSession.remote.pubKey, session.remote.pubKey)) {
                    identityUpdatesByAddress.set(addressKey, {
                        address,
                        identityKey: updatedSession.remote.pubKey
                    });
                }
                results[index] = {
                    ...encrypted,
                    baseKey: updatedSession.aliceBaseKey
                };
            }
            // Persist remote identities first when needed so session writes never commit ahead of identity data.
            if (identityUpdatesByAddress.size > 0) {
                const identityUpdates = new Array(identityUpdatesByAddress.size);
                let identityIndex = 0;
                for (const update of identityUpdatesByAddress.values()) {
                    identityUpdates[identityIndex] = update;
                    identityIndex += 1;
                }
                await this.stores.identity.setRemoteIdentities(identityUpdates);
            }
            const sessionUpdates = new Array(sessionUpdatesByAddress.size);
            let sessionIndex = 0;
            for (const update of sessionUpdatesByAddress.values()) {
                sessionUpdates[sessionIndex] = update;
                sessionIndex += 1;
            }
            await this.stores.session.setSessionsBatch(sessionUpdates);
            return results;
        });
    }
    /**
     * Decrypts a Signal message (`msg` or `pkmsg`) from `address`. For
     * `pkmsg`, instantiates the session from the embedded bundle when needed.
     */
    async decryptMessage(address, envelope) {
        return this.runWithAddressLock(address, async () => {
            const currentSession = await this.stores.session.getSession(address);
            let outcome;
            if (envelope.type === 'pkmsg') {
                const parsedPk = deserializePkMsg(envelope.ciphertext);
                outcome = await this.decryptPkMsg(currentSession, parsedPk);
            }
            else {
                const parsed = deserializeMsg(envelope.ciphertext);
                outcome = await decryptMsg(currentSession, parsed, (error, previousSessionIndex) => {
                    this.logger.debug('signal decrypt fallback session failed', {
                        previousSessionIndex,
                        message: error.message
                    });
                });
            }
            const nextRemoteIdentity = outcome.newSessionInfo?.newIdentity ?? outcome.updatedSession.remote.pubKey;
            const identityChanged = !currentSession || !uint8Equal(currentSession.remote.pubKey, nextRemoteIdentity);
            // Keep writes ordered for consistency with resolver identity checks.
            if (identityChanged) {
                await this.stores.identity.setRemoteIdentity(address, nextRemoteIdentity);
            }
            await this.stores.session.setSession(address, outcome.updatedSession);
            return outcome.plaintext;
        });
    }
    runWithAddressLock(address, task) {
        return this.sessionMutationLock.run(signalAddressLockKey(address), task);
    }
    async decryptPkMsg(currentSession, parsed) {
        const matchingSession = findMatchingSession(currentSession, parsed.sessionBaseKey);
        if (matchingSession) {
            const [updatedSession, plaintext] = await decryptMsgFromSession(matchingSession, parsed);
            return {
                updatedSession,
                plaintext,
                newSessionInfo: null
            };
        }
        const [local, signedPreKey, oneTimePreKey] = await Promise.all([
            requireLocalIdentity(this.stores.signal),
            requireSignedPreKey(this.stores.signal, parsed.localSignedPreKeyId),
            parsed.localOneTimeKeyId === null || parsed.localOneTimeKeyId === undefined
                ? Promise.resolve(null)
                : requirePreKey(this.stores.preKey, parsed.localOneTimeKeyId)
        ]);
        const incoming = await initiateSessionIncoming(local, parsed.remote, parsed.sessionBaseKey, {
            signed: toSerializedKeyPair(signedPreKey.keyPair),
            oneTime: oneTimePreKey ? toSerializedKeyPair(oneTimePreKey.keyPair) : undefined,
            ratchet: toSerializedKeyPair(signedPreKey.keyPair)
        });
        const newIdentity = !currentSession || !uint8Equal(incoming.remote.pubKey, currentSession.remote.pubKey)
            ? incoming.remote.pubKey
            : null;
        const baseSession = currentSession
            ? {
                ...incoming,
                prevSessions: [
                    encodeSignalSessionSnapshot(currentSession),
                    ...currentSession.prevSessions.slice(0, MAX_PREV_SESSIONS - 1)
                ]
            }
            : incoming;
        const [updatedSession, plaintext] = await decryptMsgFromSession(baseSession, parsed);
        // Only consume one-time prekeys after successful decrypt/session materialization.
        if (parsed.localOneTimeKeyId !== null && parsed.localOneTimeKeyId !== undefined) {
            await this.stores.preKey.consumePreKeyById(parsed.localOneTimeKeyId);
        }
        return {
            updatedSession,
            plaintext,
            newSessionInfo: {
                newIdentity,
                baseSession,
                usedPreKey: parsed.localOneTimeKeyId
            }
        };
    }
}
