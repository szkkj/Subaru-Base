import type { Logger } from '../../infra/log/types';
import type { RegistrationInfo, SignedPreKeyRecord } from '../types';
import type { WaPreKeyStore } from '../../store/contracts/pre-key.store';
import type { WaSignalStore } from '../../store/contracts/signal.store';
import type { BinaryNode } from '../../transport/types';
interface SignalDigestSyncApiOptions {
    readonly logger: Logger;
    readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly signalStore: WaSignalStore;
    readonly preKeyStore: WaPreKeyStore;
    readonly defaultTimeoutMs?: number;
    readonly hostDomain?: string;
}
export interface SignalDigestValidationResult {
    readonly valid: boolean;
    readonly shouldReupload: boolean;
    readonly reason: 'ok' | 'missing_remote_digest' | 'unsupported_key_bundle_type' | 'missing_local_state' | 'registration_mismatch' | 'identity_mismatch' | 'signed_prekey_mismatch' | 'missing_local_prekey' | 'hash_mismatch';
    readonly preKeyCount: number;
}
export interface SignalDigestPrefetchedLocalKeyBundle {
    readonly registrationInfo: RegistrationInfo;
    readonly signedPreKey: SignedPreKeyRecord;
}
/**
 * Validates the local Signal key bundle (identity, signed prekey, one-time
 * prekey ids) against the server-side digest. Used to detect drift after a
 * crash or partial sync and decide whether to re-upload.
 */
export declare class SignalDigestSyncApi {
    private readonly logger;
    private readonly query;
    private readonly signalStore;
    private readonly preKeyStore;
    private readonly defaultTimeoutMs;
    private readonly hostDomain;
    constructor(options: SignalDigestSyncApiOptions);
    /**
     * Compares the local Signal key bundle digest with the server's. Returns
     * a structured result describing whether anything diverged and which
     * field caused the mismatch.
     */
    validateLocalKeyBundle(timeoutMs?: number): Promise<SignalDigestValidationResult>;
    validateLocalKeyBundle(prefetched?: SignalDigestPrefetchedLocalKeyBundle, timeoutMs?: number): Promise<SignalDigestValidationResult>;
    private parseDigestPayload;
}
export {};
