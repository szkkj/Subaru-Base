import { type WaShortcakeAssertionSigner } from './pairing/WaShortcakeFlow';
import type { WaAuthClientOptions, WaAuthCredentials, WaAuthSocketOptions, WaSuccessPersistAttributes } from './types';
import type { Logger } from '../infra/log/types';
import type { WaAuthStore } from '../store/contracts/auth.store';
import type { WaPreKeyStore } from '../store/contracts/pre-key.store';
import type { WaSignalStore } from '../store/contracts/signal.store';
import type { WaNoiseRootCa } from '../transport/noise/WaNoiseCert';
import type { BinaryNode, WaCommsConfig } from '../transport/types';
type WaAuthClientDeps = Readonly<{
    readonly logger: Logger;
    readonly authStore: WaAuthStore;
    readonly signalStore: WaSignalStore;
    readonly preKeyStore: WaPreKeyStore;
    readonly socket: {
        readonly sendNode: (node: BinaryNode) => Promise<void>;
        readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    };
    readonly isConnected?: () => boolean;
    readonly callbacks?: {
        readonly onQr?: (qr: string, ttlMs: number) => void;
        readonly onPairingCode?: (code: string) => void;
        readonly onPairingRefresh?: (forceManual: boolean) => void;
        readonly onPaired?: (credentials: WaAuthCredentials) => void;
        readonly onError?: (error: Error) => void;
        /** Server forced a passkey (Shortcake) prologue; `hasSigner` = a signer is configured. */
        readonly onPasskeyRequired?: (hasSigner: boolean) => void;
        /** External WebAuthn signer – enables handling forced passkey (Shortcake) prologues. */
        readonly signPasskeyAssertion?: WaShortcakeAssertionSigner;
    };
}>;
/**
 * Owns the auth/pairing lifecycle and persistence of {@link WaAuthCredentials}.
 * Exposed as `client.auth` on a {@link WaClient}.
 *
 * Lifecycle: construct with options + dependencies, call
 * {@link loadOrCreateCredentials} to bring credentials online, then either
 * follow the QR flow (`onQr` callback) or call {@link requestPairingCode} for
 * the link-code flow.
 */
