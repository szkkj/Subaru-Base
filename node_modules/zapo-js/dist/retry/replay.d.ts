import type { WaAuthCredentials } from '../auth/types';
import type { Logger } from '../infra/log/types';
import { type IcdcMeta } from '../message/crypto/icdc';
import type { WaMessageClient } from '../message/WaMessageClient';
import type { WaRetryOutboundMessageRecord } from './types';
import type { SignalSessionResolver } from '../signal/session/resolver';
import type { SignalProtocol } from '../signal/session/SignalProtocol';
import type { BinaryNode } from '../transport/types';
export interface WaRetryReplayServiceOptions {
    readonly logger: Logger;
    readonly messageClient: WaMessageClient;
    readonly signalProtocol: SignalProtocol;
    readonly sessionResolver: SignalSessionResolver;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    readonly isMobilePrimary?: () => boolean;
    readonly resolveUserIcdc?: (userJid: string) => Promise<IcdcMeta | null>;
    /**
     * Resolves the trusted-contact (privacy) token node for a recipient user
     * jid. A resend without it is nacked with error 463 by privacy-gated
     * recipients.
     */
    readonly resolvePrivacyTokenNode?: (recipientJid: string) => Promise<BinaryNode | null>;
}
export type WaRetryResendResult = 'resent' | 'ineligible';
/**
 * Replays a previously-sent outbound message in response to an incoming
 * retry receipt. Dispatches to plaintext/encrypted/opaque-node handlers
 * based on the stored payload shape.
 */
export declare class WaRetryReplayService {
    private readonly options;
    constructor(options: WaRetryReplayServiceOptions);
    /**
     * Resends `outbound` to `requesterJid`. Returns `'resent'` on a fresh
     * send or `'ineligible'` when the cached payload cannot satisfy the
     * request (e.g. requester not in the original device list).
     */
    resendOutboundMessage(outbound: WaRetryOutboundMessageRecord, requesterJid: string, retryCount: number): Promise<WaRetryResendResult>;
    private resendPlaintextPayload;
    private resolveSignedDeviceIdentity;
    /**
     * Resolves the trusted-contact token node for the requester's user jid. A
     * failure (or absent resolver) yields no node and the resend still goes out.
     */
    private resolvePrivacyToken;
    private refreshRetryPlaintext;
    private safeUserJid;
    private resendGroupPlaintextPayload;
    private resendEncryptedPayload;
    private resendOpaquePayload;
    private isRequesterCurrentAccount;
    private isOpaqueReplayCompatible;
}
