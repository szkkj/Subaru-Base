import { APP_STATE_DEFAULT_COLLECTION_VERSION, APP_STATE_DEFAULT_COLLECTIONS, APP_STATE_EMPTY_LT_HASH } from '../constants.js';
import { WaAppStateCrypto } from '../crypto/WaAppStateCrypto.js';
import { parseSyncResponse } from '../parsers/response-parser.js';
import { randomBytesAsync, randomIntAsync } from '../../crypto/index.js';
import { proto } from '../../proto.js';
import { WA_APP_STATE_COLLECTION_STATES, WA_DEFAULTS, WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../protocol/constants.js';
import { applyDeviceToJid, normalizeDeviceJid, parseSignalAddressFromJid } from '../../protocol/jid.js';
import { assertIqResult } from '../../transport/node/query.js';
import { bytesToHex, decodeProtoBytes, uint8TimingSafeEqual } from '../../util/bytes.js';
import { longToNumber, toError } from '../../util/primitives.js';
class WaAppStateMissingKeyError extends Error {
    constructor(message, keyId, collection) {
        super(message);
        this.keyId = keyId;
        this.collection = collection;
        this.name = 'WaAppStateMissingKeyError';
    }
}
/**
 * App-state synchronization client. Owns the sync key inventory, processes
 * snapshots/patches, encrypts pending mutations, and persists the resulting
 * collection state in the {@link WaAppStateStore}.
 */
export class WaAppStateSyncClient {
    constructor(options) {
        this.logger = options.logger;
        this.query = options.query;
        this.store = options.store;
        this.serverClock = options.serverClock;
        this.getCurrentMeJid = options.getCurrentMeJid;
        this.hostDomain = options.hostDomain ?? WA_DEFAULTS.HOST_DOMAIN;
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? WA_DEFAULTS.APP_STATE_SYNC_TIMEOUT_MS;
        this.onMissingKeys = options.onMissingKeys;
        this.isOwnAccountDevice = options.isOwnAccountDevice;
        this.sendKeyShare = options.sendKeyShare;
        this.triggerSync = options.triggerSync;
        this.crypto = new WaAppStateCrypto(undefined, options.skipMacVerification === true);
        this.mobilePrimary = options.mobilePrimary ?? (() => false);
        this.syncContext = null;
        this.syncPromise = null;
    }
    /**
     * Returns the active app-state sync key, generating and persisting a new
     * one when the store is empty (used during initial setup).
     *
     * The key id mirrors the primary device layout: 2 big-endian bytes of
     * device id followed by a 4 big-endian byte epoch. `keyEpoch` and
     * `pickActiveSyncKey` read that structure, so a shorter id would make the
     * generated key invisible to active-key selection.
     */
    async ensureInitialSyncKey() {
        const existing = await this.store.getActiveSyncKey();
        if (existing) {
            return existing;
        }
        const deviceId = this.resolveDeviceIndex() ?? 0;
        const epoch = await randomIntAsync(1, 65537);
        const keyIdBytes = new Uint8Array(6);
        keyIdBytes[0] = (deviceId >>> 8) & 0xff;
        keyIdBytes[1] = deviceId & 0xff;
        keyIdBytes[2] = (epoch >>> 24) & 0xff;
        keyIdBytes[3] = (epoch >>> 16) & 0xff;
        keyIdBytes[4] = (epoch >>> 8) & 0xff;
        keyIdBytes[5] = epoch & 0xff;
        const keyData = await randomBytesAsync(32);
        const rawId = await randomIntAsync(0, 4294967295);
        const key = {
            keyId: keyIdBytes,
            keyData,
            timestamp: this.serverClock.nowMs(),
            fingerprint: { rawId, currentIndex: 0, deviceIndexes: [0] }
        };
        await this.store.upsertSyncKeys([key]);
        this.crypto.clearCache();
        this.logger.info('app-state initial sync key generated (mobile primary)', {
            keyId: bytesToHex(keyIdBytes),
            epoch,
            rawId
        });
        return key;
    }
    /** Imports peer-shared sync keys into the store; returns the count actually added. */
    async importSyncKeys(keys) {
        this.logger.debug('app-state importing sync keys', { count: keys.length });
        const inserted = await this.store.upsertSyncKeys(keys);
        if (inserted > 0) {
            this.crypto.clearCache();
            this.logger.info('app-state sync keys persisted', { inserted });
        }
        return inserted;
    }
    /** Handler for `AppStateSyncKeyShare` protocol messages – stores received keys and triggers a sync. */
    async handleIncomingKeyShare(context, protocolMessage) {
        const log = this.logger.child({ id: context.id, from: context.remoteJid });
        const share = protocolMessage.appStateSyncKeyShare;
        if (!share) {
            log.warn('incoming app-state key share protocol message without payload');
            return;
        }
        try {
            const imported = await this.importSyncKeyShare(share);
            log.info('imported app-state sync key share from protocol message', { imported });
            if (imported > 0 && this.triggerSync) {
                void this.triggerSync().catch((error) => {
                    log.warn('failed to sync app-state after key share import', {
                        message: toError(error).message
                    });
                });
            }
        }
        catch (error) {
            log.warn('failed to import app-state sync key share from protocol message', {
                message: toError(error).message
            });
        }
    }
    /** Handler for `AppStateSyncKeyRequest` protocol messages – replies with the requested keys via `sendKeyShare`. */
    async handleIncomingKeyRequest(context, protocolMessage) {
        const log = this.logger.child({ id: context.id, from: context.remoteJid });
        const request = protocolMessage.appStateSyncKeyRequest;
        if (!request) {
            log.warn('incoming app-state key request protocol message without payload');
            return;
        }
        const senderJid = context.participant ?? context.remoteJid;
        if (!senderJid) {
            log.warn('incoming app-state key request missing sender jid');
            return;
        }
        let requesterDeviceJid;
        try {
            const requesterRaw = applyDeviceToJid(senderJid, context.senderDevice);
            requesterDeviceJid = normalizeDeviceJid(requesterRaw);
        }
        catch (error) {
            log.warn('incoming app-state key request has malformed sender jid', {
                senderJid,
                message: toError(error).message
            });
            return;
        }
        const deviceLog = log.child({ to: requesterDeviceJid });
        if (this.isOwnAccountDevice && !this.isOwnAccountDevice(requesterDeviceJid)) {
            deviceLog.warn('incoming app-state key request ignored: sender is not own account');
            return;
        }
        const requestedKeyIds = this.extractKeyRequestIds(request);
        if (requestedKeyIds.length === 0) {
            deviceLog.warn('incoming app-state key request has no valid key ids');
            return;
        }
        if (!this.sendKeyShare) {
            deviceLog.warn('incoming app-state key request received but no sendKeyShare wired');
            return;
        }
        const requestedKeys = await this.store.getSyncKeysBatch(requestedKeyIds);
        const availableKeys = [];
        const missingKeyIds = [];
        for (let i = 0; i < requestedKeys.length; i += 1) {
            const key = requestedKeys[i];
            if (key !== null) {
                availableKeys.push(key);
            }
            else {
                missingKeyIds.push(requestedKeyIds[i]);
            }
        }
        try {
            await this.sendKeyShare(requesterDeviceJid, availableKeys, missingKeyIds);
            deviceLog.info('responded to app-state key request', {
                requested: requestedKeyIds.length,
                shared: availableKeys.length,
                missing: missingKeyIds.length
            });
        }
        catch (error) {
            deviceLog.warn('failed to respond to app-state key request', {
                requested: requestedKeyIds.length,
                shared: availableKeys.length,
                missing: missingKeyIds.length,
                message: toError(error).message
            });
        }
    }
    extractKeyRequestIds(request) {
        const deduped = new Map();
        for (const key of request.keyIds ?? []) {
            try {
                const keyId = decodeProtoBytes(key.keyId, 'appStateSyncKeyRequest.keyIds[].keyId');
                const keyHex = bytesToHex(keyId);
                if (deduped.has(keyHex)) {
                    continue;
                }
                deduped.set(keyHex, keyId);
            }
            catch (error) {
                this.logger.trace('ignoring malformed app-state key id request entry', {
                    message: toError(error).message
                });
            }
        }
        return [...deduped.values()];
    }
    /** Imports the keys from a decoded `AppStateSyncKeyShare` proto message. */
    async importSyncKeyShare(share) {
        const keys = [];
        for (const item of share.keys ?? []) {
            const keyId = decodeProtoBytes(item.keyId?.keyId, 'appStateSyncKeyShare.keys[].keyId.keyId');
            if (!item.keyData?.keyData) {
                this.logger.debug('app-state sync key share entry missing key data', {
                    keyId: bytesToHex(keyId)
                });
                continue;
            }
            const keyData = decodeProtoBytes(item.keyData?.keyData, 'appStateSyncKeyShare.keys[].keyData.keyData');
            keys.push({
                keyId,
                keyData,
                timestamp: item.keyData?.timestamp === null || item.keyData?.timestamp === undefined
                    ? this.serverClock.nowMs()
                    : this.normalizeProtoLong(item.keyData?.timestamp, 'appStateSyncKeyShare.keys[].keyData.timestamp'),
                fingerprint: item.keyData?.fingerprint ?? undefined
            });
        }
        return this.importSyncKeys(keys);
    }
    /**
     * Runs one app-state sync round across the requested collections,
     * applying any `pendingMutations` and downloading external snapshots
     * via `options.downloadExternalBlob` when present. Concurrent calls
     * share the in-flight promise.
     */
    async sync(options = {}) {
        if (this.syncPromise) {
            this.logger.debug('app-state sync already in flight, joining existing run');
            return this.syncPromise;
        }
        const inFlight = this.syncOnce(options);
        this.syncPromise = inFlight;
        try {
            return await inFlight;
        }
        finally {
            if (this.syncPromise === inFlight) {
                this.syncPromise = null;
            }
        }
    }
    async syncOnce(options = {}) {
        const context = {
            keys: new Map(),
            collections: new Map(),
            dirtyCollections: new Set()
        };
        this.syncContext = context;
        const collections = [
            ...new Set(options.collections ?? APP_STATE_DEFAULT_COLLECTIONS)
        ];
        try {
            const initialCollectionStates = await this.store.getCollectionStates(collections);
            for (let index = 0; index < collections.length; index += 1) {
                context.collections.set(collections[index], initialCollectionStates[index]);
            }
            this.logger.debug('app-state sync start', {
                collections: collections.length,
                pendingMutations: options.pendingMutations?.length ?? 0
            });
            const pendingByCollection = this.groupPendingMutations(options.pendingMutations ?? []);
            const resultMap = new Map();
            let stateChanged = false;
            let collectionsToSync = [...collections];
            const missingKeysHandler = options.onMissingKeys ?? this.onMissingKeys;
            const maxSyncIterations = 5;
            let syncIteration = 0;
            while (collectionsToSync.length > 0) {
                syncIteration += 1;
                if (syncIteration > maxSyncIterations) {
                    this.logger.warn('app-state sync reached max iterations', {
                        maxSyncIterations,
                        remainingCollections: collectionsToSync
                    });
                    for (const collection of collectionsToSync) {
                        resultMap.set(collection, {
                            collection,
                            state: WA_APP_STATE_COLLECTION_STATES.ERROR_RETRY
                        });
                    }
                    break;
                }
                const round = await this.syncCollectionsRound(collectionsToSync, pendingByCollection, options);
                stateChanged = stateChanged || round.stateChanged;
                for (const result of round.results) {
                    resultMap.set(result.collection, result);
                }
                if (missingKeysHandler &&
                    round.missingKeyIds.length > 0 &&
                    round.blockedCollections.length > 0) {
                    await this.notifyMissingKeys({
                        onMissingKeys: missingKeysHandler,
                        keyIds: round.missingKeyIds,
                        collections: round.blockedCollections
                    });
                }
                collectionsToSync = [...round.collectionsToRefetch];
                if (collectionsToSync.length > 0) {
                    this.logger.debug('app-state scheduling refetch for collections', {
                        iteration: syncIteration,
                        collections: collectionsToSync
                    });
                }
            }
            if (stateChanged && context.dirtyCollections.size > 0) {
                await this.persistCollectionUpdates();
                this.logger.debug('app-state sync persisted updated state');
            }
            const orderedResults = collections.map((collection) => resultMap.get(collection) ?? {
                collection,
                state: WA_APP_STATE_COLLECTION_STATES.ERROR_RETRY
            });
            this.logger.debug('app-state sync finished', {
                collections: orderedResults.length,
                stateChanged
            });
            return { collections: orderedResults };
        }
        finally {
            if (this.syncContext === context) {
                this.syncContext = null;
            }
        }
    }
    async syncCollectionsRound(collections, pendingByCollection, options) {
        const activeSyncKey = await this.store.getActiveSyncKey();
        const requestPromises = new Array(collections.length);
        for (let index = 0; index < collections.length; index += 1) {
            requestPromises[index] = this.buildCollectionSyncRequest(collections[index], pendingByCollection, activeSyncKey);
        }
        const requests = await Promise.all(requestPromises);
        const collectionNodes = new Array(requests.length);
        const outgoingContexts = new Map();
        const skippedUploadCollections = new Set();
        for (let index = 0; index < requests.length; index += 1) {
            const request = requests[index];
            collectionNodes[index] = request.node;
            if (request.outgoingContext) {
                outgoingContexts.set(request.collection, request.outgoingContext);
            }
            if (request.skippedUpload) {
                skippedUploadCollections.add(request.collection);
            }
        }
        const iqNode = this.buildSyncIqNode(collectionNodes);
        const payloadByCollection = await this.fetchSyncPayloadByCollection(iqNode, options.timeoutMs ?? this.defaultTimeoutMs);
        const collectionOutcomePromises = new Array(collections.length);
        for (let index = 0; index < collections.length; index += 1) {
            collectionOutcomePromises[index] = this.processCollectionRound({
                collection: collections[index],
                payloadByCollection,
                pendingByCollection,
                options,
                outgoingContexts,
                skippedUploadCollections
            });
        }
        const collectionOutcomes = await Promise.all(collectionOutcomePromises);
        const results = [];
        const collectionsToRefetch = [];
        const blockedCollections = [];
        const missingKeyIds = [];
        const missingKeyIdHexes = new Set();
        let stateChanged = false;
        for (let index = 0; index < collectionOutcomes.length; index += 1) {
            const entry = collectionOutcomes[index];
            results.push(entry.result);
            if (entry.shouldRefetch) {
                collectionsToRefetch.push(entry.collection);
            }
            if (entry.stateChanged) {
                stateChanged = true;
            }
            if (entry.result.state === WA_APP_STATE_COLLECTION_STATES.BLOCKED) {
                blockedCollections.push(entry.collection);
            }
            if (entry.missingKeyId) {
                const keyHex = bytesToHex(entry.missingKeyId);
                if (!missingKeyIdHexes.has(keyHex)) {
                    missingKeyIdHexes.add(keyHex);
                    missingKeyIds.push(entry.missingKeyId);
                }
            }
        }
        return {
            results,
            collectionsToRefetch,
            stateChanged,
            missingKeyIds,
            blockedCollections
        };
    }
    async buildCollectionSyncRequest(collection, pendingByCollection, activeSyncKey) {
        const collectionState = await this.getCollectionState(collection);
        const hasPersistedState = collectionState.initialized;
        const requestSnapshot = !this.mobilePrimary() && !hasPersistedState;
        const attrs = {
            name: collection,
            version: String(hasPersistedState ? collectionState.version : APP_STATE_DEFAULT_COLLECTION_VERSION),
            return_snapshot: requestSnapshot ? 'true' : 'false'
        };
        const children = [];
        const pendingMutations = pendingByCollection.get(collection) ?? [];
        let outgoingContext;
        let skippedUpload = false;
        if (pendingMutations.length > 0) {
            if (!hasPersistedState && !this.mobilePrimary()) {
                skippedUpload = true;
                this.logger.debug('app-state skipped outgoing patch upload until snapshot bootstrap', {
                    collection,
                    pendingMutations: pendingMutations.length
                });
            }
            else {
                const outgoing = await this.buildOutgoingPatch(collection, collectionState, pendingMutations, activeSyncKey);
                outgoingContext = outgoing.context;
                children.push({
                    tag: WA_NODE_TAGS.PATCH,
                    attrs: {},
                    content: outgoing.encodedPatch
                });
            }
        }
        return {
            collection,
            outgoingContext,
            skippedUpload,
            node: {
                tag: WA_NODE_TAGS.COLLECTION,
                attrs,
                content: children.length > 0 ? children : undefined
            }
        };
    }
    buildSyncIqNode(collectionNodes) {
        return {
            tag: WA_NODE_TAGS.IQ,
            attrs: {
                to: this.hostDomain,
                type: WA_IQ_TYPES.SET,
                xmlns: WA_XMLNS.APP_STATE_SYNC
            },
            content: [
                {
                    tag: WA_NODE_TAGS.SYNC,
                    attrs: this.mobilePrimary() ? { data_namespace: '3' } : {},
                    content: collectionNodes
                }
            ]
        };
    }
    async fetchSyncPayloadByCollection(iqNode, timeoutMs) {
        const responseNode = await this.query(iqNode, timeoutMs);
        this.logger.debug('app-state sync iq response received', {
            tag: responseNode.tag,
            type: responseNode.attrs.type
        });
        assertIqResult(responseNode, 'app-state sync');
        const payloads = parseSyncResponse(responseNode);
        this.logger.debug('app-state sync payloads parsed', { count: payloads.length });
        const payloadByCollection = new Map();
        for (const payload of payloads) {
            payloadByCollection.set(payload.collection, payload);
        }
        return payloadByCollection;
    }
    async processCollectionRound({ collection, payloadByCollection, pendingByCollection, options, outgoingContexts, skippedUploadCollections }) {
        const collectionLogger = this.logger.child({ collection });
        const payload = payloadByCollection.get(collection);
        let shouldRefetch = false;
        let collectionStateChanged = false;
        if (!payload) {
            collectionLogger.warn('app-state sync response missing collection payload');
            return this.createCollectionOutcome(collection, WA_APP_STATE_COLLECTION_STATES.ERROR_RETRY);
        }
        if (payload.state === WA_APP_STATE_COLLECTION_STATES.ERROR_FATAL ||
            payload.state === WA_APP_STATE_COLLECTION_STATES.ERROR_RETRY) {
            return this.createCollectionOutcome(collection, payload.state, payload.version);
        }
        const pendingMutationsCount = pendingByCollection.get(collection)?.length ?? 0;
        const isConflict = payload.state === WA_APP_STATE_COLLECTION_STATES.CONFLICT ||
            payload.state === WA_APP_STATE_COLLECTION_STATES.CONFLICT_HAS_MORE;
        if (isConflict) {
            shouldRefetch =
                payload.state === WA_APP_STATE_COLLECTION_STATES.CONFLICT_HAS_MORE ||
                    pendingMutationsCount > 0;
        }
        try {
            let appliedMutations = [];
            if (payload.snapshotReference && this.mobilePrimary()) {
                collectionLogger.debug('app-state ignoring server snapshot on primary device');
            }
            else if (payload.snapshotReference) {
                const downloader = options.downloadExternalBlob;
                if (!downloader) {
                    throw new Error(`snapshot for ${payload.collection} requires external blob downloader`);
                }
                const snapshotBytes = await downloader(payload.collection, 'snapshot', payload.snapshotReference);
                const snapshot = this.validateSnapshot(payload.collection, proto.SyncdSnapshot.decode(snapshotBytes));
                const snapshotMutations = await this.applySnapshot(payload.collection, snapshot);
                appliedMutations.push(...snapshotMutations);
                collectionStateChanged = true;
            }
            if (payload.patches.length > 0) {
                const readyPatches = await this.resolveReadyPatches(payload, options);
                for (const readyPatch of readyPatches) {
                    const patchMutations = await this.applyPatch(payload.collection, readyPatch);
                    appliedMutations.push(...patchMutations);
                    collectionStateChanged = true;
                }
            }
            else {
                const outgoingContext = outgoingContexts.get(payload.collection);
                if (outgoingContext &&
                    payload.state === WA_APP_STATE_COLLECTION_STATES.SUCCESS &&
                    payload.version === outgoingContext.patchVersion) {
                    this.setCollectionState(payload.collection, outgoingContext.patchVersion, outgoingContext.nextHash, outgoingContext.nextIndexValueMap);
                    collectionStateChanged = true;
                }
            }
            const currentCollectionState = await this.getCollectionState(collection);
            if (!currentCollectionState.initialized &&
                payload.state === WA_APP_STATE_COLLECTION_STATES.SUCCESS) {
                this.setCollectionState(collection, payload.version ?? currentCollectionState.version, currentCollectionState.hash, currentCollectionState.indexValueMap);
                collectionStateChanged = true;
            }
            shouldRefetch =
                shouldRefetch ||
                    payload.state === WA_APP_STATE_COLLECTION_STATES.SUCCESS_HAS_MORE ||
                    (payload.state === WA_APP_STATE_COLLECTION_STATES.SUCCESS &&
                        skippedUploadCollections.has(collection));
            const resolvedState = !isConflict
                ? payload.state
                : payload.state === WA_APP_STATE_COLLECTION_STATES.CONFLICT
                    ? pendingMutationsCount > 0
                        ? WA_APP_STATE_COLLECTION_STATES.CONFLICT
                        : WA_APP_STATE_COLLECTION_STATES.SUCCESS
                    : payload.state;
            collectionLogger.debug('app-state collection processed', {
                state: resolvedState,
                version: payload.version,
                appliedMutations: appliedMutations.length
            });
            return this.createCollectionOutcome(collection, resolvedState, payload.version, shouldRefetch, collectionStateChanged, appliedMutations);
        }
        catch (error) {
            if (error instanceof WaAppStateMissingKeyError) {
                collectionLogger.debug('app-state blocked by missing key', {
                    message: error.message
                });
                return this.createCollectionOutcome(collection, WA_APP_STATE_COLLECTION_STATES.BLOCKED, payload.version, shouldRefetch, collectionStateChanged, undefined, error.keyId);
            }
            collectionLogger.debug('app-state collection processing failed', {
                message: toError(error).message
            });
            return this.createCollectionOutcome(collection, WA_APP_STATE_COLLECTION_STATES.ERROR_RETRY, payload.version, true, collectionStateChanged);
        }
    }
    createCollectionOutcome(collection, state, version, shouldRefetch = false, stateChanged = false, mutations, missingKeyId = null) {
        return {
            collection,
            shouldRefetch,
            stateChanged,
            missingKeyId,
            result: {
                collection,
                state,
                version,
                ...(mutations ? { mutations } : {})
            }
        };
    }
    async notifyMissingKeys(input) {
        const keyIds = input.keyIds;
        const collections = input.collections;
        if (keyIds.length === 0 || collections.length === 0) {
            return;
        }
        const keyIdsHex = keyIds.map((keyId) => bytesToHex(keyId));
        const requestLogger = this.logger.child({
            keys: keyIdsHex.length,
            collections: collections.join(',')
        });
        requestLogger.debug('app-state requesting missing sync keys', {
            keyIds: keyIdsHex.join(',')
        });
        try {
            await input.onMissingKeys({
                keyIds,
                collections
            });
        }
        catch (error) {
            requestLogger.warn('app-state missing key callback failed', {
                message: toError(error).message
            });
        }
    }
    async resolveReadyPatches(payload, options) {
        const sortedPatches = payload.patches.slice();
        const sortVersions = new Map();
        for (const patch of sortedPatches) {
            sortVersions.set(patch, this.parseCollectionPatchVersion(payload.collection, patch));
        }
        sortedPatches.sort((left, right) => sortVersions.get(left) - sortVersions.get(right));
        return Promise.all(sortedPatches.map(async (patch) => {
            let readyPatch = patch;
            if ((!readyPatch.mutations || readyPatch.mutations.length === 0) &&
                readyPatch.externalMutations) {
                const downloader = options.downloadExternalBlob;
                if (!downloader) {
                    throw new Error(`external patch for ${payload.collection} requires external blob downloader`);
                }
                const patchBytes = await downloader(payload.collection, 'patch', readyPatch.externalMutations);
                const decodedMutations = proto.SyncdMutations.decode(patchBytes);
                readyPatch = {
                    ...readyPatch,
                    mutations: decodedMutations.mutations ?? [],
                    externalMutations: undefined
                };
            }
            return this.validatePatch(payload.collection, readyPatch);
        }));
    }
    validateSnapshot(collection, snapshot) {
        if (!snapshot.version?.version) {
            throw new Error(`snapshot for ${collection} is missing version`);
        }
        if (!this.crypto.isMacVerificationSkipped) {
            if (!snapshot.mac) {
                throw new Error(`snapshot for ${collection} is missing mac`);
            }
            if (!snapshot.keyId?.id) {
                throw new Error(`snapshot for ${collection} is missing keyId`);
            }
        }
        return snapshot;
    }
    parseCollectionPatchVersion(collection, patch) {
        const parsed = this.normalizeProtoLong(patch.version?.version, `patch.version.version (${collection})`);
        if (!Number.isSafeInteger(parsed) || parsed <= 0) {
            throw new Error(`patch for ${collection} has invalid version ${parsed}`);
        }
        return parsed;
    }
    validatePatch(collection, patch) {
        if (!patch.version?.version) {
            throw new Error(`patch for ${collection} is missing version`);
        }
        if (!this.crypto.isMacVerificationSkipped) {
            if (!patch.snapshotMac) {
                throw new Error(`patch for ${collection} is missing snapshotMac`);
            }
            if (!patch.patchMac) {
                throw new Error(`patch for ${collection} is missing patchMac`);
            }
            if (!patch.keyId?.id) {
                throw new Error(`patch for ${collection} is missing keyId`);
            }
        }
        if (patch.mutations && patch.mutations.length > 0 && patch.externalMutations) {
            throw new Error(`patch for ${collection} has inline and external mutations together`);
        }
        if (patch.exitCode?.code !== null &&
            patch.exitCode?.code !== undefined &&
            patch.exitCode.code !== 0) {
            throw new Error(`patch for ${collection} has terminal exitCode ${patch.exitCode.code}: ${patch.exitCode.text ?? ''}`);
        }
        return patch;
    }
    async applySnapshot(collection, snapshot) {
        const version = this.normalizeProtoLong(snapshot.version?.version, `snapshot.version.version (${collection})`);
        let keyData = null;
        if (!this.crypto.isMacVerificationSkipped) {
            const keyId = decodeProtoBytes(snapshot.keyId?.id, `snapshot.keyId.id (${collection})`);
            keyData = await this.getKeyData(keyId);
            if (!keyData) {
                throw new WaAppStateMissingKeyError(`missing snapshot key ${bytesToHex(keyId)} for ${collection}`, keyId, collection);
            }
        }
        const indexValueMap = new Map();
        const mutations = [];
        const decryptedRecords = await this.decryptSnapshotRecords(collection, snapshot);
        for (const { decrypted, recordKeyId } of decryptedRecords) {
            const indexMacHex = bytesToHex(decrypted.indexMac);
            indexValueMap.set(indexMacHex, decrypted.valueMac);
            mutations.push({
                collection,
                operation: 'set',
                source: 'snapshot',
                index: decrypted.index,
                value: decrypted.value,
                version: decrypted.version,
                indexMac: decrypted.indexMac,
                valueMac: decrypted.valueMac,
                keyId: recordKeyId,
                timestamp: this.normalizeProtoLong(decrypted.value?.timestamp, `snapshot.record.value.timestamp (${collection})`)
            });
        }
        const ltHashInput = new Array(indexValueMap.size);
        let ltHashInputIndex = 0;
        for (const valueMac of indexValueMap.values()) {
            ltHashInput[ltHashInputIndex] = valueMac;
            ltHashInputIndex += 1;
        }
        const ltHash = await this.crypto.ltHashAdd(APP_STATE_EMPTY_LT_HASH, ltHashInput);
        if (keyData !== null) {
            const expectedSnapshotMac = await this.crypto.generateSnapshotMac(keyData, ltHash, version, collection);
            if (!uint8TimingSafeEqual(expectedSnapshotMac, snapshot.mac)) {
                // Poisoned server-side snapshot (MAC unverifiable by any client):
                // keep partial state instead of throwing, which would loop refetch forever.
                this.logger.warn('snapshot LT-hash verification failed, continuing with partial state', {
                    collection,
                    version
                });
            }
        }
        this.setCollectionState(collection, version, ltHash, indexValueMap);
        return mutations;
    }
    async applyPatch(collection, patch) {
        const patchVersion = this.normalizeProtoLong(patch.version?.version, `patch.version.version (${collection})`);
        const current = await this.getCollectionState(collection);
        if (current.version !== patchVersion - 1) {
            throw new Error(`patch version mismatch for ${collection}: local=${current.version}, incoming=${patchVersion}`);
        }
        let patchKeyData = null;
        if (!this.crypto.isMacVerificationSkipped) {
            const patchKeyId = decodeProtoBytes(patch.keyId?.id, `patch.keyId.id (${collection})`);
            patchKeyData = await this.getKeyData(patchKeyId);
            if (!patchKeyData) {
                throw new WaAppStateMissingKeyError(`missing patch key ${bytesToHex(patchKeyId)} for ${collection}`, patchKeyId, collection);
            }
        }
        const decryptedMutations = await this.decryptPatchMutations(collection, patch);
        const macMutations = new Array(decryptedMutations.length);
        const valueMacs = new Array(decryptedMutations.length);
        for (let index = 0; index < decryptedMutations.length; index += 1) {
            const mutation = decryptedMutations[index];
            valueMacs[index] = mutation.valueMac;
            macMutations[index] = {
                operation: mutation.operationCode,
                indexMac: mutation.indexMac,
                valueMac: mutation.valueMac
            };
        }
        const nextState = await this.computeNextCollectionState(current.hash, current.indexValueMap, macMutations, collection);
        if (patchKeyData !== null) {
            await this.assertPatchMacsMatch(patch, collection, patchKeyData, patchVersion, nextState.hash, valueMacs);
        }
        this.setCollectionState(collection, patchVersion, nextState.hash, nextState.indexValueMap);
        return decryptedMutations;
    }
    async decryptSnapshotRecords(collection, snapshot) {
        const rawRecords = snapshot.records ?? [];
        const records = new Array(rawRecords.length);
        const recordKeyIds = new Array(rawRecords.length);
        for (let i = 0; i < rawRecords.length; i += 1) {
            const record = rawRecords[i];
            const recordKeyId = decodeProtoBytes(record.keyId?.id, `snapshot.record.keyId.id (${collection})`);
            records[i] = {
                indexMac: decodeProtoBytes(record.index?.blob, `snapshot.record.index.blob (${collection})`),
                valueBlob: decodeProtoBytes(record.value?.blob, `snapshot.record.value.blob (${collection})`),
                recordKeyId
            };
            recordKeyIds[i] = recordKeyId;
        }
        await this.preloadKeyData(recordKeyIds);
        const decryptTasks = new Array(records.length);
        for (let i = 0; i < records.length; i += 1) {
            const { indexMac, valueBlob, recordKeyId } = records[i];
            decryptTasks[i] = (async () => {
                const recordKeyData = await this.getKeyData(recordKeyId);
                if (!recordKeyData) {
                    throw new WaAppStateMissingKeyError(`missing snapshot mutation key ${bytesToHex(recordKeyId)} for ${collection}`, recordKeyId, collection);
                }
                const decrypted = await this.crypto.decryptMutation({
                    operation: proto.SyncdMutation.SyncdOperation.SET,
                    keyId: recordKeyId,
                    keyData: recordKeyData,
                    indexMac,
                    valueBlob
                });
                return {
                    decrypted,
                    recordKeyId
                };
            })();
        }
        return Promise.all(decryptTasks);
    }
    async decryptPatchMutations(collection, patch) {
        const rawMutations = patch.mutations ?? [];
        const parsedMutations = new Array(rawMutations.length);
        const mutationKeyIds = new Array(rawMutations.length);
        for (let i = 0; i < rawMutations.length; i += 1) {
            const mutation = rawMutations[i];
            const operationCode = mutation.operation;
            if (operationCode === null || operationCode === undefined) {
                throw new Error(`patch mutation is missing operation (${collection})`);
            }
            const record = mutation.record;
            if (!record) {
                throw new Error(`patch mutation is missing record (${collection})`);
            }
            const recordKeyId = decodeProtoBytes(record.keyId?.id, `patch.record.keyId.id (${collection})`);
            parsedMutations[i] = {
                operationCode,
                indexMac: decodeProtoBytes(record.index?.blob, `patch.record.index.blob (${collection})`),
                valueBlob: decodeProtoBytes(record.value?.blob, `patch.record.value.blob (${collection})`),
                recordKeyId
            };
            mutationKeyIds[i] = recordKeyId;
        }
        await this.preloadKeyData(mutationKeyIds);
        const decryptTasks = new Array(parsedMutations.length);
        for (let i = 0; i < parsedMutations.length; i += 1) {
            const { operationCode, indexMac, valueBlob, recordKeyId } = parsedMutations[i];
            decryptTasks[i] = (async () => {
                const recordKeyData = await this.getKeyData(recordKeyId);
                if (!recordKeyData) {
                    throw new WaAppStateMissingKeyError(`missing mutation key ${bytesToHex(recordKeyId)} for ${collection}`, recordKeyId, collection);
                }
                const decrypted = await this.crypto.decryptMutation({
                    operation: operationCode,
                    keyId: recordKeyId,
                    keyData: recordKeyData,
                    indexMac,
                    valueBlob
                });
                return {
                    collection,
                    operation: operationCode === proto.SyncdMutation.SyncdOperation.REMOVE
                        ? 'remove'
                        : 'set',
                    source: 'patch',
                    operationCode,
                    index: decrypted.index,
                    value: decrypted.value,
                    version: decrypted.version,
                    indexMac: decrypted.indexMac,
                    valueMac: decrypted.valueMac,
                    keyId: recordKeyId,
                    timestamp: this.normalizeProtoLong(decrypted.value?.timestamp, `patch.record.value.timestamp (${collection})`)
                };
            })();
        }
        return Promise.all(decryptTasks);
    }
    async assertPatchMacsMatch(patch, collection, patchKeyData, patchVersion, nextHash, valueMacs) {
        const snapshotMac = decodeProtoBytes(patch.snapshotMac, `patch.snapshotMac (${collection})`);
        const expectedSnapshotMac = await this.crypto.generateSnapshotMac(patchKeyData, nextHash, patchVersion, collection);
        // non-fatal: wa-mob/wa-web tolerate this – patchMac below covers payload integrity.
        if (!uint8TimingSafeEqual(expectedSnapshotMac, snapshotMac)) {
            this.logger.debug('patch snapshot MAC mismatch (tolerated)', {
                collection,
                patchVersion
            });
        }
        const patchMac = decodeProtoBytes(patch.patchMac, `patch.patchMac (${collection})`);
        const expectedPatchMac = await this.crypto.generatePatchMac(patchKeyData, snapshotMac, valueMacs, patchVersion, collection);
        if (!uint8TimingSafeEqual(expectedPatchMac, patchMac)) {
            throw new Error(`patch MAC mismatch for ${collection}`);
        }
    }
    async buildOutgoingPatch(collection, snapshot, pendingMutations, activeKey) {
        if (!activeKey) {
            throw new WaAppStateMissingKeyError(`no sync key available to upload ${collection}`, null, collection);
        }
        const encryptedResults = await Promise.all(pendingMutations.map(async (mutation) => {
            const value = mutation.operation === 'set' ? mutation.value : null;
            const operationCode = mutation.operation === 'remove'
                ? proto.SyncdMutation.SyncdOperation.REMOVE
                : proto.SyncdMutation.SyncdOperation.SET;
            const encrypted = await this.crypto.encryptMutation({
                operation: operationCode,
                keyId: activeKey.keyId,
                keyData: activeKey.keyData,
                index: mutation.index,
                value,
                version: mutation.version
            });
            return { operationCode, encrypted };
        }));
        const encryptedMutations = new Array(encryptedResults.length);
        const macMutations = new Array(encryptedResults.length);
        const valueMacs = new Array(encryptedResults.length);
        for (let i = 0; i < encryptedResults.length; i += 1) {
            const { operationCode, encrypted } = encryptedResults[i];
            encryptedMutations[i] = {
                operation: operationCode,
                record: {
                    keyId: { id: activeKey.keyId },
                    index: { blob: encrypted.indexMac },
                    value: { blob: encrypted.valueBlob }
                }
            };
            macMutations[i] = {
                operation: operationCode,
                indexMac: encrypted.indexMac,
                valueMac: encrypted.valueMac
            };
            valueMacs[i] = encrypted.valueMac;
        }
        const nextState = await this.computeNextCollectionState(snapshot.hash, snapshot.indexValueMap, macMutations, collection);
        const patchVersion = snapshot.version + 1;
        const snapshotMac = await this.crypto.generateSnapshotMac(activeKey.keyData, nextState.hash, patchVersion, collection);
        const patchMac = await this.crypto.generatePatchMac(activeKey.keyData, snapshotMac, valueMacs, patchVersion, collection);
        const deviceIndex = this.resolveDeviceIndex();
        const encodedPatch = proto.SyncdPatch.encode({
            mutations: encryptedMutations,
            snapshotMac,
            patchMac,
            keyId: { id: activeKey.keyId },
            ...(deviceIndex === undefined ? {} : { deviceIndex })
        }).finish();
        return {
            encodedPatch,
            context: {
                collection,
                patchVersion,
                nextHash: nextState.hash,
                nextIndexValueMap: nextState.indexValueMap
            }
        };
    }
    resolveDeviceIndex() {
        const meJid = this.getCurrentMeJid?.();
        if (!meJid) {
            return undefined;
        }
        try {
            return parseSignalAddressFromJid(meJid).device;
        }
        catch (error) {
            this.logger.debug('app-state could not parse device index from me jid', {
                meJid
            });
            void error;
            return undefined;
        }
    }
    async computeNextCollectionState(baseHash, baseMap, mutations, collection) {
        const indexValueMap = new Map(baseMap);
        const addValues = [];
        const removeValues = [];
        let missingRemoveCount = 0;
        for (const mutation of mutations) {
            const indexMacHex = bytesToHex(mutation.indexMac);
            const existing = indexValueMap.get(indexMacHex);
            if (mutation.operation === proto.SyncdMutation.SyncdOperation.REMOVE) {
                if (!existing) {
                    missingRemoveCount += 1;
                    continue;
                }
                indexValueMap.delete(indexMacHex);
                removeValues.push(existing);
                continue;
            }
            if (existing) {
                removeValues.push(existing);
            }
            indexValueMap.set(indexMacHex, mutation.valueMac);
            addValues.push(mutation.valueMac);
        }
        if (missingRemoveCount > 0) {
            this.logger.warn('app-state mutation remove index mac not found', {
                collection,
                missingRemoveCount
            });
        }
        const nextHash = await this.crypto.ltHashSubtractThenAdd(baseHash, addValues, removeValues);
        return {
            hash: nextHash.hash,
            indexValueMap
        };
    }
    normalizeProtoLong(value, field) {
        try {
            return longToNumber(value);
        }
        catch (error) {
            throw new Error(`invalid ${field}: ${toError(error).message}`);
        }
    }
    groupPendingMutations(pendingMutations) {
        const grouped = new Map();
        for (const mutation of pendingMutations) {
            const list = grouped.get(mutation.collection);
            if (list) {
                list.push(mutation);
            }
            else {
                grouped.set(mutation.collection, [mutation]);
            }
        }
        const compacted = new Map();
        for (const [collection, list] of grouped.entries()) {
            const seenIndexes = new Set();
            const reversed = [];
            for (let index = list.length - 1; index >= 0; index -= 1) {
                const mutation = list[index];
                if (seenIndexes.has(mutation.index)) {
                    continue;
                }
                seenIndexes.add(mutation.index);
                reversed.push(mutation);
            }
            compacted.set(collection, reversed.reverse());
        }
        return compacted;
    }
    async preloadKeyData(keyIds) {
        if (keyIds.length === 0) {
            return;
        }
        const context = this.requireSyncContext();
        const missingKeyIds = [];
        const missingKeyHexes = new Set();
        for (let index = 0; index < keyIds.length; index += 1) {
            const keyId = keyIds[index];
            const keyHex = bytesToHex(keyId);
            if (context.keys.has(keyHex) || missingKeyHexes.has(keyHex)) {
                continue;
            }
            missingKeyHexes.add(keyHex);
            missingKeyIds.push(keyId);
        }
        if (missingKeyIds.length === 0) {
            return;
        }
        const loadedKeyData = await this.store.getSyncKeyDataBatch(missingKeyIds);
        for (let index = 0; index < missingKeyIds.length; index += 1) {
            context.keys.set(bytesToHex(missingKeyIds[index]), loadedKeyData[index] ?? null);
        }
    }
    async getKeyData(keyId) {
        const context = this.requireSyncContext();
        const keyHex = bytesToHex(keyId);
        if (context.keys.has(keyHex)) {
            return context.keys.get(keyHex) ?? null;
        }
        const value = await this.store.getSyncKeyData(keyId);
        context.keys.set(keyHex, value);
        return value;
    }
    async getCollectionState(collection) {
        const context = this.requireSyncContext();
        const cached = context.collections.get(collection);
        if (cached) {
            return cached;
        }
        const state = await this.store.getCollectionState(collection);
        context.collections.set(collection, state);
        return state;
    }
    setCollectionState(collection, version, hash, indexValueMap) {
        const context = this.requireSyncContext();
        context.collections.set(collection, {
            initialized: true,
            version,
            hash,
            indexValueMap
        });
        context.dirtyCollections.add(collection);
    }
    async persistCollectionUpdates() {
        const context = this.requireSyncContext();
        const updates = [];
        for (const collection of context.dirtyCollections.values()) {
            const state = context.collections.get(collection);
            if (!state) {
                continue;
            }
            updates.push({
                collection,
                version: state.version,
                hash: state.hash,
                indexValueMap: state.indexValueMap
            });
        }
        if (updates.length === 0) {
            return;
        }
        await this.store.setCollectionStates(updates);
    }
    requireSyncContext() {
        if (!this.syncContext) {
            throw new Error('app-state sync context is not initialized');
        }
        return this.syncContext;
    }
}
