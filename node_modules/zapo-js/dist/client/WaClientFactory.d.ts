import { WaAppStateSyncClient } from '../appstate/sync/WaAppStateSyncClient';
import type { WaAppStateSyncOptions, WaAppStateSyncResult } from '../appstate/types';
import { WaAuthClient } from '../auth/WaAuthClient';
import { WaConnectionManager } from './connection/WaConnectionManager';
import { WaReceiptQueue } from './connection/WaReceiptQueue';
import { WaAbPropsCoordinator } from './coordinators/WaAbPropsCoordinator';
import { WaAppStateMutationCoordinator } from './coordinators/WaAppStateMutationCoordinator';
import { type WaBotCoordinator } from './coordinators/WaBotCoordinator';
import { type WaBroadcastListCoordinator } from './coordinators/WaBroadcastListCoordinator';
import { type WaBusinessCoordinator } from './coordinators/WaBusinessCoordinator';
import { type WaEmailCoordinator } from './coordinators/WaEmailCoordinator';
import { type WaGroupCoordinator } from './coordinators/WaGroupCoordinator';
import { WaIncomingNodeCoordinator } from './coordinators/WaIncomingNodeCoordinator';
import { type WaLowLevelCoordinator } from './coordinators/WaLowLevelCoordinator';
import { WaMessageCoordinator } from './coordinators/WaMessageCoordinator';
import { WaMessageDispatchCoordinator } from './coordinators/WaMessageDispatchCoordinator';
import { WaMobileCoordinator } from './coordinators/WaMobileCoordinator';
import { type WaNewsletterCoordinator } from './coordinators/WaNewsletterCoordinator';
import { WaPassiveTasksCoordinator } from './coordinators/WaPassiveTasksCoordinator';
import { type WaPresenceCoordinator } from './coordinators/WaPresenceCoordinator';
import { type WaPrivacyCoordinatorRuntime } from './coordinators/WaPrivacyCoordinator';
import { type WaProfileCoordinator } from './coordinators/WaProfileCoordinator';
import { WaRetryCoordinator } from './coordinators/WaRetryCoordinator';
import { type WaStatusCoordinator } from './coordinators/WaStatusCoordinator';
import { type WaStreamControlHandler } from './coordinators/WaStreamControlCoordinator';
import { WaTrustedContactTokenCoordinator } from './coordinators/WaTrustedContactTokenCoordinator';
import { type WaMediaMessageOptions } from './messaging/messages';
import type { WaClientEventMap, WaClientOptions, WaIncomingMessageEvent, WaIncomingProtocolMessageEvent } from './types';
import type { Logger } from '../infra/log/types';
import { WaMediaTransferClient } from '../media/transfer/WaMediaTransferClient';
import { type PeerDataOperationRequester } from '../message/primitives/peer-data-operation';
import { WaMessageClient } from '../message/WaMessageClient';
import { SignalDeviceSyncApi } from '../signal/api/SignalDeviceSyncApi';
import { SignalDigestSyncApi } from '../signal/api/SignalDigestSyncApi';
import { SignalIdentitySyncApi } from '../signal/api/SignalIdentitySyncApi';
import { SignalMissingPreKeysSyncApi } from '../signal/api/SignalMissingPreKeysSyncApi';
import { SignalRotateKeyApi } from '../signal/api/SignalRotateKeyApi';
import { SignalSessionSyncApi } from '../signal/api/SignalSessionSyncApi';
import { SenderKeyManager } from '../signal/group/SenderKeyManager';
import { type SignalSessionResolver } from '../signal/session/resolver';
import { SignalProtocol } from '../signal/session/SignalProtocol';
import type { WaStoredContactRecord } from '../store/contracts/contact.store';
import { WaKeepAlive } from '../transport/keepalive/WaKeepAlive';
import { WaNodeOrchestrator } from '../transport/node/WaNodeOrchestrator';
import { WaNodeTransport } from '../transport/node/WaNodeTransport';
import type { BinaryNode } from '../transport/types';
interface WaClientBase {
    readonly options: Readonly<WaClientOptions>;
    readonly logger: Logger;
    readonly sessionStore: ReturnType<WaClientOptions['store']['session']>;
}
interface WaClientBuildRuntime {
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    readonly query: (node: BinaryNode, timeoutMs?: number, options?: {
        readonly useSystemId?: boolean;
    }) => Promise<BinaryNode>;
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>, options?: {
        readonly useSystemId?: boolean;
    }) => Promise<BinaryNode>;
    readonly syncAppState: () => Promise<void>;
    readonly syncAppStateWithOptions: (options?: WaAppStateSyncOptions) => Promise<WaAppStateSyncResult>;
    readonly emitEvent: <K extends keyof WaClientEventMap>(event: K, ...args: Parameters<WaClientEventMap[K]>) => void;
    /** Whether anything is subscribed, for events whose payload costs something to build. */
    readonly hasEventListener: (event: keyof WaClientEventMap) => boolean;
    readonly handleIncomingMessageEvent: (event: WaIncomingMessageEvent) => Promise<void>;
    readonly handleError: (error: Error) => void;
    readonly handleIncomingFrame: (frame: Uint8Array) => Promise<void>;
    readonly clearStoredState: () => Promise<void>;
    readonly resumeIncomingEvents: () => void;
    readonly subscribeProtocolMessage: (handler: (event: WaIncomingProtocolMessageEvent) => void) => () => void;
    /**
     * Sink for address-book contact rows synced over app-state. Wired by
     * `WaClient` to {@link WriteBehindPersistence.persistContact} so Contact
     * mutations land in the contact store at pair-time (snapshot) and on
     * every incremental sync.
     */
    readonly persistContact: (record: WaStoredContactRecord) => void;
}
/**
 * Internal coordinator graph wired by {@link buildWaClientDependencies}. Exposed
 * to {@link WaClientPluginContext.deps} for plugin authors – advanced API; new
 * coordinators may appear in minor releases.
 */
