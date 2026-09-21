import type { WaAppStateSyncClient } from '../../appstate/sync/WaAppStateSyncClient';
import type { WaAuthCredentials } from '../../auth/types';
import type { Logger } from '../../infra/log/types';
import type { SignalDigestSyncApi } from '../../signal/api/SignalDigestSyncApi';
import type { SignalRotateKeyApi } from '../../signal/api/SignalRotateKeyApi';
import type { WaPreKeyStore } from '../../store/contracts/pre-key.store';
import type { WaSignalStore } from '../../store/contracts/signal.store';
import type { BinaryNode } from '../../transport/types';
type WaPassiveTasksRuntime = {
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>, options?: {
        readonly useSystemId?: boolean;
    }) => Promise<BinaryNode>;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    readonly persistServerHasPreKeys: (serverHasPreKeys: boolean) => Promise<void>;
    readonly sendNodeDirect: (node: BinaryNode) => Promise<void>;
    readonly takeDanglingReceipts: () => readonly BinaryNode[];
    readonly requeueDanglingReceipt: (node: BinaryNode) => void;
    readonly shouldQueueDanglingReceipt: (node: BinaryNode, error: Error) => boolean;
    readonly syncAbProps: () => void;
    readonly sendInitialPresence: () => Promise<void>;
};
export declare class WaPassiveTasksCoordinator {
    private readonly logger;
    private readonly signalStore;
    private readonly preKeyStore;
    private readonly signalDigestSync;
    private readonly signalRotateKey;
    private readonly signedPreKeyRotationIntervalMs;
    private readonly signedPreKeyServerErrorBackoffMs;
    private readonly runtime;
    private readonly mobilePrimary;
    private readonly appStateSync?;
    private passiveTasksPromise;
    constructor(options: {
        readonly logger: Logger;
        readonly signalStore: WaSignalStore;
        readonly preKeyStore: WaPreKeyStore;
        readonly signalDigestSync: SignalDigestSyncApi;
        readonly signalRotateKey: SignalRotateKeyApi;
        readonly signedPreKeyRotationIntervalMs?: number;
        readonly signedPreKeyServerErrorBackoffMs?: number;
        readonly runtime: WaPassiveTasksRuntime;
        /**
         * Resolved when passive tasks run (post-connect, after credentials
         * load) so a registered mobile-primary session reconnecting without an
         * explicit `mobileTransport` option still bootstraps the primary path.
         */
        readonly mobilePrimary?: () => boolean;
        readonly appStateSync?: WaAppStateSyncClient;
    });
    startPassiveTasksAfterConnect(): void;
    handlePreKeyLowNotification(): Promise<void>;
    handleDigestNotification(): Promise<void>;
    resetInFlightState(): void;
    private runPassiveTasksAfterConnect;
    private sendActiveModeIq;
    private validateDigestAndRecoverPreKeys;
    private uploadPreKeysIfMissing;
    private rotateSignedPreKeyIfDue;
    private resolveLocalKeyBundleFromStore;
    private resolveRotationTimestamp;
    private flushDanglingReceipts;
}
export {};
