import type { WaAbPropName } from '../../abprops-spec';
import type { WaAuthCredentials } from '../../auth/types';
import type { WaIncomingMessageEvent } from '../types';
import type { Logger } from '../../infra/log/types';
import type { IcdcMeta } from '../../message/crypto/icdc';
import type { PeerDataOperationRequester } from '../../message/primitives/peer-data-operation';
import type { WaMessageClient } from '../../message/WaMessageClient';
import type { WaRetryDecryptFailureContext } from '../../retry/types';
import type { SignalDeviceSyncApi } from '../../signal/api/SignalDeviceSyncApi';
import type { SignalMissingPreKeysSyncApi } from '../../signal/api/SignalMissingPreKeysSyncApi';
import type { SignalSessionResolver } from '../../signal/session/resolver';
import type { SignalProtocol } from '../../signal/session/SignalProtocol';
import type { WaPreKeyStore } from '../../store/contracts/pre-key.store';
import type { WaRetryStore } from '../../store/contracts/retry.store';
import type { WaSenderKeyStore } from '../../store/contracts/sender-key.store';
import type { WaSessionStore } from '../../store/contracts/session.store';
import type { WaSignalStore } from '../../store/contracts/signal.store';
import type { BinaryNode } from '../../transport/types';
interface WaRetryCoordinatorOptions {
    readonly logger: Logger;
    readonly retryStore: WaRetryStore;
    readonly signalStore: WaSignalStore;
    readonly preKeyStore: WaPreKeyStore;
    readonly sessionStore: WaSessionStore;
    readonly senderKeyStore: WaSenderKeyStore;
    readonly signalProtocol: SignalProtocol;
    readonly sessionResolver: SignalSessionResolver;
    readonly signalDeviceSync: SignalDeviceSyncApi;
    readonly signalMissingPreKeysSync: SignalMissingPreKeysSyncApi;
    readonly messageClient: WaMessageClient;
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    /** Refresh device-list ICDC for the given user jid; passed through to retry replay. */
    readonly resolveUserIcdc?: (userJid: string) => Promise<IcdcMeta | null>;
    readonly peerDataOperation?: PeerDataOperationRequester;
    readonly emitIncomingMessage?: (event: WaIncomingMessageEvent) => void;
    /**
     * Placeholder resend asks the primary phone (a peer) for the plaintext. A
     * mobile primary is itself the phone and has no peer to ask, so when this
     * resolves true the coordinator skips the resend and falls back to plain
     * retry receipts. Resolved per failure (post-connect, after credentials
     * load) so a registered mobile session reconnecting without an explicit
     * `mobileTransport` option still takes the fallback path.
     */
    readonly isMobilePrimary?: () => boolean;
    /**
     * Resolves the trusted-contact (privacy) token node for a recipient user
     * jid: retry resends must carry the same `<tctoken>` the original send did,
     * or privacy-gated recipients nack them with error 463.
     */
    readonly resolvePrivacyTokenNode?: (recipientJid: string) => Promise<BinaryNode | null>;
    /**
     * Server-synced AB props. Only `placeholder_message_resend_maximum_days_limit`
     * is read; falls back to the spec default when unwired.
     */
    readonly getAbPropNumber?: (name: WaAbPropName) => number;
}
export declare class WaRetryCoordinator {
    private readonly deps;
    private readonly retryTtlMs;
    private readonly retryReplayService;
    private readonly retryProcessingByMessageId;
    private readonly retrySessionBaseKeys;
    private nextRetryCleanupAtMs;
    private readonly placeholderInFlight;
    private placeholderQueue;
    private placeholderTimer;
    private readonly decryptFailureQueue;
    constructor(options: WaRetryCoordinatorOptions);
    onDecryptFailure(context: WaRetryDecryptFailureContext, error: unknown): Promise<boolean>;
    private handleDecryptFailure;
    handleIncomingRetryReceipt(receiptNode: BinaryNode): Promise<void>;
    private isRetryReceiptNode;
    private prepareDecryptFailureRetry;
    private sendDecryptFailureRetryReceipt;
    private sendDecryptFailureAck;
    private handleParsedRetryRequest;
    private processRetryRequest;
    private prepareRetryResend;
    trackOutboundReceipt(receiptNode: BinaryNode): Promise<void>;
    private runRetryTaskSerialized;
    private buildRetryKeysSection;
    private updateLocalSessionFromRetryRequest;
    private applySessionBaseKeyPolicy;
    private markRetryRequesterSenderKeyAsStale;
    private fetchMissingPreKeysSession;
    private authorizeRetryRequest;
    private isRequesterAuthorizedDevice;
    private mapOutboundStateFromReceiptType;
    private sendRetryAckSafe;
    private maybeCleanupRetryStore;
    private retrySessionBaseKeyMapKey;
    private setRetrySessionBaseKey;
    private getRetrySessionBaseKey;
    private cleanupRetrySessionBaseKeys;
    private isSenderFromOwnAccount;
    /**
     * Queues a `PLACEHOLDER_MESSAGE_RESEND` peer request for a message the server
     * delivered as `<unavailable/>` (no `<enc>` to decrypt, so no retry receipt).
     * Returns `false` when the placeholder is unrecoverable, too old, or this
     * session is the primary. The payload surfaces later as a `message` event.
     */
    onUnavailableMessage(context: WaRetryDecryptFailureContext): boolean;
    private getPlaceholderResendMaxAgeSeconds;
    /**
     * Builds the message key the primary indexes the message under: the chat is
     * the `from`, or the `recipient` for a self-sent 1:1, always without the
     * `:device` segment. The participant rides along only for an incoming
     * group/broadcast message. Asking with the raw device-addressed `from`
     * matches nothing and the resend comes back empty.
     */
    private buildPlaceholderResendKey;
    private enqueuePlaceholderResend;
    private flushPlaceholderBatch;
}
export {};
