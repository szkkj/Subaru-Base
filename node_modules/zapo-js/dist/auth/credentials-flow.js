"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOrCreateCredentials = loadOrCreateCredentials;
exports.persistCredentials = persistCredentials;
exports.buildCommsConfig = buildCommsConfig;
const _crypto_1 = require("../crypto");
const keys_1 = require("../crypto/core/keys");
const X25519_1 = require("../crypto/curves/X25519");
const jid_1 = require("../protocol/jid");
const _signal_1 = require("../signal");
const WaMobileTcpSocket_1 = require("../transport/node/WaMobileTcpSocket");
const WaMobileClientPayload_1 = require("../transport/noise/WaMobileClientPayload");
const proxy_1 = require("../transport/proxy");
const primitives_1 = require("../util/primitives");
async function loadOrCreateCredentials(args) {
    args.logger.trace('auth credentials loadOrCreate start');
    const existing = await args.authStore.load();
    if (!existing) {
        const credentials = await createFreshAndPersistCredentials(args);
        args.logger.info('created fresh auth credentials');
        return credentials;
    }
    args.logger.debug('auth credentials loaded from store', {
        registered: existing.meJid !== null && existing.meJid !== undefined,
        hasServerStaticKey: existing.serverStaticKey !== null && existing.serverStaticKey !== undefined
    });
    const skipSignedPreKeyCheck = args.skipSignedPreKeySignatureVerification === true;
    if (!existing.meJid &&
        !skipSignedPreKeyCheck &&
        !(await hasValidSignedPreKey(args.logger, existing))) {
        args.logger.warn('signed pre-key is invalid, regenerating credentials');
        const fresh = await createFreshAndPersistCredentials(args);
        args.logger.info('regenerated credentials due to invalid signed pre-key');
        return fresh;
    }
    await restoreSignalStore(args.signalStore, args.preKeyStore, existing);
    args.logger.trace('auth credentials restored into signal store');
    // A mobile primary has no self-signed device-identity and no key-index-list:
    // both are companion-only (set at pairing). Do not re-add them here.
    return existing;
}
async function persistCredentials(args, credentials) {
    args.logger.trace('persisting auth credentials', {
        registered: credentials.meJid !== null && credentials.meJid !== undefined
    });
    await args.authStore.save(credentials);
}
function mobileTransportFromCredentials(credentials) {
    if (!credentials.deviceInfo)
        return undefined;
    return {
        deviceInfo: credentials.deviceInfo,
        ...(credentials.pushName !== undefined ? { pushName: credentials.pushName } : {}),
        ...(credentials.yearClass !== undefined ? { yearClass: credentials.yearClass } : {}),
        ...(credentials.memClass !== undefined ? { memClass: credentials.memClass } : {})
    };
}
async function resolveVersion(version) {
    if (version === undefined)
        return undefined;
    if (typeof version === 'string')
        return version;
    const resolved = await version();
    if (typeof resolved !== 'string' || resolved.length === 0) {
        throw new Error('version resolver returned a non-string value');
    }
    return resolved;
}
/**
 * Validates the user-supplied `version` string against the transport it will
 * feed. A mobile session sends the version as the four-part Android app
 * version (`2.YY.WW.RR`) in the login payload, so it must have exactly four
 * numeric parts. A web session advertises up to five parts (`2.3000.x[.y.z]`),
 * so three to five numeric parts are accepted.
 */
