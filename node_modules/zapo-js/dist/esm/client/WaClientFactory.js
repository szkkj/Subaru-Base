import { WaAppStateSyncClient } from '../appstate/sync/WaAppStateSyncClient.js';
import { WaAuthClient } from '../auth/WaAuthClient.js';
import { WaConnectionManager } from './connection/WaConnectionManager.js';
import { WaReceiptQueue } from './connection/WaReceiptQueue.js';
import { WaAbPropsCoordinator } from './coordinators/WaAbPropsCoordinator.js';
import { WaAppStateMutationCoordinator } from './coordinators/WaAppStateMutationCoordinator.js';
import { createBotCoordinator } from './coordinators/WaBotCoordinator.js';
import { createBroadcastListCoordinator } from './coordinators/WaBroadcastListCoordinator.js';
import { createBusinessCoordinator } from './coordinators/WaBusinessCoordinator.js';
import { createEmailCoordinator } from './coordinators/WaEmailCoordinator.js';
import { createGroupCoordinator } from './coordinators/WaGroupCoordinator.js';
import { WaIncomingNodeCoordinator } from './coordinators/WaIncomingNodeCoordinator.js';
import { createLowLevelCoordinator } from './coordinators/WaLowLevelCoordinator.js';
import { WaMessageCoordinator } from './coordinators/WaMessageCoordinator.js';
import { WaMessageDispatchCoordinator } from './coordinators/WaMessageDispatchCoordinator.js';
import { WaMobileCoordinator } from './coordinators/WaMobileCoordinator.js';
import { createNewsletterCoordinator } from './coordinators/WaNewsletterCoordinator.js';
import { WaOfflineResumeCoordinator } from './coordinators/WaOfflineResumeCoordinator.js';
import { WaPassiveTasksCoordinator } from './coordinators/WaPassiveTasksCoordinator.js';
import { createPresenceCoordinator } from './coordinators/WaPresenceCoordinator.js';
import { createPrivacyCoordinator } from './coordinators/WaPrivacyCoordinator.js';
import { createProfileCoordinator } from './coordinators/WaProfileCoordinator.js';
import { WaRetryCoordinator } from './coordinators/WaRetryCoordinator.js';
import { createStatusCoordinator } from './coordinators/WaStatusCoordinator.js';
import { createStreamControlHandler } from './coordinators/WaStreamControlCoordinator.js';
import { WaTrustedContactTokenCoordinator } from './coordinators/WaTrustedContactTokenCoordinator.js';
import { DEVICE_NOTIFICATION_ACTIONS, parseDeviceNotification } from './events/devices.js';
import { handleDirtyBits, parseDirtyBits } from './events/dirty.js';
import { parseIdentityChangeNotification } from './events/identity.js';
import { parsePrivacyTokenNotification } from './events/privacy-token.js';
import { parseOwnUsernameNotification } from './events/username.js';
import { createDeviceFanoutResolver } from './messaging/fanout.js';
import { createGroupMetadataCache } from './messaging/group-metadata.js';
import { createAppStateSyncKeyProtocol } from './messaging/key-protocol.js';
import { resolveLinkPreview } from './messaging/link-preview.js';
import { buildMediaMessageContent, getMediaConn as getClientMediaConn } from './messaging/messages.js';
import { WaMediaTransferClient } from '../media/transfer/WaMediaTransferClient.js';
import { createDefaultLinkPreviewFetcher } from '../message/addons/link-preview/fetcher.js';
import { processNewsletterLiveUpdates } from '../message/kinds/newsletter.js';
import { handleIncomingMessageAck } from '../message/primitives/incoming.js';
import { createMediaRetryRequester } from '../message/primitives/media-retry.js';
import { createPeerDataOperationRequester } from '../message/primitives/peer-data-operation.js';
import { WaMessageClient } from '../message/WaMessageClient.js';
import { resolveWaDeviceIdentity, WA_DEFAULTS, WA_DISCONNECT_REASONS, WA_NEWSLETTER_NOTIFICATION_TAGS, WA_NODE_TAGS, WA_NOTIFICATION_TYPES, WA_PRIVACY_TOKEN_NOTIFICATION_TYPE } from '../protocol/constants.js';
import { isNewsletterJid, isOwnAccountJid, parseSignalAddressFromJid, toUserJid } from '../protocol/jid.js';
import { WA_PRESENCE_TYPES } from '../protocol/presence.js';
import { createOutboundRetryTracker } from '../retry/tracker.js';
import { SignalDeviceSyncApi } from '../signal/api/SignalDeviceSyncApi.js';
import { SignalDigestSyncApi } from '../signal/api/SignalDigestSyncApi.js';
import { SignalIdentitySyncApi } from '../signal/api/SignalIdentitySyncApi.js';
import { SignalMissingPreKeysSyncApi } from '../signal/api/SignalMissingPreKeysSyncApi.js';
import { SignalRotateKeyApi } from '../signal/api/SignalRotateKeyApi.js';
import { SignalSessionSyncApi } from '../signal/api/SignalSessionSyncApi.js';
import { SenderKeyManager } from '../signal/group/SenderKeyManager.js';
import { createSignalSessionResolver } from '../signal/session/resolver.js';
import { SignalProtocol } from '../signal/session/SignalProtocol.js';
import { WaKeepAlive } from '../transport/keepalive/WaKeepAlive.js';
import { buildAckNode } from '../transport/node/builders/global.js';
import { buildPresenceNode } from '../transport/node/builders/presence.js';
import { findNodeChild, getFirstNodeChild } from '../transport/node/helpers.js';
import { createUsyncSidGenerator } from '../transport/node/usync.js';
import { WaNodeOrchestrator } from '../transport/node/WaNodeOrchestrator.js';
import { WaNodeTransport } from '../transport/node/WaNodeTransport.js';
import { isProxyTransport, toProxyAgent } from '../transport/proxy.js';
import { createServerClock } from '../util/clock.js';
import { toError } from '../util/primitives.js';
function assertProxyTransport(value, path) {
    if (value === undefined) {
        return;
    }
    if (!isProxyTransport(value)) {
        throw new Error(`${path} must be a proxy transport instance (dispatcher with dispatch(...) or agent with addRequest(...))`);
    }
}
function validateProxyOptions(options) {
    const rawProxy = options.proxy;
    if (rawProxy === undefined) {
        return;
    }
    if (typeof rawProxy !== 'object' || rawProxy === null || Array.isArray(rawProxy)) {
        throw new Error('proxy must be an object with optional ws/mediaUpload/mediaDownload');
    }
    const proxy = rawProxy;
    assertProxyTransport(proxy?.ws, 'proxy.ws');
    assertProxyTransport(proxy?.mediaUpload, 'proxy.mediaUpload');
    assertProxyTransport(proxy?.mediaDownload, 'proxy.mediaDownload');
}
export function resolveWaClientBase(options, logger) {
    validateProxyOptions(options);
    const device = resolveWaDeviceIdentity(options);
    const sessionId = options.sessionId.trim();
    if (sessionId.length === 0) {
        throw new Error('sessionId must be a non-empty string');
    }
    const sessionStore = options.store.session(sessionId);
    const normalizedOptions = Object.freeze({
        ...options,
        sessionId,
        deviceBrowser: device.browser,
        deviceOsDisplayName: device.osDisplayName,
        deviceOsVersion: device.osVersion ?? undefined,
        devicePlatform: device.platform,
        urls: options.urls ?? options.chatSocketUrls ?? WA_DEFAULTS.CHAT_SOCKET_URLS,
        iqTimeoutMs: options.iqTimeoutMs ?? WA_DEFAULTS.IQ_TIMEOUT_MS,
        nodeQueryTimeoutMs: options.nodeQueryTimeoutMs ?? WA_DEFAULTS.NODE_QUERY_TIMEOUT_MS,
        keepAliveIntervalMs: options.keepAliveIntervalMs ?? WA_DEFAULTS.HEALTH_CHECK_INTERVAL_MS,
        deadSocketTimeoutMs: options.deadSocketTimeoutMs ?? WA_DEFAULTS.DEAD_SOCKET_TIMEOUT_MS,
        mediaTimeoutMs: options.mediaTimeoutMs ?? WA_DEFAULTS.MEDIA_TIMEOUT_MS,
        appStateSyncTimeoutMs: options.appStateSyncTimeoutMs ?? WA_DEFAULTS.APP_STATE_SYNC_TIMEOUT_MS,
        signalFetchKeyBundlesTimeoutMs: options.signalFetchKeyBundlesTimeoutMs ??
            WA_DEFAULTS.SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS,
        messageAckTimeoutMs: options.messageAckTimeoutMs ?? WA_DEFAULTS.MESSAGE_ACK_TIMEOUT_MS,
        messageMaxAttempts: options.messageMaxAttempts ?? WA_DEFAULTS.MESSAGE_MAX_ATTEMPTS,
        messageRetryDelayMs: options.messageRetryDelayMs ?? WA_DEFAULTS.MESSAGE_RETRY_DELAY_MS
    });
    return {
        options: normalizedOptions,
        logger,
        sessionStore
    };
}
function createIncomingNodeRuntime(input) {
    const { logger, emitEvent, authClient, connectionManager, nodeOrchestrator, streamControl, mediaMessageBuildOptions, retryCoordinator, mediaRetryRequester, messageDispatch, sendNode, syncAppState, disconnect, clearStoredCredentials, getCurrentCredentials, handleClientDirtyBits, incomingMessageAckOptions } = input;
    return {
        handleStreamControlResult: streamControl.handleStreamControlResult,
        persistSuccessAttributes: (attributes) => authClient.persistSuccessAttributes(attributes, { countsAsLogin: true }),
        emitSuccessNode: (node) => emitEvent('debug_connection_success', { node }),
        updateClockSkewFromSuccess: (serverUnixSeconds) => connectionManager.updateClockSkewFromSuccess(serverUnixSeconds),
        shouldWarmupMediaConn: () => !!(getCurrentCredentials()?.meJid && connectionManager.isConnected()),
        warmupMediaConn: async () => {
            await getClientMediaConn(mediaMessageBuildOptions, true);
        },
        persistRoutingInfo: (routingInfo) => authClient.persistRoutingInfo(routingInfo),
        tryResolvePendingNode: (node) => nodeOrchestrator.tryResolvePending(node),
        handleGenericIncomingNode: (node) => nodeOrchestrator.handleIncomingNode(node),
        handleIncomingIqSetNode: (node) => authClient.handleIncomingIqSet(node),
        handleLinkCodeNotificationNode: (node) => authClient.handleLinkCodeNotification(node),
        handleCompanionRegRefreshNotificationNode: (node) => authClient.handleCompanionRegRefreshNotification(node),
        handleIncomingMessageNode: (node) => handleIncomingMessageAck(node, incomingMessageAckOptions),
        sendNode,
        handleIncomingRetryReceipt: (node) => retryCoordinator.handleIncomingRetryReceipt(node),
        handleMediaRetryNotification: (node) => mediaRetryRequester.handleNotification(node),
        trackOutboundReceipt: (node) => retryCoordinator.trackOutboundReceipt(node),
        emitIncomingReceipt: (event) => emitEvent('receipt', event),
        emitIncomingPresence: (event) => emitEvent('presence', event),
        emitIncomingChatstate: (event) => emitEvent('chatstate', event),
        emitIncomingCall: (event) => emitEvent('call', event),
        getCurrentCredentials,
        emitIncomingFailure: (event) => emitEvent('stream_failure', event),
        emitIncomingErrorStanza: (event) => emitEvent('stanza_error', event),
        emitIncomingNotification: (event) => emitEvent('debug_notification', event),
        emitOfflineThreadMetadata: (event) => emitEvent('offline_thread_metadata', event),
        emitMexNotification: (event) => emitEvent('mex_notification', event),
        emitRegistrationCode: (event) => emitEvent('mobile_registration_code', event),
        emitAccountTakeoverNotice: (event) => emitEvent('mobile_account_takeover_notice', event),
        emitGroupEvent: (event) => {
            // Register the cache mutation before emitting so a handler that
            // sends synchronously sees the fresh participants, not the stale ones.
            void messageDispatch.mutateGroupMetadataCacheFromGroupEvent(event).catch((error) => {
                logger.warn('failed to mutate group metadata cache from group event', {
                    action: event.action,
                    groupJid: event.groupJid,
                    contextGroupJid: event.contextGroupJid,
                    message: toError(error).message
                });
            });
            emitEvent('group', event);
        },
        emitBusinessEvent: (event) => emitEvent('business', event),
        emitPictureEvent: (event) => emitEvent('picture', event),
        emitUnhandledIncomingNode: (event) => emitEvent('debug_unhandled_stanza', event),
        syncAppState,
        stopComms: () => {
            void connectionManager.getComms()?.stopComms();
        },
        disconnect,
        clearStoredCredentials,
        parseDirtyBits: (nodes) => parseDirtyBits(nodes, logger),
        handleDirtyBits: (dirtyBits) => handleClientDirtyBits(dirtyBits)
    };
}
function createPassiveTasksRuntime(input) {
    const { queryWithContext, authClient, nodeOrchestrator, receiptQueue, getCurrentCredentials, abPropsCoordinator, markOnlineOnConnect } = input;
    return {
        queryWithContext,
        getCurrentCredentials,
        persistServerHasPreKeys: (serverHasPreKeys) => authClient.persistServerHasPreKeys(serverHasPreKeys),
        sendNodeDirect: (node) => nodeOrchestrator.sendNode(node),
        takeDanglingReceipts: () => receiptQueue.take(),
        requeueDanglingReceipt: (node) => receiptQueue.enqueue(node),
        shouldQueueDanglingReceipt: (node, error) => receiptQueue.shouldQueue(node, error),
        syncAbProps: () => abPropsCoordinator.sync(),
        sendInitialPresence: async () => {
            const credentials = getCurrentCredentials();
            const name = credentials?.meDisplayName ?? undefined;
            const node = markOnlineOnConnect
                ? buildPresenceNode({ name })
                : buildPresenceNode({ type: WA_PRESENCE_TYPES.UNAVAILABLE, name });
            await nodeOrchestrator.sendNode(node, false);
        }
    };
}
export function buildWaClientDependencies(input) {
    const { base, runtime } = input;
    const { options, logger, sessionStore } = base;
    const receiptQueue = new WaReceiptQueue();
    let connectionManager = null;
    let passiveTasks = null;
    let mediaConnCacheFallback = null;
    let scheduleReconnectAfterPairing = () => undefined;
    const serverClock = createServerClock(() => connectionManager?.getClockSkewMs() ?? null);
    const nodeTransport = new WaNodeTransport(logger);
    const nodeOrchestrator = new WaNodeOrchestrator({
        sendNode: async (node) => nodeTransport.sendNode(node),
        logger,
        defaultTimeoutMs: options.nodeQueryTimeoutMs,
        hostDomain: WA_DEFAULTS.HOST_DOMAIN,
        mobileIqIdFormat: () => isMobilePrimary()
    });
    const keepAlive = new WaKeepAlive({
        logger,
        nodeOrchestrator,
        getComms: () => connectionManager?.getComms() ?? null,
        intervalMs: options.keepAliveIntervalMs,
        getIntervalMs: () => abPropsCoordinator.getConfigValue('heartbeat_interval_s') * 1000,
        timeoutMs: options.deadSocketTimeoutMs,
        hostDomain: WA_DEFAULTS.HOST_DOMAIN,
        onClockSkewMs: (clockSkewMs) => connectionManager?.setClockSkewMs(clockSkewMs, 'keepalive')
    });
    const mediaTransfer = new WaMediaTransferClient({
        logger,
        defaultTimeoutMs: options.mediaTimeoutMs,
        defaultUploadAgent: toProxyAgent(options.proxy?.mediaUpload),
        defaultDownloadAgent: toProxyAgent(options.proxy?.mediaDownload),
        skipMacVerification: options.dangerous?.disableMediaMacVerification
    });
    const linkPreviewOptions = options.linkPreview ?? {};
    const linkPreviewFetcher = linkPreviewOptions.fetcher ??
        createDefaultLinkPreviewFetcher({
            mediaTransfer,
            userAgent: linkPreviewOptions.userAgent,
            fetchTimeoutMs: linkPreviewOptions.fetchTimeoutMs,
            maxHtmlBytes: linkPreviewOptions.maxHtmlBytes,
            maxThumbnailBytes: linkPreviewOptions.maxThumbnailBytes,
            allowPrivateHosts: linkPreviewOptions.allowPrivateHosts,
            proxy: linkPreviewOptions.proxy ?? options.proxy?.linkPreview
        });
    const createLinkPreviewResolver = (surface) => (content) => resolveLinkPreview(content.text, content.linkPreview, {
        logger,
        mediaTransfer,
        getMediaConn: () => getClientMediaConn(mediaMessageBuildOptions),
        fetcher: linkPreviewFetcher,
        options: linkPreviewOptions,
        serverClock,
        surface
    });
    const mediaMessageBuildOptions = {
        logger,
        mediaTransfer,
        iqTimeoutMs: options.iqTimeoutMs,
        queryWithContext: runtime.queryWithContext,
        getMediaConnCache: () => {
            if (connectionManager) {
                return connectionManager.getMediaConnCache();
            }
            return mediaConnCacheFallback;
        },
        setMediaConnCache: (mediaConn) => {
            mediaConnCacheFallback = mediaConn;
            connectionManager?.setMediaConnCache(mediaConn);
        },
        serverClock,
        media: options.media,
        linkPreviewResolver: createLinkPreviewResolver()
    };
    const messageClient = new WaMessageClient({
        logger,
        sendNode: runtime.sendNode,
        query: runtime.query,
        defaultAckTimeoutMs: options.messageAckTimeoutMs,
        defaultMaxAttempts: options.messageMaxAttempts,
        defaultRetryDelayMs: options.messageRetryDelayMs
    });
    const senderKeyManager = new SenderKeyManager(sessionStore.senderKey, {
        getFutureMessagesMax: () => abPropsCoordinator.getConfigValue('web_signal_future_messages_max'),
        skipSignatureVerification: options.dangerous?.disableSenderKeySignatureVerification
    });
    const signalProtocol = new SignalProtocol({
        signal: sessionStore.signal,
        preKey: sessionStore.preKey,
        session: sessionStore.session,
        identity: sessionStore.identity
    }, logger);
    const signalSystemQuery = (node, timeoutMs) => runtime.query(node, timeoutMs, { useSystemId: true });
    const signalDigestSync = new SignalDigestSyncApi({
        logger,
        query: signalSystemQuery,
        signalStore: sessionStore.signal,
        preKeyStore: sessionStore.preKey,
        defaultTimeoutMs: options.signalFetchKeyBundlesTimeoutMs
    });
    const generateUsyncSid = createUsyncSidGenerator();
    const signalDeviceSync = new SignalDeviceSyncApi({
        logger,
        query: runtime.query,
        deviceListStore: sessionStore.deviceList,
        defaultTimeoutMs: options.signalFetchKeyBundlesTimeoutMs,
        generateSid: generateUsyncSid
    });
    const signalIdentitySync = new SignalIdentitySyncApi({
        logger,
        query: signalSystemQuery,
        identityStore: sessionStore.identity,
        defaultTimeoutMs: options.signalFetchKeyBundlesTimeoutMs
    });
    const signalMissingPreKeysSync = new SignalMissingPreKeysSyncApi({
        logger,
        query: signalSystemQuery,
        defaultTimeoutMs: options.signalFetchKeyBundlesTimeoutMs
    });
    const signalRotateKey = new SignalRotateKeyApi({
        logger,
        query: signalSystemQuery,
        signalStore: sessionStore.signal,
        defaultTimeoutMs: options.signalFetchKeyBundlesTimeoutMs
    });
    const signalSessionSync = new SignalSessionSyncApi({
        logger,
        query: signalSystemQuery,
        defaultTimeoutMs: options.signalFetchKeyBundlesTimeoutMs
    });
    const authClient = new WaAuthClient({
        deviceBrowser: options.deviceBrowser,
        deviceOsDisplayName: options.deviceOsDisplayName,
        deviceOsVersion: options.deviceOsVersion,
        devicePlatform: options.devicePlatform,
        requireFullSync: options.requireFullSync,
        version: options.version,
        dangerous: options.dangerous,
        mobileTransport: options.mobileTransport
    }, {
        logger,
        authStore: sessionStore.auth,
        signalStore: sessionStore.signal,
        preKeyStore: sessionStore.preKey,
        socket: {
            sendNode: runtime.sendNode,
            query: runtime.query
        },
        isConnected: () => connectionManager?.isConnected() ?? false,
        callbacks: {
            onQr: (qr, ttlMs) => runtime.emitEvent('auth_qr', { qr, ttlMs }),
            onPairingCode: (code) => runtime.emitEvent('auth_pairing_code', { code }),
            onPairingRefresh: (forceManual) => runtime.emitEvent('auth_pairing_required', { forceManual }),
            onPaired: (credentials) => {
                runtime.emitEvent('auth_paired', { credentials });
                scheduleReconnectAfterPairing();
            },
            onError: (error) => runtime.handleError(error),
            onPasskeyRequired: (hasSigner) => runtime.emitEvent('auth_passkey_required', { hasSigner }),
            signPasskeyAssertion: options.signPasskeyAssertion
        }
    });
    const getCurrentCredentials = authClient.getCurrentCredentials.bind(authClient);
    const isMobilePrimary = () => options.mobileTransport !== undefined || Boolean(getCurrentCredentials()?.deviceInfo);
    const groupCoordinator = createGroupCoordinator({
        queryWithContext: runtime.queryWithContext,
        mexSocket: { query: runtime.query }
    });
    const newsletterCoordinator = createNewsletterCoordinator({
        mexSocket: { query: runtime.query },
        sendNode: runtime.sendNode,
        publishMessageNode: (node, opts) => messageDispatch.publishMessageNode(node, opts),
        queryWithContext: runtime.queryWithContext,
        generateStanzaId: () => messageDispatch.generateOutgoingMessageId(),
        mediaTransfer,
        getMediaConn: () => getClientMediaConn(mediaMessageBuildOptions),
        linkPreviewResolver: createLinkPreviewResolver('newsletter'),
        getAbPropString: (name) => abPropsCoordinator.getConfigValue(name),
        logger
    });
    const privacyCoordinator = createPrivacyCoordinator({
        logger,
        contactStore: sessionStore.contacts,
        isUsernamePrivacyListIdentifierEnabled: () => abPropsCoordinator.getConfigValue('username_contact_privacy_setting_allow_uncontact_set_enable'),
        queryWithContext: runtime.queryWithContext,
        resolveUserJidPair: (userJid) => signalDeviceSync.resolveUserJidPair(userJid),
        getSelfLid: () => getCurrentCredentials()?.meLid ?? null,
        emitPrivacy: (event) => runtime.emitEvent('privacy', event)
    });
    const businessCoordinator = createBusinessCoordinator({
        queryWithContext: runtime.queryWithContext,
        mediaTransfer,
        getMediaConn: () => getClientMediaConn(mediaMessageBuildOptions),
        logger,
        generateSid: generateUsyncSid
    });
    const emailCoordinator = createEmailCoordinator({
        queryWithContext: runtime.queryWithContext
    });
    const retryTracker = createOutboundRetryTracker({
        retryStore: sessionStore.retry,
        logger
    });
    const sessionResolver = createSignalSessionResolver({
        signalProtocol,
        sessionStore: sessionStore.session,
        identityStore: sessionStore.identity,
        signalIdentitySync,
        signalSessionSync,
        logger
    });
    const fanoutResolver = createDeviceFanoutResolver({
        signalDeviceSync,
        getCurrentCredentials,
        logger
    });
    const groupMetadataCache = createGroupMetadataCache({
        groupMetadataStore: sessionStore.groupMetadata,
        queryGroupMetadata: async (groupJid) => {
            const metadata = await groupCoordinator.queryGroupMetadata(groupJid);
            const participantJids = new Array(metadata.participants.length);
            for (let index = 0; index < metadata.participants.length; index += 1) {
                participantJids[index] = metadata.participants[index].jid;
            }
            return {
                participants: participantJids,
                ephemeral: metadata.ephemeral,
                ephemeralTrigger: metadata.ephemeralTrigger
            };
        },
        logger
    });
    const trustedContactToken = new WaTrustedContactTokenCoordinator({
        logger,
        store: sessionStore.privacyToken,
        runtime: {
            queryWithContext: runtime.queryWithContext,
            emitEvent: runtime.emitEvent,
            getCurrentCredentials
        },
        serverClock,
        durationS: options.privacyToken?.tcTokenDurationS,
        numBuckets: options.privacyToken?.tcTokenNumBuckets,
        senderDurationS: options.privacyToken?.tcTokenSenderDurationS,
        senderNumBuckets: options.privacyToken?.tcTokenSenderNumBuckets,
        maxDurationS: options.privacyToken?.tcTokenMaxDurationS,
        getConfigOverrides: () => ({
            durationS: abPropsCoordinator.getConfigValue('tctoken_duration'),
            numBuckets: abPropsCoordinator.getConfigValue('tctoken_num_buckets'),
            senderDurationS: abPropsCoordinator.getConfigValue('tctoken_duration_sender'),
            senderNumBuckets: abPropsCoordinator.getConfigValue('tctoken_num_buckets_sender')
        })
    });
    const abPropsCoordinator = new WaAbPropsCoordinator({
        logger,
        runtime: {
            queryWithContext: runtime.queryWithContext
        }
    });
    let messageDispatch;
    const appStateSyncKeyProtocol = createAppStateSyncKeyProtocol({
        publishProtocolMessageToDevice: (deviceJid, protocolMessage, opts) => messageDispatch.publishProtocolMessageToDevice(deviceJid, protocolMessage, opts),
        fanoutResolver,
        getCurrentCredentials,
        logger
    });
    messageDispatch = new WaMessageDispatchCoordinator({
        logger,
        emitMessageSend: (event) => runtime.emitEvent('message_send', event),
        messageClient,
        retryTracker,
        sessionResolver,
        fanoutResolver,
        groupMetadataCache,
        appStateSyncKeyProtocol,
        buildMessageContent: async (content, ctx) => buildMediaMessageContent(mediaMessageBuildOptions, content, ctx),
        senderKeyManager,
        signalProtocol,
        signalStore: sessionStore.signal,
        sessionStore: sessionStore.session,
        identityStore: sessionStore.identity,
        deviceListStore: sessionStore.deviceList,
        threadStore: sessionStore.threads,
        chatMetadataStore: sessionStore.chatMetadata,
        signalDeviceSync,
        messageSecretStore: sessionStore.messageSecret,
        persistAllMessageSecrets: options.addons?.persistAllSecrets === true,
        getCurrentCredentials,
        resolvePrivacyTokenNode: (recipientJid) => trustedContactToken.resolveTokenForMessage(recipientJid),
        onDirectMessageSent: (recipientJid) => {
            trustedContactToken.maybeIssueSenderToken(recipientJid).catch((err) => logger.warn('sender token issue failed', {
                to: recipientJid,
                message: toError(err).message
            }));
        },
        sendNewsletterMessage: (newsletterJid, content, sendOptions, contextInfo) => newsletterCoordinator.send(newsletterJid, content, {
            stanzaId: sendOptions.id,
            contextInfo,
            additionalAttributes: sendOptions.additionalAttributes
        }),
        getIcdcHashLength: () => abPropsCoordinator.getConfigValue('md_icdc_hash_length'),
        mobileMessageIdFormat: isMobilePrimary,
        serverClock
    });
    const presenceCoordinator = createPresenceCoordinator({
        sendNode: (node) => nodeOrchestrator.sendNode(node, false),
        getCurrentCredentials,
        resolvePrivacyTokenNode: (jid) => trustedContactToken.resolveReceiverTokenNode(jid)
    });
    const peerDataOperation = createPeerDataOperationRequester({
        logger,
        publishProtocolMessageToDevice: (deviceJid, protocolMessage, opts) => messageDispatch.publishProtocolMessageToDevice(deviceJid, protocolMessage, opts),
        getCurrentCredentials,
        generateOutgoingMessageId: () => messageDispatch.generateOutgoingMessageId(),
        subscribeToProtocolMessage: runtime.subscribeProtocolMessage
    });
    const mediaRetryRequester = createMediaRetryRequester({
        logger,
        sendNode: (node) => nodeOrchestrator.sendNode(node, false),
        getCurrentCredentials
    });
    const messageCoordinator = new WaMessageCoordinator({
        messageDispatch,
        mediaTransfer,
        mediaRetry: mediaRetryRequester,
        mediaUploadOptions: mediaMessageBuildOptions,
        logger,
        messageStore: sessionStore.messages,
        messageSecretStore: sessionStore.messageSecret,
        trustedContactToken,
        emitAddon: (event) => runtime.emitEvent('message_addon', event),
        mexSocket: { query: runtime.query },
        peerDataOperation,
        isGroupHistorySendEnabled: () => abPropsCoordinator.getConfigValue('group_history_send'),
        getAbPropNumber: (name) => abPropsCoordinator.getConfigValue(name)
    });
    const retryCoordinator = new WaRetryCoordinator({
        logger,
        retryStore: sessionStore.retry,
        signalStore: sessionStore.signal,
        preKeyStore: sessionStore.preKey,
        sessionStore: sessionStore.session,
        senderKeyStore: sessionStore.senderKey,
        signalProtocol,
        sessionResolver,
        signalDeviceSync,
        signalMissingPreKeysSync,
        messageClient,
        sendNode: runtime.sendNode,
        getCurrentCredentials,
        resolveUserIcdc: (userJid) => messageDispatch.resolveUserIcdc(userJid),
        resolvePrivacyTokenNode: (recipientJid) => trustedContactToken.resolveTokenForMessage(recipientJid),
        // Placeholder resend asks the primary phone (a peer) for the plaintext.
        peerDataOperation,
        emitIncomingMessage: (event) => {
            void runtime
                .handleIncomingMessageEvent(event)
                .catch((err) => runtime.handleError(toError(err)));
        },
        isMobilePrimary,
        getAbPropNumber: (name) => abPropsCoordinator.getConfigValue(name)
    });
    const botCoordinator = createBotCoordinator({
        logger,
        queryWithContext: runtime.queryWithContext,
        buildMessageContent: async (content) => buildMediaMessageContent(mediaMessageBuildOptions, content),
        sendMessage: (to, content, sendOptions) => messageDispatch.sendMessage(to, content, sendOptions ?? {}),
        messageStore: sessionStore.messages,
        messageSecretStore: sessionStore.messageSecret,
        getCurrentCredentials,
        emitBotChunk: (event) => runtime.emitEvent('message_bot_chunk', event),
        generateSid: generateUsyncSid
    });
    const appStateSync = new WaAppStateSyncClient({
        logger,
        query: runtime.query,
        getCurrentMeJid: () => getCurrentCredentials()?.meJid,
        defaultTimeoutMs: options.appStateSyncTimeoutMs,
        store: sessionStore.appState,
        serverClock,
        onMissingKeys: async ({ keyIds }) => {
            await messageDispatch.requestAppStateSyncKeys(keyIds);
        },
        skipMacVerification: options.dangerous?.disableAppStateMacVerification,
        mobilePrimary: isMobilePrimary,
        isOwnAccountDevice: (deviceJid) => {
            const credentials = getCurrentCredentials();
            if (!credentials)
                return false;
            return isOwnAccountJid(deviceJid, credentials.meJid, credentials.meLid);
        },
        sendKeyShare: (toDeviceJid, keys, missingKeyIds) => messageDispatch.sendAppStateSyncKeyShare(toDeviceJid, keys, missingKeyIds),
        triggerSync: async () => {
            await runtime.syncAppState();
        }
    });
    // Persists a pushName change and re-broadcasts presence carrying it (how the
    // name reaches peers on primary connections). No-op when unchanged, which
    // also collapses the app-state echo of our own SettingPushName write.
    const applyOwnPushName = async (name) => {
        if (getCurrentCredentials()?.meDisplayName === name) {
            return;
        }
        await authClient.persistSuccessAttributes({ meDisplayName: name });
        if (connectionManager?.isConnected()) {
            await presenceCoordinator.send();
        }
    };
    const appStateMutations = new WaAppStateMutationCoordinator({
        logger,
        messageStore: sessionStore.messages,
        appStateSync,
        mediaTransfer,
        isConnected: () => connectionManager?.isConnected() ?? false,
        serverClock,
        emitSnapshotMutations: options.chatEvents?.emitSnapshotMutations === true,
        emitMutation: (event) => runtime.emitEvent('mutation', event),
        emitMutationSend: (event) => runtime.emitEvent('mutation_send', event),
        nctSaltSink: (salt) => trustedContactToken.handleNctSaltSync(salt),
        contactSink: runtime.persistContact,
        pushNameSink: (name) => {
            void applyOwnPushName(name).catch((error) => logger.debug('apply own pushName from app-state sync failed', {
                message: toError(error).message
            }));
        }
    });
    const profileCoordinator = createProfileCoordinator({
        queryWithContext: runtime.queryWithContext,
        generateSid: generateUsyncSid,
        mexSocket: { query: runtime.query },
        queryLidsByPhoneJids: (phoneJids) => signalDeviceSync.queryLidsByPhoneJids(phoneJids),
        mutations: appStateMutations,
        applyOwnPushName,
        resolvePrivacyTokenNode: (jid) => trustedContactToken.resolveReceiverTokenNode(jid),
        logger
    });
    const statusCoordinator = createStatusCoordinator({
        appStateMutations,
        buildMessageContent: async (content) => buildMediaMessageContent(mediaMessageBuildOptions, content),
        publishStatusMessage: (input) => messageDispatch.publishStatusMessage(input)
    });
    const broadcastListCoordinator = createBroadcastListCoordinator({
        appStateMutations,
        buildMessageContent: async (content) => buildMediaMessageContent(mediaMessageBuildOptions, content),
        publishBroadcastListMessage: (input) => messageDispatch.publishBroadcastListMessage(input)
    });
    connectionManager = new WaConnectionManager({
        logger,
        options,
        authClient,
        keepAlive,
        nodeOrchestrator,
        nodeTransport,
        getPassiveTasks: () => passiveTasks,
        clearStoredCredentials: runtime.clearStoredState,
        onPostPairReconnected: () => {
            runtime.emitEvent('connection', {
                status: 'open',
                reason: 'connected',
                code: null,
                isLogout: false,
                isNewLogin: true
            });
        }
    });
    if (mediaConnCacheFallback !== null) {
        connectionManager.setMediaConnCache(mediaConnCacheFallback);
    }
    scheduleReconnectAfterPairing = () => connectionManager?.scheduleReconnectAfterPairing();
    const disconnectWithClientSideEffects = async (reason, isLogout, code) => {
        abPropsCoordinator.reset();
        offlineResume.reset();
        privacyCoordinator.stopAccountSyncRefresh();
        await connectionManager?.disconnect();
        runtime.emitEvent('connection', {
            status: 'close',
            reason,
            code,
            isLogout,
            isNewLogin: false
        });
    };
    const connectWithClientSideEffects = async (reason) => {
        runtime.resumeIncomingEvents();
        await connectionManager?.connect(runtime.handleIncomingFrame);
        if (!authClient.getCurrentCredentials()?.meJid) {
            return;
        }
        runtime.emitEvent('connection', {
            status: 'open',
            reason,
            code: null,
            isLogout: false,
            isNewLogin: false
        });
    };
    const clearStoredCredentialsWithClientSideEffects = async () => {
        await connectionManager?.clearStoredCredentials();
    };
    const streamControl = createStreamControlHandler({
        logger,
        getComms: () => connectionManager?.getComms() ?? null,
        clearPendingQueries: (error) => nodeOrchestrator.clearPending(error),
        clearMediaConnCache: () => {
            mediaConnCacheFallback = null;
            connectionManager?.setMediaConnCache(null);
        },
        disconnect: disconnectWithClientSideEffects,
        clearStoredCredentials: clearStoredCredentialsWithClientSideEffects,
        connect: connectWithClientSideEffects
    });
    const incomingMessageAckOptions = {
        logger,
        sendNode: runtime.sendNode,
        getMeJid: () => getCurrentCredentials()?.meJid,
        getMeLid: () => getCurrentCredentials()?.meLid,
        signalProtocol,
        senderKeyManager,
        onDecryptFailure: (context, error) => retryCoordinator.onDecryptFailure(context, error),
        requestPlaceholderResend: (context) => retryCoordinator.onUnavailableMessage(context),
        emitIncomingMessage: (event) => {
            void runtime
                .handleIncomingMessageEvent(event)
                .catch((err) => runtime.handleError(toError(err)));
        },
        emitNewsletterMessageUpdate: (event) => runtime.emitEvent('newsletter_message_update', event),
        emitUnavailableMessage: (event) => runtime.emitEvent('message_unavailable', event),
        emitUnhandledStanza: (event) => runtime.emitEvent('debug_unhandled_stanza', event),
        emitDecryptedPayload: (build) => {
            // Built only if someone is subscribed: the payload carries a copy of
            // the plaintext and a redacted node, and this runs per `<enc>`.
            if (!runtime.hasEventListener('debug_decrypted_payload')) {
                return;
            }
            runtime.emitEvent('debug_decrypted_payload', build());
        }
    };
    const handleClientDirtyBits = (dirtyBits) => handleDirtyBits({
        logger,
        queryWithContext: runtime.queryWithContext,
        getCurrentCredentials,
        syncAppState: runtime.syncAppState,
        generateUsyncSid,
        syncAccountPrivacy: async () => {
            await privacyCoordinator.refreshFromAccountSync();
        },
        emitBlocklist: (blocklist) => runtime.emitEvent('blocklist', blocklist),
        newsletterListSubscribed: () => newsletterCoordinator.listSubscribed()
    }, dirtyBits);
    const offlineResume = new WaOfflineResumeCoordinator({
        logger,
        runtime: {
            sendNode: (node) => nodeOrchestrator.sendNode(node, false),
            emitOfflineResume: (event) => runtime.emitEvent('offline_resume', event)
        }
    });
    const incomingNode = new WaIncomingNodeCoordinator({
        logger,
        offlineResume,
        runtime: createIncomingNodeRuntime({
            logger,
            emitEvent: runtime.emitEvent,
            authClient,
            connectionManager,
            nodeOrchestrator,
            streamControl,
            mediaMessageBuildOptions,
            retryCoordinator,
            mediaRetryRequester,
            messageDispatch,
            sendNode: runtime.sendNode,
            syncAppState: runtime.syncAppState,
            disconnect: disconnectWithClientSideEffects,
            clearStoredCredentials: clearStoredCredentialsWithClientSideEffects,
            getCurrentCredentials,
            handleClientDirtyBits,
            incomingMessageAckOptions
        })
    });
    incomingNode.registerIncomingHandler({
        tag: WA_NODE_TAGS.NOTIFICATION,
        subtype: WA_NOTIFICATION_TYPES.NEWSLETTER,
        prepend: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        handler: async (node) => {
            const newsletterJid = node.attrs.from;
            if (!newsletterJid || !isNewsletterJid(newsletterJid)) {
                return false;
            }
            const firstChild = getFirstNodeChild(node);
            const childTag = firstChild?.tag;
            const action = childTag === WA_NEWSLETTER_NOTIFICATION_TAGS.LIVE_UPDATES
                ? 'live_updates'
                : 'unknown';
            runtime.emitEvent('newsletter', {
                rawNode: node,
                stanzaId: node.attrs.id,
                chatJid: newsletterJid,
                stanzaType: node.attrs.type,
                offline: node.attrs.offline !== undefined,
                newsletterJid,
                action,
                subType: childTag
            });
            if (action === 'live_updates') {
                processNewsletterLiveUpdates(node, {
                    logger,
                    emitIncomingMessage: incomingMessageAckOptions.emitIncomingMessage,
                    emitNewsletterMessageUpdate: incomingMessageAckOptions.emitNewsletterMessageUpdate,
                    emitUnhandledStanza: incomingMessageAckOptions.emitUnhandledStanza
                });
            }
            return false;
        }
    });
    incomingNode.registerIncomingHandler({
        tag: WA_NODE_TAGS.NOTIFICATION,
        subtype: WA_NOTIFICATION_TYPES.ENCRYPT,
        prepend: true,
        handler: async (node) => {
            const firstChild = getFirstNodeChild(node);
            if (!firstChild) {
                return false;
            }
            const childTag = firstChild.tag;
            // <count value="N"/> – server prekeys running low
            if (childTag === 'count') {
                const ackNode = buildAckNode({
                    kind: 'notification',
                    node,
                    includeType: false
                });
                await runtime.sendNode(ackNode);
                const tasks = passiveTasks;
                if (!tasks) {
                    logger.warn('encrypt-count: passive tasks not available');
                    return true;
                }
                await tasks.handlePreKeyLowNotification().catch((error) => {
                    logger.warn('encrypt-count: prekey upload failed', {
                        message: toError(error).message
                    });
                });
                return true;
            }
            // <digest/> – digest key sync
            if (childTag === 'digest') {
                const ackNode = buildAckNode({
                    kind: 'notification',
                    node,
                    includeType: false
                });
                await runtime.sendNode(ackNode);
                const tasks = passiveTasks;
                if (!tasks) {
                    logger.warn('encrypt-digest: passive tasks not available');
                    return true;
                }
                await tasks.handleDigestNotification().catch((error) => {
                    logger.warn('encrypt-digest: digest sync failed', {
                        message: toError(error).message
                    });
                });
                return true;
            }
            // <identity/> – contact identity key changed
            if (childTag === 'identity') {
                const parsed = parseIdentityChangeNotification(node);
                if (!parsed) {
                    return false;
                }
                const ackNode = buildAckNode({
                    kind: 'notification',
                    node,
                    includeType: false
                });
                await runtime.sendNode(ackNode);
                const address = parseSignalAddressFromJid(parsed.fromJid);
                if (address.device !== 0) {
                    logger.debug('identity-change: ignoring companion device', {
                        jid: parsed.fromJid
                    });
                    return true;
                }
                const meJid = getCurrentCredentials()?.meJid;
                if (meJid) {
                    const meUser = toUserJid(meJid);
                    const fromUser = toUserJid(parsed.fromJid);
                    if (meUser === fromUser) {
                        logger.error('self primary identity changed, disconnecting');
                        void connectionManager?.getComms()?.stopComms();
                        await disconnectWithClientSideEffects(WA_DISCONNECT_REASONS.PRIMARY_IDENTITY_KEY_CHANGE, true, null);
                        await clearStoredCredentialsWithClientSideEffects();
                        return true;
                    }
                }
                const oldIdentity = await sessionStore.identity.getRemoteIdentity(address);
                if (oldIdentity) {
                    logger.info('identity-change: clearing session', {
                        jid: parsed.fromJid
                    });
                    await sessionStore.session.deleteSession(address);
                    const userJid = toUserJid(parsed.fromJid);
                    await trustedContactToken.reissueOnIdentityChange(userJid).catch((error) => {
                        logger.warn('identity-change: reissue tc token failed', {
                            message: toError(error).message
                        });
                    });
                }
                runtime.emitEvent('debug_notification', {
                    rawNode: node,
                    stanzaId: parsed.stanzaId,
                    chatJid: parsed.fromJid,
                    stanzaType: WA_NOTIFICATION_TYPES.ENCRYPT,
                    offline: node.attrs.offline !== undefined,
                    notificationType: WA_NOTIFICATION_TYPES.ENCRYPT,
                    classification: 'core',
                    details: {
                        kind: 'identity_change',
                        displayName: parsed.displayName,
                        lid: parsed.lid,
                        hadPreviousIdentity: !!oldIdentity
                    }
                });
                return true;
            }
            return false;
        }
    });
    incomingNode.registerIncomingHandler({
        tag: WA_NODE_TAGS.NOTIFICATION,
        subtype: WA_NOTIFICATION_TYPES.ACCOUNT_SYNC,
        prepend: true,
        /**
         * The stanza carries the changed `<category>` inline, but it is a
         * trigger only: the payload is a partial view, so the whole set is
         * refetched instead. Observer only - returning false keeps the
         * generic notification handler responsible for the ack and the
         * `debug_notification` emit, leaving wire behavior unchanged.
         */
        // eslint-disable-next-line @typescript-eslint/require-await
        handler: async (node) => {
            if (findNodeChild(node, WA_NODE_TAGS.PRIVACY)) {
                privacyCoordinator.scheduleAccountSyncRefresh();
            }
            const usernameEvent = parseOwnUsernameNotification(node);
            if (usernameEvent) {
                runtime.emitEvent('own_username', usernameEvent);
            }
            return false;
        }
    });
    incomingNode.registerIncomingHandler({
        tag: WA_NODE_TAGS.NOTIFICATION,
        subtype: WA_NOTIFICATION_TYPES.DEVICES,
        prepend: true,
        handler: async (node) => {
            const parsed = parseDeviceNotification(node);
            if (!parsed) {
                return false;
            }
            const ackNode = buildAckNode({
                kind: 'notification',
                node,
                includeType: false
            });
            await runtime.sendNode(ackNode);
            const userJid = toUserJid(parsed.fromJid);
            if (parsed.action === DEVICE_NOTIFICATION_ACTIONS.REMOVE) {
                const baseAddress = parseSignalAddressFromJid(parsed.fromJid);
                for (const device of parsed.devices) {
                    const address = {
                        user: baseAddress.user,
                        server: baseAddress.server,
                        device: device.deviceId
                    };
                    await sessionStore.session.deleteSession(address).catch((error) => {
                        logger.warn('devices-notification: delete session failed', {
                            message: toError(error).message
                        });
                    });
                }
            }
            if (sessionStore.deviceList) {
                await sessionStore.deviceList.deleteUserDevices(userJid).catch((error) => {
                    logger.warn('devices-notification: invalidate cache failed', {
                        message: toError(error).message
                    });
                });
            }
            if (parsed.action === DEVICE_NOTIFICATION_ACTIONS.UPDATE) {
                signalDeviceSync.syncDeviceList([userJid]).catch((error) => {
                    logger.warn('devices-notification: sync device list failed', {
                        message: toError(error).message
                    });
                });
            }
            runtime.emitEvent('debug_notification', {
                rawNode: node,
                stanzaId: parsed.stanzaId,
                chatJid: parsed.fromJid,
                stanzaType: WA_NOTIFICATION_TYPES.DEVICES,
                offline: node.attrs.offline !== undefined,
                notificationType: WA_NOTIFICATION_TYPES.DEVICES,
                classification: 'core',
                details: {
                    kind: 'device_list_change',
                    action: parsed.action,
                    devices: parsed.devices
                }
            });
            return true;
        }
    });
    incomingNode.registerIncomingHandler({
        tag: WA_NODE_TAGS.NOTIFICATION,
        subtype: WA_PRIVACY_TOKEN_NOTIFICATION_TYPE,
        prepend: true,
        handler: async (node) => {
            const fromJid = node.attrs.from ?? node.attrs.sender_lid;
            if (!fromJid) {
                return false;
            }
            const tokens = parsePrivacyTokenNotification(node);
            if (tokens.length === 0) {
                return false;
            }
            await trustedContactToken.handleIncomingToken(fromJid, tokens);
            const ackNode = buildAckNode({
                kind: 'notification',
                node,
                typeOverride: WA_PRIVACY_TOKEN_NOTIFICATION_TYPE
            });
            await runtime.sendNode(ackNode);
            return true;
        }
    });
    incomingNode.registerIncomingHandler({
        tag: WA_NODE_TAGS.NOTIFICATION,
        subtype: WA_NOTIFICATION_TYPES.SERVER,
        prepend: true,
        handler: async (node) => {
            const firstChild = getFirstNodeChild(node);
            if (!firstChild || firstChild.tag !== WA_NODE_TAGS.ABPROPS) {
                return false;
            }
            const ackNode = buildAckNode({
                kind: 'notification',
                node,
                includeType: false
            });
            await runtime.sendNode(ackNode);
            abPropsCoordinator.sync();
            return true;
        }
    });
    passiveTasks = new WaPassiveTasksCoordinator({
        logger,
        signalStore: sessionStore.signal,
        preKeyStore: sessionStore.preKey,
        signalDigestSync,
        signalRotateKey,
        runtime: createPassiveTasksRuntime({
            queryWithContext: runtime.queryWithContext,
            authClient,
            nodeOrchestrator,
            receiptQueue,
            getCurrentCredentials,
            abPropsCoordinator,
            markOnlineOnConnect: options.markOnlineOnConnect ?? false
        }),
        mobilePrimary: isMobilePrimary,
        appStateSync
    });
    const lowLevelCoordinator = createLowLevelCoordinator({
        logger,
        nodeOrchestrator,
        incomingNode,
        receiptQueue,
        isConnected: () => connectionManager?.isConnected() ?? false,
        defaultIqTimeoutMs: options.iqTimeoutMs
    });
    const mobileCoordinator = new WaMobileCoordinator({
        logger,
        authClient,
        messageDispatch,
        chatCoordinator: appStateMutations,
        deviceSync: signalDeviceSync,
        appStateStore: sessionStore.appState,
        queryWithContext: runtime.queryWithContext,
        emitEvent: runtime.emitEvent,
        registerIncomingHandler: (registration) => incomingNode.registerIncomingHandler(registration),
        isMobilePrimary,
        persistence: options.companionHost?.persistence,
        includePem: options.companionHost?.includePem
    });
    return {
        nodeTransport,
        nodeOrchestrator,
        keepAlive,
        mediaTransfer,
        mediaMessageBuildOptions,
        messageClient,
        senderKeyManager,
        signalProtocol,
        signalDigestSync,
        signalDeviceSync,
        signalIdentitySync,
        signalMissingPreKeysSync,
        signalRotateKey,
        signalSessionSync,
        sessionResolver,
        authClient,
        messageDispatch,
        messageCoordinator,
        presenceCoordinator,
        retryCoordinator,
        appStateSync,
        chatCoordinator: appStateMutations,
        streamControl,
        incomingNode,
        lowLevelCoordinator,
        passiveTasks,
        groupCoordinator,
        statusCoordinator,
        broadcastListCoordinator,
        newsletterCoordinator,
        privacyCoordinator,
        profileCoordinator,
        businessCoordinator,
        botCoordinator,
        emailCoordinator,
        receiptQueue,
        connectionManager,
        trustedContactToken,
        abPropsCoordinator,
        peerDataOperation,
        mobileCoordinator,
        isMobilePrimary
    };
}
