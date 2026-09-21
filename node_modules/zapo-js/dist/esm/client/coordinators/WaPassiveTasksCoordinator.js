import { WA_DEFAULTS, WA_IQ_TYPES } from '../../protocol/constants.js';
import { SIGNAL_SIGNED_PREKEY_ROTATION_INTERVAL_MS, SIGNAL_SIGNED_PREKEY_SERVER_ERROR_BACKOFF_MS, SIGNAL_UPLOAD_PREKEYS_COUNT } from '../../signal/api/constants.js';
import { buildPreKeyUploadIq, parsePreKeyUploadFailure } from '../../signal/api/prekeys.js';
import { generatePreKeyPair } from '../../signal/registration/keygen.js';
import { buildPassiveModeIqNode } from '../../transport/node/builders/passive.js';
import { toError } from '../../util/primitives.js';
export class WaPassiveTasksCoordinator {
    constructor(options) {
        this.logger = options.logger;
        this.signalStore = options.signalStore;
        this.preKeyStore = options.preKeyStore;
        this.signalDigestSync = options.signalDigestSync;
        this.signalRotateKey = options.signalRotateKey;
        this.signedPreKeyRotationIntervalMs =
            options.signedPreKeyRotationIntervalMs ?? SIGNAL_SIGNED_PREKEY_ROTATION_INTERVAL_MS;
        this.signedPreKeyServerErrorBackoffMs =
            options.signedPreKeyServerErrorBackoffMs ?? SIGNAL_SIGNED_PREKEY_SERVER_ERROR_BACKOFF_MS;
        this.runtime = options.runtime;
        this.mobilePrimary = options.mobilePrimary ?? (() => false);
        this.appStateSync = options.appStateSync;
        this.passiveTasksPromise = null;
    }
    startPassiveTasksAfterConnect() {
        if (this.passiveTasksPromise) {
            this.logger.trace('passive connect tasks already running');
            return;
        }
        this.passiveTasksPromise = this.runPassiveTasksAfterConnect()
            .catch((error) => {
            this.logger.warn('passive connect tasks failed', {
                message: toError(error).message
            });
        })
            .finally(() => {
            this.passiveTasksPromise = null;
        });
    }
    async handlePreKeyLowNotification() {
        await Promise.all([
            this.preKeyStore.setServerHasPreKeys(false),
            this.runtime.persistServerHasPreKeys(false)
        ]);
        await this.uploadPreKeysIfMissing(false);
    }
    async handleDigestNotification() {
        await this.validateDigestAndRecoverPreKeys();
    }
    resetInFlightState() {
        if (!this.passiveTasksPromise) {
            return;
        }
        this.logger.trace('passive connect tasks reset requested while run is still in-flight');
    }
    async runPassiveTasksAfterConnect() {
        const credentials = this.runtime.getCurrentCredentials();
        const isRegistered = !!credentials?.meJid;
        if (!isRegistered) {
            this.logger.trace('passive connect tasks skipped: session is not registered');
            return;
        }
        this.runtime.syncAbProps();
        if (this.mobilePrimary() && this.appStateSync) {
            await this.appStateSync.ensureInitialSyncKey().catch((error) => {
                this.logger.warn('app-state initial key generation failed', {
                    message: toError(error).message
                });
            });
        }
        await this.runtime.sendInitialPresence().catch((error) => {
            this.logger.warn('initial presence send failed', {
                message: toError(error).message
            });
        });
        const [registrationInfo, signedPreKey, serverHasPreKeys, signedPreKeyRotationTs] = await Promise.all([
            this.signalStore.getRegistrationInfo(),
            this.signalStore.getSignedPreKey(),
            this.preKeyStore.getServerHasPreKeys(),
            this.signalStore.getSignedPreKeyRotationTs()
        ]);
        const prefetchedLocalKeyBundle = registrationInfo && signedPreKey ? { registrationInfo, signedPreKey } : null;
        await this.uploadPreKeysIfMissing(serverHasPreKeys, prefetchedLocalKeyBundle);
        await this.validateDigestAndRecoverPreKeys(prefetchedLocalKeyBundle);
        await this.rotateSignedPreKeyIfDue(signedPreKeyRotationTs);
        await this.flushDanglingReceipts();
        await this.sendActiveModeIq();
    }
    async sendActiveModeIq() {
        try {
            await this.runtime.queryWithContext('passive.active', buildPassiveModeIqNode('active'), WA_DEFAULTS.IQ_TIMEOUT_MS);
        }
        catch (error) {
            this.logger.warn('passive active iq failed', {
                message: toError(error).message
            });
        }
    }
    async validateDigestAndRecoverPreKeys(prefetchedLocalKeyBundle) {
        try {
            const validation = prefetchedLocalKeyBundle
                ? await this.signalDigestSync.validateLocalKeyBundle(prefetchedLocalKeyBundle)
                : await this.signalDigestSync.validateLocalKeyBundle();
            if (validation.valid) {
                this.logger.debug('signal digest validated', {
                    preKeyCount: validation.preKeyCount
                });
                return;
            }
            this.logger.warn('signal digest validation failed', {
                reason: validation.reason,
                shouldReupload: validation.shouldReupload,
                preKeyCount: validation.preKeyCount
            });
            if (!validation.shouldReupload) {
                return;
            }
            await Promise.all([
                this.preKeyStore.setServerHasPreKeys(false),
                this.runtime.persistServerHasPreKeys(false)
            ]);
            await this.uploadPreKeysIfMissing(false, prefetchedLocalKeyBundle);
        }
        catch (error) {
            this.logger.warn('signal digest validation failed with exception', {
                message: toError(error).message
            });
        }
    }
    async uploadPreKeysIfMissing(serverHasPreKeysHint, prefetchedLocalKeyBundle) {
        const serverHasPreKeys = serverHasPreKeysHint ?? (await this.preKeyStore.getServerHasPreKeys());
        if (serverHasPreKeys) {
            this.logger.trace('prekey upload skipped: server already has prekeys');
            return;
        }
        const resolvedLocalKeyBundle = prefetchedLocalKeyBundle ?? (await this.resolveLocalKeyBundleFromStore());
        if (!resolvedLocalKeyBundle) {
            this.logger.warn('prekey upload skipped: registration info is missing');
            return;
        }
        const { registrationInfo, signedPreKey } = resolvedLocalKeyBundle;
        const preKeys = await this.preKeyStore.getOrGenPreKeys(SIGNAL_UPLOAD_PREKEYS_COUNT, generatePreKeyPair);
        if (preKeys.length === 0) {
            throw new Error('no prekey available for upload');
        }
        const lastPreKeyId = preKeys[preKeys.length - 1].keyId;
        const uploadNode = buildPreKeyUploadIq(registrationInfo, signedPreKey, preKeys);
        const response = await this.runtime.queryWithContext('prekeys.upload', uploadNode, WA_DEFAULTS.IQ_TIMEOUT_MS, {
            count: preKeys.length,
            lastPreKeyId
        }, this.mobilePrimary() ? { useSystemId: true } : undefined);
        if (response.attrs.type === WA_IQ_TYPES.RESULT) {
            // Mark uploaded key first so the serverHasPreKeys flag never commits ahead of local key progress.
            await this.preKeyStore.markKeyAsUploaded(lastPreKeyId);
            await Promise.all([
                this.preKeyStore.setServerHasPreKeys(true),
                this.runtime.persistServerHasPreKeys(true)
            ]);
            this.logger.info('uploaded prekeys to server', {
                count: preKeys.length,
                lastPreKeyId
            });
            return;
        }
        const failure = parsePreKeyUploadFailure(response);
        this.logger.warn('upload prekeys failed', {
            count: preKeys.length,
            lastPreKeyId,
            errorCode: failure.errorCode,
            errorText: failure.errorText
        });
    }
    async rotateSignedPreKeyIfDue(signedPreKeyRotationTsHint) {
        try {
            const nowMs = Date.now();
            const lastRotationTs = signedPreKeyRotationTsHint === undefined
                ? await this.signalStore.getSignedPreKeyRotationTs()
                : signedPreKeyRotationTsHint;
            if (lastRotationTs === null) {
                await this.signalStore.setSignedPreKeyRotationTs(nowMs);
                this.logger.trace('signal rotate key skipped on first run');
                return;
            }
            const elapsedMs = nowMs - lastRotationTs;
            if (elapsedMs < this.signedPreKeyRotationIntervalMs) {
                this.logger.trace('signal rotate key skipped: interval not reached', {
                    remainingMs: this.signedPreKeyRotationIntervalMs - elapsedMs
                });
                return;
            }
            const result = await this.signalRotateKey.rotateSignedPreKey();
            const nextRotationTs = this.resolveRotationTimestamp(nowMs, result.errorCode);
            await this.signalStore.setSignedPreKeyRotationTs(nextRotationTs);
            if (result.shouldDigestKey) {
                await this.validateDigestAndRecoverPreKeys();
            }
        }
        catch (error) {
            this.logger.warn('signal rotate key failed', {
                message: toError(error).message
            });
        }
    }
    async resolveLocalKeyBundleFromStore() {
        const [registrationInfo, signedPreKey] = await Promise.all([
            this.signalStore.getRegistrationInfo(),
            this.signalStore.getSignedPreKey()
        ]);
        if (!registrationInfo || !signedPreKey) {
            return null;
        }
        return { registrationInfo, signedPreKey };
    }
    resolveRotationTimestamp(nowMs, errorCode) {
        if (errorCode !== undefined && errorCode >= 500) {
            const retryInMs = Math.min(this.signedPreKeyServerErrorBackoffMs, this.signedPreKeyRotationIntervalMs);
            this.logger.warn('signal rotate key scheduled with server error backoff', {
                errorCode,
                retryInMs
            });
            return nowMs - this.signedPreKeyRotationIntervalMs + retryInMs;
        }
        return nowMs;
    }
    async flushDanglingReceipts() {
        const pending = this.runtime.takeDanglingReceipts();
        if (pending.length === 0) {
            return;
        }
        this.logger.info('flushing dangling receipts', { count: pending.length });
        let cursor = 0;
        while (cursor < pending.length) {
            const batchEnd = Math.min(cursor + 4, pending.length);
            const promises = [];
            for (let i = cursor; i < batchEnd; i += 1) {
                promises.push(this.runtime.sendNodeDirect(pending[i]));
            }
            const results = await Promise.allSettled(promises);
            let transientCount = 0;
            for (let i = 0; i < results.length; i += 1) {
                const result = results[i];
                if (result.status === 'fulfilled') {
                    continue;
                }
                const node = pending[cursor + i];
                const normalized = toError(result.reason);
                if (this.runtime.shouldQueueDanglingReceipt(node, normalized)) {
                    this.runtime.requeueDanglingReceipt(node);
                    transientCount += 1;
                }
                else {
                    this.logger.warn('dropping dangling receipt due non-retryable send error', {
                        id: node.attrs.id,
                        to: node.attrs.to,
                        message: normalized.message
                    });
                }
            }
            if (transientCount > 0) {
                for (let i = batchEnd; i < pending.length; i += 1) {
                    this.runtime.requeueDanglingReceipt(pending[i]);
                }
                this.logger.warn('stopped dangling receipt flush due transient send error', {
                    remaining: transientCount + (pending.length - batchEnd)
                });
                return;
            }
            cursor = batchEnd;
        }
        this.logger.info('dangling receipts flushed');
    }
}
