import { type PhoneNumberToLidMapping } from '../messaging/companion-host';
import type { CompanionHostPersistence, CompanionRecord } from '../persistence/companion-host';
import type { WaClientPluginContext } from '../plugins/types';
import type { WaClientEventMap } from '../types';
import type { WaClientDependencies } from '../WaClientFactory';
import type { Logger } from '../../infra/log/types';
type WaMobileEmit = <K extends keyof WaClientEventMap>(event: K, ...args: Parameters<WaClientEventMap[K]>) => void;
/** Result of a successful {@link WaMobileCoordinator.linkCompanion}. */
export interface LinkCompanionResult {
    readonly deviceJid: string;
    readonly keyIndex: number;
}
/** Dependencies for {@link WaMobileCoordinator}, injected by the client factory. */
export interface WaMobileCoordinatorDeps {
    readonly logger: Logger;
    readonly authClient: WaClientDependencies['authClient'];
    readonly messageDispatch: WaClientDependencies['messageDispatch'];
    readonly chatCoordinator: WaClientDependencies['chatCoordinator'];
    readonly deviceSync: WaClientDependencies['signalDeviceSync'];
    readonly appStateStore: WaClientPluginContext['stores']['appState'];
    readonly queryWithContext: WaClientPluginContext['queryWithContext'];
    readonly emitEvent: WaMobileEmit;
    readonly registerIncomingHandler: WaClientPluginContext['registerIncomingHandler'];
    readonly isMobilePrimary: () => boolean;
    readonly persistence?: CompanionHostPersistence;
    readonly includePem?: boolean;
}
/**
 * Hosts companion devices from a mobile-primary session: signs a companion's
 * device identity, uploads `pair-device`, tracks the linked set, and can revoke
 * a device. Exposed at `client.mobile`; requires a registered primary session.
 * Supports the QR ({@link linkCompanion}) and pairing-code
 * ({@link linkCompanionByCode}) flows.
 */