export interface WaClientDependencies {
    readonly nodeTransport: WaNodeTransport;
    readonly nodeOrchestrator: WaNodeOrchestrator;
    readonly keepAlive: WaKeepAlive;
    readonly mediaTransfer: WaMediaTransferClient;
    readonly mediaMessageBuildOptions: WaMediaMessageOptions;
    readonly messageClient: WaMessageClient;
    readonly senderKeyManager: SenderKeyManager;
    readonly signalProtocol: SignalProtocol;
    readonly signalDigestSync: SignalDigestSyncApi;
    readonly signalDeviceSync: SignalDeviceSyncApi;
    readonly signalIdentitySync: SignalIdentitySyncApi;
    readonly signalMissingPreKeysSync: SignalMissingPreKeysSyncApi;
    readonly signalRotateKey: SignalRotateKeyApi;
    readonly signalSessionSync: SignalSessionSyncApi;
    readonly sessionResolver: SignalSessionResolver;
    readonly authClient: WaAuthClient;
    readonly messageDispatch: WaMessageDispatchCoordinator;
    readonly messageCoordinator: WaMessageCoordinator;
    readonly presenceCoordinator: WaPresenceCoordinator;
    readonly retryCoordinator: WaRetryCoordinator;
    readonly appStateSync: WaAppStateSyncClient;
    readonly chatCoordinator: WaAppStateMutationCoordinator;
    readonly streamControl: WaStreamControlHandler;
    readonly incomingNode: WaIncomingNodeCoordinator;
    readonly lowLevelCoordinator: WaLowLevelCoordinator;
    readonly passiveTasks: WaPassiveTasksCoordinator;
    readonly groupCoordinator: WaGroupCoordinator;
    readonly statusCoordinator: WaStatusCoordinator;
    readonly broadcastListCoordinator: WaBroadcastListCoordinator;
    readonly newsletterCoordinator: WaNewsletterCoordinator;
    readonly privacyCoordinator: WaPrivacyCoordinatorRuntime;
    readonly profileCoordinator: WaProfileCoordinator;
    readonly businessCoordinator: WaBusinessCoordinator;
    readonly botCoordinator: WaBotCoordinator;
    readonly emailCoordinator: WaEmailCoordinator;
    readonly receiptQueue: WaReceiptQueue;
    readonly connectionManager: WaConnectionManager;
    readonly trustedContactToken: WaTrustedContactTokenCoordinator;
    readonly abPropsCoordinator: WaAbPropsCoordinator;
    readonly peerDataOperation: PeerDataOperationRequester;
    readonly mobileCoordinator: WaMobileCoordinator;
    readonly isMobilePrimary: () => boolean;
}
export declare function resolveWaClientBase(options: WaClientOptions, logger: Logger): WaClientBase;
export declare function buildWaClientDependencies(input: {
    readonly base: WaClientBase;
    readonly runtime: WaClientBuildRuntime;
}): WaClientDependencies;
export {};
