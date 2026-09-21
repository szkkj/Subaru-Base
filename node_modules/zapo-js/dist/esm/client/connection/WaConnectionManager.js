import { WaComms } from '../../transport/WaComms.js';
import { toError } from '../../util/primitives.js';
export class WaConnectionManager {
    constructor(options) {
        this.logger = options.logger;
        this.options = options.options;
        this.authClient = options.authClient;
        this.keepAlive = options.keepAlive;
        this.nodeOrchestrator = options.nodeOrchestrator;
        this.nodeTransport = options.nodeTransport;
        this.getPassiveTasks = options.getPassiveTasks;
        this.clearStoredCredentialsCallback = options.clearStoredCredentials;
        this.onPostPairReconnected = options.onPostPairReconnected;
        this.comms = null;
        this.clockSkewMs = null;
        this.mediaConnCache = null;
        this.connectPromise = null;
        this.pairingReconnectPromise = null;
        this.pairingReconnectTimeout = null;
        this.frameHandler = null;
        this.pendingComms = null;
        this.lifecycleGeneration = 0;
        this.lifecycleQueue = Promise.resolve();
    }
    async connect(frameHandler) {
        if (this.connectPromise) {
            this.logger.trace('wa client connect already in-flight');
            return this.connectPromise;
        }
        this.frameHandler = frameHandler;
        const lifecycleGeneration = this.nextLifecycleGeneration();
        const operation = this.runLifecycleOperation(async () => {
            await this.connectInternal(frameHandler, lifecycleGeneration);
        });
        const promise = operation.finally(() => {
            if (this.connectPromise === promise) {
                this.connectPromise = null;
            }
        });
        this.connectPromise = promise;
        return this.connectPromise;
    }
    scheduleReconnectAfterPairing() {
        this.logger.debug('wa client scheduling reconnect after pairing');
        if (this.pairingReconnectTimeout) {
            clearTimeout(this.pairingReconnectTimeout);
        }
        this.pairingReconnectTimeout = setTimeout(() => {
            this.pairingReconnectTimeout = null;
            void this.reconnectAsRegisteredAfterPairing().catch((error) => {
                if (this.isLifecycleSupersededError(error)) {
                    this.logger.trace('pairing reconnect canceled by newer lifecycle');
                    return;
                }
                this.logger.warn('failed to reconnect after pairing', {
                    meJid: this.authClient.getCurrentCredentials()?.meJid,
                    message: toError(error).message
                });
            });
        }, 0);
    }
    async disconnect() {
        const lifecycleGeneration = this.nextLifecycleGeneration();
        this.invalidatePendingComms('failed to stop pending comms during disconnect');
        await this.runLifecycleOperation(async () => {
            await this.disconnectInternal(lifecycleGeneration);
        });
    }
    async clearStoredCredentials() {
        await this.clearStoredCredentialsCallback();
    }
    isConnected() {
        return !!(this.comms && this.comms.getCommsState().connected);
    }
    getComms() {
        return this.comms;
    }
    getClockSkewMs() {
        return this.clockSkewMs;
    }
    getMediaConnCache() {
        return this.mediaConnCache;
    }
    setMediaConnCache(value) {
        this.mediaConnCache = value;
    }
    updateClockSkewFromSuccess(serverUnixSeconds) {
        const serverMs = serverUnixSeconds * 1000;
        const nowMs = Date.now();
        this.clockSkewMs = serverMs - nowMs;
        this.logger.debug('updated clock skew from success', {
            serverUnixSeconds,
            clockSkewMs: this.clockSkewMs
        });
    }
    setClockSkewMs(clockSkewMs, source) {
        if (!Number.isFinite(clockSkewMs)) {
            return;
        }
        const previous = this.clockSkewMs;
        this.clockSkewMs = clockSkewMs;
        if (previous === null || Math.abs(previous - clockSkewMs) >= 1000) {
            this.logger.debug('clock skew updated', { source, clockSkewMs, previous });
        }
    }
    async connectInternal(frameHandler, lifecycleGeneration) {
        this.assertLifecycleCurrent(lifecycleGeneration, 'connect');
        if (this.comms || this.pendingComms) {
            this.logger.trace('wa client connect skipped: comms already created');
            return;
        }
        this.logger.debug('wa client connect start');
        let credentials = await this.authClient.loadOrCreateCredentials();
        this.assertLifecycleCurrent(lifecycleGeneration, 'connect');
        try {
            await this.startCommsWithCredentials(credentials, frameHandler, lifecycleGeneration);
        }
        catch (error) {
            if (this.isLifecycleSupersededError(error)) {
                throw error;
            }
            if (credentials.routingInfo) {
                this.logger.warn('connect failed with routing info, retrying without routing info', {
                    message: toError(error).message
                });
                await this.disconnectInternal(lifecycleGeneration);
                this.assertLifecycleCurrent(lifecycleGeneration, 'connect');
                credentials = await this.authClient.clearRoutingInfo();
                this.assertLifecycleCurrent(lifecycleGeneration, 'connect');
                await this.startCommsWithCredentials(credentials, frameHandler, lifecycleGeneration);
            }
            else {
                await this.disconnectInternal(lifecycleGeneration);
                throw error;
            }
        }
        this.assertLifecycleCurrent(lifecycleGeneration, 'connect');
        this.logger.info('wa client connected');
    }
    async reconnectAsRegisteredAfterPairing() {
        if (this.pairingReconnectPromise) {
            this.logger.trace('pairing reconnect already in-flight');
            return this.pairingReconnectPromise;
        }
        const operation = this.runLifecycleOperation(async () => {
            await this.reconnectAsRegisteredAfterPairingInternal();
        });
        const promise = operation.finally(() => {
            if (this.pairingReconnectPromise === promise) {
                this.pairingReconnectPromise = null;
            }
        });
        this.pairingReconnectPromise = promise;
        return this.pairingReconnectPromise;
    }
    async reconnectAsRegisteredAfterPairingInternal() {
        const frameHandler = this.frameHandler;
        if (!frameHandler) {
            throw new Error('pairing reconnect requires an active frame handler');
        }
        const credentials = this.authClient.getCurrentCredentials();
        if (!credentials?.meJid) {
            this.logger.trace('pairing reconnect skipped: still unregistered');
            return;
        }
        const currentComms = this.comms;
        if (!currentComms) {
            this.logger.trace('pairing reconnect skipped: no active comms');
            return;
        }
        const lifecycleGeneration = this.nextLifecycleGeneration();
        this.assertLifecycleCurrent(lifecycleGeneration, 'pairing reconnect');
        this.logger.info('pairing completed, restarting comms as registered');
        this.keepAlive.stop();
        this.nodeOrchestrator.clearPending(new Error('restarting comms after pairing'));
        this.clearCommsBinding(currentComms);
        await this.stopCommsQuietly(currentComms, 'failed to stop pre-registration comms');
        this.assertLifecycleCurrent(lifecycleGeneration, 'pairing reconnect');
        await this.startCommsWithCredentials(credentials, frameHandler, lifecycleGeneration);
        this.assertLifecycleCurrent(lifecycleGeneration, 'pairing reconnect');
        this.onPostPairReconnected();
    }
    async disconnectInternal(lifecycleGeneration) {
        if (!this.isLifecycleCurrent(lifecycleGeneration)) {
            return;
        }
        this.logger.debug('wa client disconnect start');
        if (this.pairingReconnectTimeout) {
            clearTimeout(this.pairingReconnectTimeout);
            this.pairingReconnectTimeout = null;
        }
        this.keepAlive.stop();
        this.nodeOrchestrator.clearPending(new Error('client disconnected'));
        this.clockSkewMs = null;
        this.mediaConnCache = null;
        this.frameHandler = null;
        this.getPassiveTasks()?.resetInFlightState();
        const currentComms = this.comms;
        const pendingComms = this.pendingComms;
        this.pendingComms = null;
        this.clearCommsBinding(currentComms ?? undefined);
        await this.authClient.clearTransientState();
        await Promise.all([
            pendingComms && pendingComms !== currentComms
                ? this.stopCommsQuietly(pendingComms, 'failed to stop pending comms during disconnect')
                : Promise.resolve(),
            currentComms
                ? this.stopCommsQuietly(currentComms, 'failed to stop comms during disconnect')
                : Promise.resolve()
        ]);
        if (this.isLifecycleCurrent(lifecycleGeneration)) {
            this.logger.debug('wa client disconnected');
        }
    }
    async startCommsWithCredentials(credentials, frameHandler, lifecycleGeneration) {
        this.assertLifecycleCurrent(lifecycleGeneration, 'start comms');
        this.logger.debug('starting comms with credentials', {
            registered: credentials.meJid !== null && credentials.meJid !== undefined
        });
        const commsConfig = await this.authClient.buildCommsConfig(this.options, {
            noiseTrustedRootCa: this.options.testHooks?.noiseRootCa,
            disableNoiseCertificateChainVerification: this.options.dangerous?.disableNoiseCertificateChainVerification
        });
        const comms = new WaComms(commsConfig, this.logger);
        this.pendingComms = comms;
        this.mediaConnCache = null;
        comms.startComms(async (frame) => frameHandler(frame));
        try {
            await comms.waitForConnection(commsConfig.connectTimeoutMs);
            this.assertLifecycleCurrent(lifecycleGeneration, 'start comms');
            if (this.pendingComms !== comms) {
                throw this.createLifecycleSupersededError('start comms');
            }
            this.comms = comms;
            this.pendingComms = null;
            this.nodeTransport.bindComms(comms);
            this.logger.debug('comms connected');
            comms.startHandlingRequests();
            if (credentials.meJid) {
                this.keepAlive.start();
            }
            else {
                this.keepAlive.stop();
            }
            const serverStaticKey = comms.getServerStaticKey();
            if (!serverStaticKey) {
                this.logger.trace('no server static key available to persist');
            }
            else if (!credentials.meJid) {
                this.logger.trace('skipping server static key persist while unregistered');
            }
            else {
                await this.authClient.persistServerStaticKey(serverStaticKey);
                this.assertLifecycleCurrent(lifecycleGeneration, 'start comms');
                this.logger.debug('persisted server static key after comms connect');
            }
            this.getPassiveTasks()?.startPassiveTasksAfterConnect();
        }
        catch (error) {
            if (this.pendingComms === comms) {
                this.pendingComms = null;
            }
            this.clearCommsBinding(comms);
            await this.stopCommsQuietly(comms, 'failed to cleanup comms after connection start failure');
            if (this.isLifecycleCurrent(lifecycleGeneration)) {
                throw error;
            }
            throw this.createLifecycleSupersededError('start comms');
        }
    }
    clearCommsBinding(expectedComms) {
        if (expectedComms && this.comms && this.comms !== expectedComms) {
            return;
        }
        this.comms = null;
        this.nodeTransport.bindComms(null);
    }
    async stopCommsQuietly(comms, warningMessage) {
        try {
            await comms.stopComms();
        }
        catch (error) {
            this.logger.warn(warningMessage, {
                message: toError(error).message
            });
        }
    }
    nextLifecycleGeneration() {
        this.lifecycleGeneration += 1;
        return this.lifecycleGeneration;
    }
    runLifecycleOperation(operation) {
        const run = this.lifecycleQueue.then(operation, operation);
        this.lifecycleQueue = run.then(() => undefined, () => undefined);
        return run;
    }
    invalidatePendingComms(warningMessage) {
        const pendingComms = this.pendingComms;
        if (!pendingComms) {
            return;
        }
        this.pendingComms = null;
        void this.stopCommsQuietly(pendingComms, warningMessage);
    }
    isLifecycleCurrent(lifecycleGeneration) {
        return this.lifecycleGeneration === lifecycleGeneration;
    }
    assertLifecycleCurrent(lifecycleGeneration, context) {
        if (this.isLifecycleCurrent(lifecycleGeneration)) {
            return;
        }
        throw this.createLifecycleSupersededError(context);
    }
    createLifecycleSupersededError(context) {
        return new Error(`${context} superseded by newer lifecycle`);
    }
    isLifecycleSupersededError(error) {
        return toError(error).message.includes('superseded by newer lifecycle');
    }
}
