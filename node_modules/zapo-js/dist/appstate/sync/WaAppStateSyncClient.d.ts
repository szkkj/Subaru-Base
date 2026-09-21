import type { WaAppStateMissingKeysEvent, WaAppStateSyncKey, WaAppStateSyncOptions, WaAppStateSyncResult } from '../types';
import type { Logger } from '../../infra/log/types';
import { type Proto } from '../../proto';
import type { WaAppStateStore } from '../../store/contracts/appstate.store';
import type { BinaryNode } from '../../transport/types';
import type { ServerClock } from '../../util/clock';
/**
 * Minimal message-key context for incoming app-state key protocol messages.
 * Uses the proto `Proto.IMessageKey` attribute names so callers can pass an
 * incoming message's `key` verbatim (no field remapping).
 */
interface IncomingKeyEventContext {
    readonly remoteJid?: string;
    readonly id?: string;
    readonly participant?: string;
    readonly senderDevice: number;
}
interface WaAppStateSyncClientOptions {
    readonly logger: Logger;
    readonly query: (node: BinaryNode, timeoutMs: number) => Promise<BinaryNode>;
    readonly store: WaAppStateStore;
    readonly serverClock: ServerClock;
    readonly getCurrentMeJid?: () => string | null | undefined;
    readonly hostDomain?: string;
    readonly defaultTimeoutMs?: number;
    readonly onMissingKeys?: (event: WaAppStateMissingKeysEvent) => Promise<void>;
    readonly skipMacVerification?: boolean;
    /**
     * Resolved per sync operation (post-connect, after credentials load) so a
     * registered mobile-primary session reconnecting without an explicit
     * `mobileTransport` option still drives the primary-authoritative sync path.
     */
    readonly mobilePrimary?: () => boolean;
    readonly isOwnAccountDevice?: (deviceJid: string) => boolean;
    readonly sendKeyShare?: (toDeviceJid: string, keys: readonly WaAppStateSyncKey[], missingKeyIds: readonly Uint8Array[]) => Promise<void>;
    readonly triggerSync?: () => Promise<void>;
}
/**
 * App-state synchronization client. Owns the sync key inventory, processes
 * snapshots/patches, encrypts pending mutations, and persists the resulting
 * collection state in the {@link WaAppStateStore}.
 */
export declare class WaAppStateSyncClient {
    private readonly logger;
    private readonly query;
    private readonly store;
    private readonly serverClock;
    private readonly getCurrentMeJid?;
    private readonly hostDomain;
    private readonly defaultTimeoutMs;
    private readonly onMissingKeys?;
    private readonly isOwnAccountDevice?;
    private readonly sendKeyShare?;
    private readonly triggerSync?;
    private readonly crypto;
    private readonly mobilePrimary;
    private syncContext;
    private syncPromise;
    constructor(options: WaAppStateSyncClientOptions);
    /**
     * Returns the active app-state sync key, generating and persisting a new
     * one when the store is empty (used during initial setup).
     *
     * The key id mirrors the primary device layout: 2 big-endian bytes of
     * device id followed by a 4 big-endian byte epoch. `keyEpoch` and
     * `pickActiveSyncKey` read that structure, so a shorter id would make the
     * generated key invisible to active-key selection.
     */
    ensureInitialSyncKey(): Promise<WaAppStateSyncKey>;
    /** Imports peer-shared sync keys into the store; returns the count actually added. */
    importSyncKeys(keys: readonly WaAppStateSyncKey[]): Promise<number>;
    /** Handler for `AppStateSyncKeyShare` protocol messages – stores received keys and triggers a sync. */
    handleIncomingKeyShare(context: IncomingKeyEventContext, protocolMessage: Proto.Message.IProtocolMessage): Promise<void>;
    /** Handler for `AppStateSyncKeyRequest` protocol messages – replies with the requested keys via `sendKeyShare`. */
    handleIncomingKeyRequest(context: IncomingKeyEventContext, protocolMessage: Proto.Message.IProtocolMessage): Promise<void>;
    private extractKeyRequestIds;
    /** Imports the keys from a decoded `AppStateSyncKeyShare` proto message. */
    importSyncKeyShare(share: Proto.Message.IAppStateSyncKeyShare): Promise<number>;
    /**
     * Runs one app-state sync round across the requested collections,
     * applying any `pendingMutations` and downloading external snapshots
     * via `options.downloadExternalBlob` when present. Concurrent calls
     * share the in-flight promise.
     */
    sync(options?: WaAppStateSyncOptions): Promise<WaAppStateSyncResult>;
    private syncOnce;
    private syncCollectionsRound;
    private buildCollectionSyncRequest;
    private buildSyncIqNode;
    private fetchSyncPayloadByCollection;
    private processCollectionRound;
    private createCollectionOutcome;
    private notifyMissingKeys;
    private resolveReadyPatches;
    private validateSnapshot;
    private parseCollectionPatchVersion;
    private validatePatch;
    private applySnapshot;
    private applyPatch;
    private decryptSnapshotRecords;
    private decryptPatchMutations;
    private assertPatchMacsMatch;
    private buildOutgoingPatch;
    private resolveDeviceIndex;
    private computeNextCollectionState;
    private normalizeProtoLong;
    private groupPendingMutations;
    private preloadKeyData;
    private getKeyData;
    private getCollectionState;
    private setCollectionState;
    private persistCollectionUpdates;
    private requireSyncContext;
}
export {};
