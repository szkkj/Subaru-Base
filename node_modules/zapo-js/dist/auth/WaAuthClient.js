"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaAuthClient = void 0;
const credentials_flow_1 = require("./credentials-flow");
const WaPairingFlow_1 = require("./pairing/WaPairingFlow");
const WaQrFlow_1 = require("./pairing/WaQrFlow");
const WaShortcakeFlow_1 = require("./pairing/WaShortcakeFlow");
const constants_1 = require("../protocol/constants");
const global_1 = require("../transport/node/builders/global");
const WaClientPayload_1 = require("../transport/noise/WaClientPayload");
const bytes_1 = require("../util/bytes");
const primitives_1 = require("../util/primitives");
/**
 * Owns the auth/pairing lifecycle and persistence of {@link WaAuthCredentials}.
 * Exposed as `client.auth` on a {@link WaClient}.
 *
 * Lifecycle: construct with options + dependencies, call
 * {@link loadOrCreateCredentials} to bring credentials online, then either
 * follow the QR flow (`onQr` callback) or call {@link requestPairingCode} for
 * the link-code flow.
 */
class WaAuthClient {
    constructor(options, deps) {
        this.versionOverride = null;
        this.mobileAppVersionOverride = null;
        /**
         * Successful logins made by this instance, advertised as
         * `connectAttemptCount`. Process-local by design – the persisted
         * counterpart is `credentials.loginCounter`.
         */
        this.connectAttemptCount = 0;
        const device = (0, constants_1.resolveWaDeviceIdentity)(options);
        this.options = Object.freeze({
            ...options,
            deviceBrowser: device.browser,
            deviceOsDisplayName: device.osDisplayName,
            deviceOsVersion: device.osVersion ?? undefined,
            devicePlatform: device.platform,
            requireFullSync: options.requireFullSync
        });
        this.logger = deps.logger;
        this.callbacks = deps.callbacks ?? {};
        this.authStore = deps.authStore;
        this.signalStore = deps.signalStore;
        this.preKeyStore = deps.preKeyStore;
        this.isConnected = deps.isConnected;
        this.credentials = null;
        this.qrFlow = new WaQrFlow_1.WaQrFlow({
            logger: this.logger,
            getCredentials: () => this.credentials,
            getDevicePlatform: () => device.platform,
            emitQr: (qr, ttlMs) => this.callbacks.onQr?.(qr, ttlMs)
        });
        this.pairingFlow = new WaPairingFlow_1.WaPairingFlow({
            logger: this.logger,
            auth: {
                getCredentials: () => this.credentials,
                updateCredentials: this.updateCredentials.bind(this)
            },
            socket: deps.socket,
            qrFlow: this.qrFlow,
            device,
            callbacks: {
                emitPairingCode: (code) => this.callbacks.onPairingCode?.(code),
                emitPairingRefresh: (forceManual) => this.callbacks.onPairingRefresh?.(forceManual),
                emitPaired: (credentials) => this.callbacks.onPaired?.(credentials)
            },
            dangerous: options.dangerous
        });
        this.socket = deps.socket;
        const signAssertion = deps.callbacks?.signPasskeyAssertion;
        this.shortcakeFlow = signAssertion
            ? new WaShortcakeFlow_1.WaShortcakeFlow({
                logger: this.logger,
                socket: {
                    sendNode: deps.socket.sendNode,
                    query: (node, timeoutMs) => deps.socket.query(node, timeoutMs)
                },
                signAssertion,
                auth: {
                    getCredentials: () => this.credentials,
                    updateCredentials: this.updateCredentials.bind(this)
                },
                deviceType: (0, WaClientPayload_1.resolveDevicePropsPlatformType)(device.browser)
            })
            : null;
    }
    /**
     * Returns a snapshot of auth readiness flags (connection, registration,
     * pending QR/pairing prompts).
     */
    getState(connected = false) {
        return {
            connected,
            registered: this.credentials?.meJid !== null && this.credentials?.meJid !== undefined,
            hasQr: this.qrFlow.hasQr(),
            hasPairingCode: this.pairingFlow.hasPairingSession()
        };
    }
    /** Returns the currently-loaded credentials, or `null` before initialization. */
    getCurrentCredentials() {
        return this.credentials;
    }
    /**
     * Loads persisted credentials from the auth store, or generates a fresh
     * set when none exist. Must be called before connecting.
     */
    async loadOrCreateCredentials() {
        return this.runHandled(async () => {
            this.logger.debug('auth client loadOrCreateCredentials start');
            this.credentials = await (0, credentials_flow_1.loadOrCreateCredentials)({
                logger: this.logger,
                authStore: this.authStore,
                signalStore: this.signalStore,
                preKeyStore: this.preKeyStore,
                skipSignedPreKeySignatureVerification: this.options.dangerous?.disableSignedPreKeySignatureVerification
            });
            this.logger.info('auth client credentials ready', {
                registered: this.credentials?.meJid !== null && this.credentials?.meJid !== undefined
            });
            return this.credentials;
        });
    }
    /**
     * Builds a {@link WaCommsConfig} from the current credentials and the
     * runtime device/transport options – feeds {@link WaComms}.
     */
    async buildCommsConfig(socketOptions, overrides = {}) {
        this.logger.trace('auth client building comms config');
        const override = this.versionOverride;
        this.versionOverride = null;
        const mobileAppVersionOverride = this.mobileAppVersionOverride;
        this.mobileAppVersionOverride = null;
        return (0, credentials_flow_1.buildCommsConfig)(this.logger, this.requireCredentials(), socketOptions, {
            connectAttemptCount: this.connectAttemptCount,
            deviceBrowser: this.options.deviceBrowser,
            deviceOsDisplayName: this.options.deviceOsDisplayName,
            deviceOsVersion: this.options.deviceOsVersion,
            requireFullSync: this.options.requireFullSync,
            version: override ?? this.options.version,
            mobileTransport: this.options.mobileTransport,
            mobileAppVersionOverride: mobileAppVersionOverride ?? undefined,
            noiseTrustedRootCa: overrides.noiseTrustedRootCa,
            disableNoiseCertificateChainVerification: overrides.disableNoiseCertificateChainVerification ??
                this.options.dangerous?.disableNoiseCertificateChainVerification
        });
    }
    /**
     * One-shot override for the next {@link buildCommsConfig} call: takes
     * precedence over the user-supplied `version` option, then clears. Used
     * by the `recoverFromClientTooOld` auto-retry to inject a fresh version
     * string fetched from `web.whatsapp.com` without mutating the user's
     * options.
     */
    setNextConnectVersion(version) {
        this.versionOverride = version;
    }
    /**
     * One-shot override for the mobile `deviceInfo.appVersion` on the next
     * {@link buildCommsConfig} call, then clears. The mobile transport reads
     * its version from `deviceInfo.appVersion` (the login payload), not the
     * `version` string, so {@link setNextConnectVersion} has no effect on a
     * mobile session. Used by the `recoverFromClientTooOld` auto-retry to
     * inject a fresh Android app version without mutating the user's options.
     */
    setNextConnectMobileAppVersion(appVersion) {
        this.mobileAppVersionOverride = appVersion;
    }
    /** Clears the in-memory QR and pairing sessions without touching storage. */
    // eslint-disable-next-line @typescript-eslint/require-await
    async clearTransientState() {
        this.logger.trace('auth client clear transient state');
        this.qrFlow.clear();
        this.pairingFlow.clearSession();
        this.shortcakeFlow?.clearSession();
    }
    /**
     * Wipes credentials from memory **and** from the auth store. Does
     * **not** touch the other store domains (signal, app-state, ...) -
     * those are cleared separately when {@link WaClient.logout} triggers
     * the server-side logout path, honoring `options.logoutStoreClear`.
     * Call this manually only when you want to force a re-pair without
     * going through the server logout IQ.
     */
    async clearStoredCredentials() {
        this.logger.warn('auth client clearing stored credentials');
        this.credentials = null;
        await Promise.all([this.authStore.clear(), this.clearTransientState()]);
    }
    /** Stores the server's noise static key for subsequent handshakes. */
    async persistServerStaticKey(serverStaticKey) {
        this.logger.debug('persisting server static key', {
            keyLength: serverStaticKey.byteLength
        });
        await this.patchCredentials((credentials) => ({
            ...credentials,
            serverStaticKey
        }));
    }
    /** Stores the "server holds prekeys" flag; persists only when the value changes. */
    async persistServerHasPreKeys(serverHasPreKeys) {
        await this.patchCredentials((credentials) => ({
            ...credentials,
            serverHasPreKeys
        }), {
            shouldPersist: (current) => current.serverHasPreKeys !== serverHasPreKeys,
            onPersist: () => {
                this.logger.debug('persisting serverHasPreKeys', {
                    serverHasPreKeys
                });
            }
        });
    }
    /**
     * Stores the routing-info blob received from the server. Skips persistence
     * when the value matches the one already on disk.
     */
    async persistRoutingInfo(routingInfo) {
        this.logger.trace('persisting routing info', {
            byteLength: routingInfo.byteLength
        });
        await this.patchCredentials((credentials) => ({
            ...credentials,
            routingInfo
        }), {
            shouldPersist: (current) => {
                if (current.routingInfo && (0, bytes_1.uint8Equal)(current.routingInfo, routingInfo)) {
                    this.logger.trace('routing info unchanged, skipping persistence');
                    return false;
                }
                return true;
            }
        });
    }
    /** Clears the persisted routing-info blob (used after a routing error). */
    async clearRoutingInfo() {
        return this.patchCredentials((credentials) => ({
            ...credentials,
            routingInfo: undefined
        }), {
            shouldPersist: (current) => current.routingInfo !== undefined,
            onPersist: () => {
                this.logger.warn('clearing persisted routing info');
            }
        });
    }
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
    async persistSuccessAttributes(attributes, { countsAsLogin = false } = {}) {
        if (countsAsLogin) {
            this.connectAttemptCount += 1;
        }
        let persistDiff;
        const computeDiff = (current, next) => ({
            loginCounterChanged: next.loginCounter !== current.loginCounter,
            lidChanged: next.meLid !== current.meLid,
            displayNameChanged: next.meDisplayName !== current.meDisplayName,
            companionChanged: (current.companionEncStatic === undefined) !==
                (next.companionEncStatic === undefined) ||
                (current.companionEncStatic !== undefined &&
                    next.companionEncStatic !== undefined &&
                    !(0, bytes_1.uint8Equal)(current.companionEncStatic, next.companionEncStatic)),
            lastSuccessTsChanged: next.lastSuccessTs !== current.lastSuccessTs,
            propsVersionChanged: next.propsVersion !== current.propsVersion,
            abPropsVersionChanged: next.abPropsVersion !== current.abPropsVersion,
            connectionLocationChanged: next.connectionLocation !== current.connectionLocation,
            accountCreationTsChanged: next.accountCreationTs !== current.accountCreationTs
        });
        await this.patchCredentials((credentials) => ({
            ...credentials,
            meLid: attributes.meLid ?? credentials.meLid,
            meDisplayName: attributes.meDisplayName ?? credentials.meDisplayName,
            companionEncStatic: attributes.companionEncStatic ?? credentials.companionEncStatic,
            lastSuccessTs: attributes.lastSuccessTs ?? credentials.lastSuccessTs,
            loginCounter: countsAsLogin
                ? (credentials.loginCounter ?? 0) + 1
                : credentials.loginCounter,
            propsVersion: attributes.propsVersion ?? credentials.propsVersion,
            abPropsVersion: attributes.abPropsVersion ?? credentials.abPropsVersion,
            connectionLocation: attributes.connectionLocation ?? credentials.connectionLocation,
            accountCreationTs: attributes.accountCreationTs ?? credentials.accountCreationTs
        }), {
            shouldPersist: (current, next) => {
                persistDiff = computeDiff(current, next);
                return Object.values(persistDiff).some(Boolean);
            },
            onPersist: () => {
                this.logger.debug('persisting success attributes', persistDiff);
            }
        });
    }
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
    async requestPairingCode(phoneNumber, shouldShowPushNotification = true, customCode) {
        this.requireConnected();
        this.requireCredentials();
        this.logger.debug('auth client requesting pairing code');
        return this.runHandled(() => this.pairingFlow.requestPairingCode(phoneNumber, shouldShowPushNotification, customCode));
    }
    /** Fetches the ISO country code the server resolved for the current account. */
    async fetchPairingCountryCodeIso() {
        this.requireConnected();
        this.requireCredentials();
        this.logger.trace('auth client fetching pairing country code ISO');
        return this.runHandled(() => this.pairingFlow.fetchPairingCountryCodeIso());
    }
    /** Dispatcher: returns `true` when `node` is a pairing-related IQ-set we handled. */
    async handleIncomingIqSet(node) {
        this.logger.trace('auth client handleIncomingIqSet', { id: node.attrs.id });
        return this.runHandled(() => this.pairingFlow.handleIncomingIqSet(node));
    }
    /** Dispatcher: returns `true` when `node` is a link-code companion notification. */
    async handleLinkCodeNotification(node) {
        const type = node.attrs.type;
        if (type === constants_1.WA_NOTIFICATION_TYPES.PASSKEY_PROLOGUE_REQUEST ||
            type === constants_1.WA_NOTIFICATION_TYPES.CRSC_CONTINUATION) {
            return this.runHandled(() => this.handleShortcakeNotification(node));
        }
        this.logger.trace('auth client handleLinkCodeNotification', { id: node.attrs.id });
        return this.runHandled(() => this.pairingFlow.handleLinkCodeNotification(node));
    }
    /**
     * Handles the server-forced passkey (Shortcake) prologue. With a configured
     * `signPasskeyAssertion` the full handshake runs; without one we just ack
     * and warn instead of silently stalling – which is what happens today when
     * the server demands a passkey after a successful pairing-code
     * `companion_finish`.
     */
    async handleShortcakeNotification(node) {
        if (node.attrs.type === constants_1.WA_NOTIFICATION_TYPES.PASSKEY_PROLOGUE_REQUEST) {
            this.callbacks.onPasskeyRequired?.(this.shortcakeFlow !== null);
        }
        if (this.shortcakeFlow) {
            return this.shortcakeFlow.handleIncomingNotification(node);
        }
        if (node.attrs.type === constants_1.WA_NOTIFICATION_TYPES.PASSKEY_PROLOGUE_REQUEST) {
            this.logger.warn('auth client: server requested passkey prologue but no signPasskeyAssertion configured', { id: node.attrs.id });
            await this.socket.sendNode((0, global_1.buildAckNode)({ kind: 'notification', node }));
            return true;
        }
        return false;
    }
    /** Dispatcher: returns `true` when `node` is a companion-registration refresh notification. */
    async handleCompanionRegRefreshNotification(node) {
        this.logger.trace('auth client handleCompanionRegRefreshNotification', {
            id: node.attrs.id
        });
        return this.runHandled(() => this.pairingFlow.handleCompanionRegRefreshNotification(node));
    }
    async patchCredentials(buildNext, options = {}) {
        const current = this.requireCredentials();
        const next = buildNext(current);
        if (options.shouldPersist && !options.shouldPersist(current, next)) {
            return current;
        }
        options.onPersist?.(current, next);
        await this.updateCredentials(next);
        return next;
    }
    async runHandled(action) {
        try {
            return await action();
        }
        catch (error) {
            this.handleError((0, primitives_1.toError)(error));
            throw error;
        }
    }
    async updateCredentials(credentials) {
        this.logger.trace('auth client update credentials', {
            registered: !!credentials?.meJid
        });
        this.credentials = credentials;
        await (0, credentials_flow_1.persistCredentials)({
            logger: this.logger,
            authStore: this.authStore,
            signalStore: this.signalStore,
            preKeyStore: this.preKeyStore
        }, credentials);
    }
    requireConnected() {
        if (this.isConnected && !this.isConnected()) {
            throw new Error('client is not connected');
        }
    }
    requireCredentials() {
        if (!this.credentials) {
            throw new Error('credentials are not initialized');
        }
        return this.credentials;
    }
    handleError(error) {
        this.logger.error('wa auth client error', { message: error.message });
        this.callbacks.onError?.(error);
    }
}
exports.WaAuthClient = WaAuthClient;