export declare class WaMobileCoordinator {
    private readonly authClient;
    private readonly messageDispatch;
    private readonly chatCoordinator;
    private readonly deviceSync;
    private readonly appStateStore;
    private readonly queryWithContext;
    private readonly emitEvent;
    private readonly isMobilePrimary;
    private readonly logger;
    private readonly persistence?;
    private readonly includePem;
    private epoch;
    private pendingCompanionHello;
    private pendingFinish;
    private accountKeyIndexes;
    private pushNameSeeded;
    constructor(deps: WaMobileCoordinatorDeps);
    /**
     * Links the companion from its pairing QR: signs the device identity, uploads
     * `pair-device`, and returns the server-assigned device jid.
     *
     * @throws when there is no primary session or the server rejects the upload
     * (e.g. the linked-device cap is reached).
     */
    linkCompanion(qr: string): Promise<LinkCompanionResult>;
    /**
     * Links a companion via its 8-character pairing code (the "link with phone
     * number" flow). The companion must have requested a code for this account
     * first (its `companion_hello` is recorded); this drives `primary_hello`,
     * awaits `companion_finish`, and completes the same `pair-device` upload as
     * the QR path.
     *
     * @throws when there is no primary session, no companion is pending, the code
     * is wrong, or the handshake times out.
     */
    linkCompanionByCode(pairingCode: string): Promise<LinkCompanionResult>;
    /** Re-signs and republishes the key-index list for the current device set. */
    publishKeyIndexList(): Promise<void>;
    /**
     * Unlinks a companion this primary linked: sends the `remove-companion-device`
     * IQ, drops it from the tracked set, and republishes the key-index list for
     * the reduced device set.
     *
     * @throws when there is no registered primary session, the companion is not
     * tracked, or the server rejects the removal.
     */
    revokeCompanion(companionDeviceJid: string, reason?: string): Promise<void>;
    /**
     * Unlinks EVERY companion from the account in a single `remove-companion-device`
     * `all="true"` stanza (the phone's "log out all companion devices"), clears the
     * tracked set, and republishes the key-index list for the primary alone.
     * `excludeHostedCompanion` spares companions this account itself hosts.
     *
     * @throws when there is no registered primary session or the server rejects
     * the removal.
     */
    revokeAllCompanions(reason?: string, options?: {
        readonly excludeHostedCompanion?: boolean;
    }): Promise<void>;
    /** Returns the companions this primary has linked in the current epoch. */
    listCompanions(): Promise<readonly CompanionRecord[]>;
    /**
     * Reconciles the tracked companion set against the account's live device list
     * on the server (`usync`). Drops companions the server no longer lists - one
     * the user unlinked, or one that self-removed while the primary was offline -
     * then persists and emits `companion_host_revoked` for each. Runs on connect
     * and on `account_sync`; safe to call manually. A no-op (no server query, no
     * epoch created) when no companions are tracked. Returns the removed jids.
     */
    reconcileCompanions(): Promise<readonly string[]>;
    /**
     * Prunes tracked companions to those whose device slot is still in
     * `serverDeviceIndexes`, persisting + emitting `companion_host_revoked` for
     * each drop. Shared by the connect-time (`usync`) and `account_sync` paths.
     */
    private pruneCompanionsToDevices;
    /**
     * Reconciles from an `account_sync` notification's `<devices>` payload - the
     * fresh, authoritative device set - so a companion the user just unlinked is
     * pruned immediately (no `usync` round-trip, which would read a stale cache).
     */
    private reconcileFromAccountSync;
    /**
     * Shares the primary's active app-state sync key with a linked companion via
     * an `APP_STATE_SYNC_KEY_SHARE` peer message so it can decrypt app-state.
     * Establishes the outbound Signal session on demand, so call it once the
     * companion is online (prekeys uploaded), not at link time.
     *
     * @throws when there is no primary session or no active sync key.
     */
    shareAppStateSyncKeys(companionDeviceJid: string): Promise<void>;
    /**
     * Pushes the `INITIAL_BOOTSTRAP` history sync to a linked companion as a
     * `HISTORY_SYNC_NOTIFICATION` peer message. Flips the companion's
     * `initialChatHistory` bootstrap flag; without it the companion self-removes
     * with `HistorySyncTimeout`. Requires the companion online with prekeys.
     *
     * @throws when there is no registered primary session.
     */
    sendHistorySyncBootstrap(companionDeviceJid: string, options?: {
        readonly phoneNumberToLidMappings?: readonly PhoneNumberToLidMapping[];
    }): Promise<void>;
    /**
     * `ClientPairingProps` for the `<client-props>` pair-device element. A
     * LID-native primary declares the chat DB LID-migrated + pure-LID session so
     * the companion runs `setIsLidMigrated` at pair time and does not self-remove
     * on its LID-addressed blocklist.
     */
    private buildClientPairingProps;
    /**
     * Seeds the primary's own `setting_pushName` into the `critical_block`
     * app-state collection, once per session. The companion's critical bootstrap
     * completes only when it finds an applied `SettingPushName` action; without
     * one it self-removes with `syncd_timeout`. Falls back to the account phone
     * number when no push name is set. Idempotent and best-effort.
     */
    private ensureAccountPushNameAppState;
    private completeLink;
    /**
     * Best-effort background provisioning after a companion links: pushes the
     * history-sync bootstrap and shares the app-state sync key. Fire-and-forget
     * and retried, because the companion needs a moment to upload prekeys before
     * the outbound Signal session these peer messages ride on can be established.
     */
    private provisionLinkedCompanion;
    private provisionLinkedCompanionWithRetry;
    private handleNotification;
    /**
     * Tracks the account's live device key-indexes from an `account_sync`
     * notification so a new companion gets a non-colliding key index and the
     * published key-index list keeps every existing device valid.
     */
    private updateAccountKeyIndexes;
    private forgetAccountKeyIndex;
    /**
     * The key indexes currently valid for this account - index 0 (the primary),
     * the account's own live devices, and every tracked companion. Sorted
     * ascending. Deliberately excludes `epoch.currentKeyIndex`, which is an
     * allocation high-water mark, not proof a device still exists: after revoking
     * the last-linked companion its index must drop out of the published list.
     */
    private validKeyIndexes;
    /**
     * Allocates the next companion key index, advancing strictly past both the
     * epoch's monotonic high-water mark and every currently-valid index so a
     * revoked index is never reused (reuse breaks previously linked devices).
     */
    private nextKeyIndex;
    private storeCompanionHello;
    private resolveCompanionFinish;
    private nodeBytes;
    private requirePrimaryIdentityKeyPair;
    private ensureEpoch;
    private generateRawId;
    private persist;
}
export {};
