"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalProtocol = void 0;
const _crypto_1 = require("../../crypto");
const ConsoleLogger_1 = require("../../infra/log/ConsoleLogger");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const jid_1 = require("../../protocol/jid");
const constants_1 = require("../constants");
const encoding_1 = require("../session/encoding");
const SignalRatchet_1 = require("../session/SignalRatchet");
const SignalSerializer_1 = require("../session/SignalSerializer");
const SignalSession_1 = require("../session/SignalSession");
const bytes_1 = require("../../util/bytes");
function signalAddressLockKey(address) {
    return `signal:${(0, jid_1.signalAddressKey)(address)}`;
}
/**
 * High-level Signal protocol session orchestrator: establishes outgoing
 * sessions from prekey bundles, encrypts/decrypts ratchet messages, and owns
 * the per-address session mutation lock.
 */
class SignalProtocol {
    constructor(stores, logger = new ConsoleLogger_1.ConsoleLogger('info')) {
        this.stores = stores;
        this.logger = logger;
        this.sessionMutationLock = new StoreLock_1.StoreLock();
    }
    /**
     * Loads the local registration identity once so batch callers can share
     * it across many `prepareOutgoingSession` calls via
     * `options.localIdentity` instead of re-reading the store per address.
     */
    async loadLocalIdentity() {
        return (0, SignalSession_1.requireLocalIdentity)(this.stores.signal);
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
                    const remoteIdentity = (0, _crypto_1.toSerializedPubKey)(remoteBundle.identity);
                    if (!(0, bytes_1.uint8Equal)(existing.remote.pubKey, remoteIdentity)) {
                        throw new Error('identity mismatch');
                    }
                    return existing;
                }
            }
            const [local, localOneTimeBase] = await Promise.all([
                options.localIdentity ?? (0, SignalSession_1.requireLocalIdentity)(this.stores.signal),
                (0, SignalSession_1.generateSerializedKeyPair)()
            ]);
            const session = await (0, SignalSession_1.initiateSessionOutgoing)(local, remoteBundle, localOneTimeBase);
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
                    const remoteIdentity = (0, _crypto_1.toSerializedPubKey)(remoteBundle.identity);
                    if (!(0, bytes_1.uint8Equal)(existing.remote.pubKey, remoteIdentity)) {
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
                options.localIdentity ?? (0, SignalSession_1.requireLocalIdentity)(this.stores.signal),
                (0, SignalSession_1.generateSerializedKeyPair)()
            ]);
            const session = await (0, SignalSession_1.initiateSessionOutgoing)(local, remoteBundle, localOneTimeBase);
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
                    if ((0, bytes_1.uint8Equal)(existing.remote.pubKey, entry.remoteIdentity)) {
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
                    prefetchedByAddress.set((0, jid_1.signalAddressKey)(entry.address), entry.session);
                }
            }
            const addressKeys = new Array(requests.length);
            const seenAddressKeys = new Set();
            const uniqueAddressKeys = [];
            const uniqueAddresses = [];
            for (let index = 0; index < requests.length; index += 1) {
                const address = requests[index].address;
                const addressKey = (0, jid_1.signalAddressKey)(address);
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
                    !(0, bytes_1.uint8Equal)((0, _crypto_1.toSerializedPubKey)(request.expectedIdentity), session.remote.pubKey)) {
                    throw new Error('identity mismatch');
                }
                const [updatedSession, encrypted] = (0, SignalRatchet_1.encryptMsg)(session, request.plaintext);
                latestSessionByAddress.set(addressKey, updatedSession);
                sessionUpdatesByAddress.set(addressKey, {
                    address,
                    session: updatedSession
                });
                if (!(0, bytes_1.uint8Equal)(updatedSession.remote.pubKey, session.remote.pubKey)) {
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
                const parsedPk = (0, SignalSerializer_1.deserializePkMsg)(envelope.ciphertext);
                outcome = await this.decryptPkMsg(currentSession, parsedPk);
            }
            else {
                const parsed = (0, SignalSerializer_1.deserializeMsg)(envelope.ciphertext);
                outcome = await (0, SignalRatchet_1.decryptMsg)(currentSession, parsed, (error, previousSessionIndex) => {
                    this.logger.debug('signal decrypt fallback session failed', {
                        previousSessionIndex,
                        message: error.message
                    });
                });
            }
            const nextRemoteIdentity = outcome.newSessionInfo?.newIdentity ?? outcome.updatedSession.remote.pubKey;
            const identityChanged = !currentSession || !(0, bytes_1.uint8Equal)(currentSession.remote.pubKey, nextRemoteIdentity);
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
        const matchingSession = (0, SignalSession_1.findMatchingSession)(currentSession, parsed.sessionBaseKey);
        if (matchingSession) {
            const [updatedSession, plaintext] = await (0, SignalRatchet_1.decryptMsgFromSession)(matchingSession, parsed);
            return {
                updatedSession,
                plaintext,
                newSessionInfo: null
            };
        }
        const [local, signedPreKey, oneTimePreKey] = await Promise.all([
            (0, SignalSession_1.requireLocalIdentity)(this.stores.signal),
            (0, SignalSerializer_1.requireSignedPreKey)(this.stores.signal, parsed.localSignedPreKeyId),
            parsed.localOneTimeKeyId === null || parsed.localOneTimeKeyId === undefined
                ? Promise.resolve(null)
                : (0, SignalSerializer_1.requirePreKey)(this.stores.preKey, parsed.localOneTimeKeyId)
        ]);
        const incoming = await (0, SignalSession_1.initiateSessionIncoming)(local, parsed.remote, parsed.sessionBaseKey, {
            signed: (0, SignalSession_1.toSerializedKeyPair)(signedPreKey.keyPair),
            oneTime: oneTimePreKey ? (0, SignalSession_1.toSerializedKeyPair)(oneTimePreKey.keyPair) : undefined,
            ratchet: (0, SignalSession_1.toSerializedKeyPair)(signedPreKey.keyPair)
        });
        const newIdentity = !currentSession || !(0, bytes_1.uint8Equal)(incoming.remote.pubKey, currentSession.remote.pubKey)
            ? incoming.remote.pubKey
            : null;
        const baseSession = currentSession
            ? {
                ...incoming,
                prevSessions: [
                    (0, encoding_1.encodeSignalSessionSnapshot)(currentSession),
                    ...currentSession.prevSessions.slice(0, constants_1.MAX_PREV_SESSIONS - 1)
                ]
            }
            : incoming;
        const [updatedSession, plaintext] = await (0, SignalRatchet_1.decryptMsgFromSession)(baseSession, parsed);
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
exports.SignalProtocol = SignalProtocol;