export declare class WaAuthClient {
    private readonly options;
    private readonly logger;
    private readonly callbacks;
    private readonly authStore;
    private readonly signalStore;
    private readonly preKeyStore;
    private readonly isConnected?;
    private readonly qrFlow;
    private readonly pairingFlow;
    private readonly socket;
    private readonly shortcakeFlow;
    private credentials;
    private versionOverride;
    private mobileAppVersionOverride;
    /**
     * Successful logins made by this instance, advertised as
     * `connectAttemptCount`. Process-local by design – the persisted
     * counterpart is `credentials.loginCounter`.
     */
    private connectAttemptCount;
    constructor(options: WaAuthClientOptions, deps: WaAuthClientDeps);
    /**
     * Returns a snapshot of auth readiness flags (connection, registration,
     * pending QR/pairing prompts).
     */
    getState(connected?: boolean): {
        connected: boolean;
        registered: boolean;
        hasQr: boolean;
        hasPairingCode: boolean;
    };
    /** Returns the currently-loaded credentials, or `null` before initialization. */
    getCurrentCredentials(): WaAuthCredentials | null;
    /**
     * Loads persisted credentials from the auth store, or generates a fresh
     * set when none exist. Must be called before connecting.
     */
    loadOrCreateCredentials(): Promise<WaAuthCredentials>;
    /**
     * Builds a {@link WaCommsConfig} from the current credentials and the
     * runtime device/transport options – feeds {@link WaComms}.
     */
    buildCommsConfig(socketOptions: WaAuthSocketOptions, overrides?: {
        readonly noiseTrustedRootCa?: WaNoiseRootCa;
        readonly disableNoiseCertificateChainVerification?: boolean;
    }): Promise<WaCommsConfig>;
    /**
     * One-shot override for the next {@link buildCommsConfig} call: takes
     * precedence over the user-supplied `version` option, then clears. Used
     * by the `recoverFromClientTooOld` auto-retry to inject a fresh version
     * string fetched from `web.whatsapp.com` without mutating the user's
     * options.
     */
    setNextConnectVersion(version: string): void;
    /**
     * One-shot override for the mobile `deviceInfo.appVersion` on the next
     * {@link buildCommsConfig} call, then clears. The mobile transport reads
     * its version from `deviceInfo.appVersion` (the login payload), not the
     * `version` string, so {@link setNextConnectVersion} has no effect on a
     * mobile session. Used by the `recoverFromClientTooOld` auto-retry to
     * inject a fresh Android app version without mutating the user's options.
     */
    setNextConnectMobileAppVersion(appVersion: string): void;
    /** Clears the in-memory QR and pairing sessions without touching storage. */
    clearTransientState(): Promise<void>;
    /**
     * Wipes credentials from memory **and** from the auth store. Does
     * **not** touch the other store domains (signal, app-state, ...) -
     * those are cleared separately when {@link WaClient.logout} triggers
     * the server-side logout path, honoring `options.logoutStoreClear`.
     * Call this manually only when you want to force a re-pair without
     * going through the server logout IQ.
     */
    clearStoredCredentials(): Promise<void>;
    /** Stores the server's noise static key for subsequent handshakes. */
    persistServerStaticKey(serverStaticKey: Uint8Array): Promise<void>;
    /** Stores the "server holds prekeys" flag; persists only when the value changes. */
    persistServerHasPreKeys(serverHasPreKeys: boolean): Promise<void>;
    /**
     * Stores the routing-info blob received from the server. Skips persistence
     * when the value matches the one already on disk.
     */
    persistRoutingInfo(routingInfo: Uint8Array): Promise<void>;
    /** Clears the persisted routing-info blob (used after a routing error). */
    clearRoutingInfo(): Promise<WaAuthCredentials>;
    /**
     * Persists the per-connection success attributes from the server (LID,
     * display name, companion key, last-success ts, props versions, ...). Only
     * persists when at least one attribute actually changed.
     *
     * Pass `countsAsLogin` only for the server `success` node: it advances the
     * login counters advertised as `lc` / `connectAttemptCount`. Callers that
     * merely reuse this to persist a single attribute (a push-name change, for
     * instance) must leave it unset.
     */
    persistSuccessAttributes(attributes: WaSuccessPersistAttributes, { countsAsLogin }?: {
        readonly countsAsLogin?: boolean;
    }): Promise<void>;
    /**
     * Requests an 8-character pairing code for `phoneNumber` (link-code flow).
     * Pass `customCode` to suggest a specific code; the server still validates
     * and may return a different one.
     *
     * The client must already be connected – kick off `WaClient.connect()` in
     * parallel, wait for the `auth_pairing_required` event (or any QR), then
     * call this. The user then enters the returned code in WhatsApp on their
     * phone under *Linked Devices → Link with phone number instead*.
     *
     * @example
     * ```ts
     * // Start the handshake; do NOT await – connect() resolves only after pairing
     * void client.connect()
     *
     * // Wait until the pairing screen is ready on the server side
     * await new Promise<void>((resolve) => client.once('auth_pairing_required', () => resolve()))
     *
     * // Phone number in international format, digits only
     * const code = await client.auth.requestPairingCode('5511999999999')
     * console.log(`enter this on your phone: ${code.match(/.{1,4}/g)!.join('-')}`)
     *
     * // The `connect()` promise resolves after the user types the code:
     * await new Promise<void>((resolve) => client.once('auth_paired', () => resolve()))
     * ```
     */
    requestPairingCode(phoneNumber: string, shouldShowPushNotification?: boolean, customCode?: string): Promise<string>;
    /** Fetches the ISO country code the server resolved for the current account. */
    fetchPairingCountryCodeIso(): Promise<string>;
    /** Dispatcher: returns `true` when `node` is a pairing-related IQ-set we handled. */
    handleIncomingIqSet(node: BinaryNode): Promise<boolean>;
    /** Dispatcher: returns `true` when `node` is a link-code companion notification. */
    handleLinkCodeNotification(node: BinaryNode): Promise<boolean>;
    /**
     * Handles the server-forced passkey (Shortcake) prologue. With a configured
     * `signPasskeyAssertion` the full handshake runs; without one we just ack
     * and warn instead of silently stalling – which is what happens today when
     * the server demands a passkey after a successful pairing-code
     * `companion_finish`.
     */
    private handleShortcakeNotification;
    /** Dispatcher: returns `true` when `node` is a companion-registration refresh notification. */
    handleCompanionRegRefreshNotification(node: BinaryNode): Promise<boolean>;
    private patchCredentials;
    private runHandled;
    private updateCredentials;
    private requireConnected;
    private requireCredentials;
    private handleError;
}
export {};
