import type { WaAuthClientOptions, WaAuthCredentials, WaAuthSocketOptions } from './types';
import type { Logger } from '../infra/log/types';
import type { WaAuthStore } from '../store/contracts/auth.store';
import type { WaPreKeyStore } from '../store/contracts/pre-key.store';
import type { WaSignalStore } from '../store/contracts/signal.store';
import type { WaNoiseRootCa } from '../transport/noise/WaNoiseCert';
import type { WaCommsConfig } from '../transport/types';
interface WaAuthCredentialsFlowArgs {
    readonly logger: Logger;
    readonly authStore: WaAuthStore;
    readonly signalStore: WaSignalStore;
    readonly preKeyStore: WaPreKeyStore;
    readonly skipSignedPreKeySignatureVerification?: boolean;
}
export declare function loadOrCreateCredentials(args: WaAuthCredentialsFlowArgs): Promise<WaAuthCredentials>;
export declare function persistCredentials(args: WaAuthCredentialsFlowArgs, credentials: WaAuthCredentials): Promise<void>;
export declare function buildCommsConfig(logger: Logger, credentials: WaAuthCredentials, socketOptions: WaAuthSocketOptions, clientOptions: Pick<WaAuthClientOptions, 'deviceBrowser' | 'deviceOsDisplayName' | 'deviceOsVersion' | 'requireFullSync' | 'version' | 'mobileTransport'> & {
    readonly noiseTrustedRootCa?: WaNoiseRootCa;
    readonly disableNoiseCertificateChainVerification?: boolean;
    /**
     * One-shot override for the mobile `deviceInfo.appVersion` on this
     * connect, applied on top of the resolved mobile transport. Used by
     * the `recoverFromClientTooOld` auto-retry to inject a fresh Android
     * app version fetched from the public listing. Ignored for web
     * sessions.
     */
    readonly mobileAppVersionOverride?: string;
    /** Successful logins made by the calling client instance so far. */
    readonly connectAttemptCount?: number;
}): Promise<WaCommsConfig>;
export {};