function assertValidVersion(version, mobile) {
    const parts = version.split('.');
    const allNumeric = parts.every((part) => (0, primitives_1.parseOptionalInt)(part) !== undefined);
    if (mobile) {
        if (parts.length !== 4 || !allNumeric) {
            throw new Error(`mobile session requires a 4-part numeric version (e.g. 2.26.27.70), got: ${version}`);
        }
        return;
    }
    if (parts.length < 3 || parts.length > 5 || !allNumeric) {
        throw new Error(`web session requires a 3- to 5-part numeric version (e.g. 2.3000.1040229458), got: ${version}`);
    }
}
async function buildCommsConfig(logger, credentials, socketOptions, clientOptions) {
    const meJid = credentials.meJid;
    const registered = meJid !== null && meJid !== undefined;
    const loginIdentity = registered ? (0, jid_1.getLoginIdentity)(meJid) : null;
    const wsProxy = socketOptions.proxy?.ws;
    // Resolve the effective mobile transport: explicit option wins, otherwise
    // synthesize one from persisted credentials.deviceInfo so a registered
    // mobile session boots in mobile mode without the caller re-passing
    // deviceInfo on every `new WaClient(...)` call.
    const effectiveMobileTransport = clientOptions.mobileTransport ?? mobileTransportFromCredentials(credentials);
    logger.debug('building comms config from credentials', {
        registered,
        hasServerStaticKey: credentials.serverStaticKey !== null && credentials.serverStaticKey !== undefined,
        mobile: Boolean(effectiveMobileTransport),
        mobileSource: clientOptions.mobileTransport
            ? 'option'
            : effectiveMobileTransport
                ? 'credentials'
                : 'none'
    });
    const resolvedVersion = effectiveMobileTransport && clientOptions.mobileAppVersionOverride !== undefined
        ? undefined
        : await resolveVersion(clientOptions.version);
    if (resolvedVersion !== undefined) {
        assertValidVersion(resolvedVersion, Boolean(effectiveMobileTransport));
    }
    if (effectiveMobileTransport) {
        (0, proxy_1.assertTcpProxySupported)(wsProxy);
        if (!loginIdentity) {
            throw new Error('mobileTransport requires registered credentials (meJid) – run the mobile bridge flow first');
        }
        if (clientOptions.mobileAppVersionOverride !== undefined) {
            assertValidVersion(clientOptions.mobileAppVersionOverride, true);
        }
        const appVersionOverride = clientOptions.mobileAppVersionOverride ?? resolvedVersion;
        const deviceInfo = appVersionOverride
            ? { ...effectiveMobileTransport.deviceInfo, appVersion: appVersionOverride }
            : effectiveMobileTransport.deviceInfo;
        const loginPayload = (0, WaMobileClientPayload_1.buildMobileLoginPayload)({
            username: loginIdentity.username,
            device: loginIdentity.device,
            passive: effectiveMobileTransport.passive ?? false,
            deviceInfo,
            pushName: effectiveMobileTransport.pushName,
            yearClass: effectiveMobileTransport.yearClass,
            memClass: effectiveMobileTransport.memClass
        });
        return {
            url: effectiveMobileTransport.tcpUrl ?? 'tcp://g.whatsapp.net:443',
            rawWebSocketConstructor: WaMobileTcpSocket_1.WaMobileTcpSocketCtor,
            agent: (0, proxy_1.toProxyAgent)(wsProxy),
            connectTimeoutMs: socketOptions.connectTimeoutMs,
            reconnectIntervalMs: socketOptions.reconnectIntervalMs,
            timeoutIntervalMs: socketOptions.timeoutIntervalMs,
            maxReconnectAttempts: socketOptions.maxReconnectAttempts,
            noise: {
                clientStaticKeyPair: credentials.noiseKeyPair,
                isRegistered: true,
                serverStaticKey: credentials.serverStaticKey,
                routingInfo: credentials.routingInfo,
                trustedRootCa: clientOptions.noiseTrustedRootCa,
                verifyCertificateChain: clientOptions.disableNoiseCertificateChainVerification
                    ? false
                    : undefined,
                loginPayload
            }
        };
    }
    const versionBase = resolvedVersion;
    return {
        url: socketOptions.url,
        urls: socketOptions.urls,
        protocols: socketOptions.protocols,
        dispatcher: (0, proxy_1.toProxyDispatcher)(wsProxy),
        agent: (0, proxy_1.toProxyAgent)(wsProxy),
        connectTimeoutMs: socketOptions.connectTimeoutMs,
        reconnectIntervalMs: socketOptions.reconnectIntervalMs,
        timeoutIntervalMs: socketOptions.timeoutIntervalMs,
        maxReconnectAttempts: socketOptions.maxReconnectAttempts,
        noise: {
            clientStaticKeyPair: credentials.noiseKeyPair,
            isRegistered: registered,
            serverStaticKey: registered ? credentials.serverStaticKey : undefined,
            routingInfo: credentials.routingInfo,
            trustedRootCa: clientOptions.noiseTrustedRootCa,
            verifyCertificateChain: clientOptions.disableNoiseCertificateChainVerification
                ? false
                : undefined,
            loginPayloadConfig: loginIdentity
                ? {
                    username: loginIdentity.username,
                    device: loginIdentity.device,
                    loginCounter: credentials.loginCounter ?? 0,
                    connectAttemptCount: clientOptions.connectAttemptCount ?? 0,
                    deviceBrowser: clientOptions.deviceBrowser,
                    deviceOsDisplayName: clientOptions.deviceOsDisplayName,
                    versionBase
                }
                : undefined,
            registrationPayloadConfig: !loginIdentity
                ? {
                    registrationInfo: credentials.registrationInfo,
                    signedPreKey: credentials.signedPreKey,
                    deviceBrowser: clientOptions.deviceBrowser,
                    deviceOsDisplayName: clientOptions.deviceOsDisplayName,
                    deviceOsVersion: clientOptions.deviceOsVersion,
                    requireFullSync: clientOptions.requireFullSync,
                    versionBase
                }
                : undefined
        }
    };
}
async function createFreshCredentials(signalStore, preKeyStore, logger) {
    logger.trace('creating fresh credentials');
    const [noiseKeyPair, registrationBundle, advSecretKey] = await Promise.all([
        X25519_1.X25519.generateKeyPair(),
        (0, _signal_1.createAndStoreInitialKeys)(signalStore, preKeyStore),
        (0, _crypto_1.randomBytesAsync)(32)
    ]);
    return {
        noiseKeyPair,
        registrationInfo: registrationBundle.registrationInfo,
        signedPreKey: registrationBundle.signedPreKey,
        serverHasPreKeys: false,
        advSecretKey
    };
}
async function createFreshAndPersistCredentials(args) {
    const credentials = await createFreshCredentials(args.signalStore, args.preKeyStore, args.logger);
    // Persist credentials first so signal restore never commits state for credentials that failed to save.
    await args.authStore.save(credentials);
    await restoreSignalStore(args.signalStore, args.preKeyStore, credentials);
    return credentials;
}
async function hasValidSignedPreKey(logger, credentials) {
    try {
        const serializedPubKey = (0, keys_1.toSerializedPubKey)(credentials.signedPreKey.keyPair.pubKey);
        const valid = await (0, _crypto_1.xeddsaVerify)((0, _crypto_1.toRawPubKey)(credentials.registrationInfo.identityKeyPair.pubKey), serializedPubKey, credentials.signedPreKey.signature);
        logger.trace('signed pre-key validation completed', { valid });
        return valid;
    }
    catch (error) {
        logger.warn('signed pre-key validation failed with exception', {
            message: (0, primitives_1.toError)(error).message
        });
        return false;
    }
}
async function restoreSignalStore(signalStore, preKeyStore, credentials) {
    await Promise.all([
        signalStore.setRegistrationInfo(credentials.registrationInfo),
        signalStore.setSignedPreKey(credentials.signedPreKey),
        preKeyStore.setServerHasPreKeys(credentials.serverHasPreKeys === true)
    ]);
}
