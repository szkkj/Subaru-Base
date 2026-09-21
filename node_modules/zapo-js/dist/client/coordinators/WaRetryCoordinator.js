"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaRetryCoordinator = void 0;
const keys_1 = require("../../crypto/core/keys");
const BoundedTaskQueue_1 = require("../../infra/perf/BoundedTaskQueue");
const incoming_1 = require("../../message/primitives/incoming");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const constants_2 = require("../../retry/constants");
const parse_1 = require("../../retry/parse");
const reason_1 = require("../../retry/reason");
const replay_1 = require("../../retry/replay");
const keygen_1 = require("../../signal/registration/keygen");
const global_1 = require("../../transport/node/builders/global");
const retry_1 = require("../../transport/node/builders/retry");
const helpers_1 = require("../../transport/node/helpers");
const bytes_1 = require("../../util/bytes");
const coercion_1 = require("../../util/coercion");
const collections_1 = require("../../util/collections");
const primitives_1 = require("../../util/primitives");
const RETRY_CLEANUP_INTERVAL_MS = 30000;
const RETRY_SESSION_BASE_KEY_CACHE_MAX_ENTRIES = 8192;
// Decrypt-failure handling runs off the inbound pipeline (keys-section builds
// serialize on the prekey lock and hit the store); excess under flood is dropped.
const DECRYPT_FAILURE_QUEUE_MAX_SIZE = 1024;
const DECRYPT_FAILURE_QUEUE_MAX_CONCURRENCY = 8;
const PLACEHOLDER_RESEND_RETRY_THRESHOLD = 4;
const PLACEHOLDER_RESEND_BATCH_SIZE = 32;
const PLACEHOLDER_RESEND_DEBOUNCE_MS = 200;
const PLACEHOLDER_RESEND_FALLBACK_MAX_AGE_DAYS = 14;
const PLACEHOLDER_RESEND_IN_FLIGHT_MAX = 256;
const PLACEHOLDER_RESEND_TIMEOUT_MS = 120000;
const DAY_SECONDS = 24 * 60 * 60;
const PLACEHOLDER_RESEND_SKIP_SUBTYPES = new Set([
    'bot_unavailable_fanout',
    'hosted_unavailable_fanout',
    'view_once_unavailable_fanout'
]);
function getRetryReasonName(code) {
    if (code === undefined) {
        return undefined;
    }
    for (const reasonName in constants_2.RETRY_REASON) {
        if (constants_2.RETRY_REASON[reasonName] === code)
            return reasonName;
    }
    return 'unknown';
}
function getRemoteRetryReasonLogFields(reason) {
    return {
        hasRemoteRetryReason: reason !== undefined,
        remoteRetryReason: reason ?? null,
        remoteRetryReasonName: getRetryReasonName(reason) ?? 'missing_in_retry_receipt'
    };
}
/**
 * Returns the placeholder subtype the primary never resends (bot fanout, hosted
 * account, consumed view-once), or `null` when the message is recoverable.
 */
function resolvePlaceholderResendSkipSubtype(node) {
    const subtype = node.attrs.subtype;
    if (typeof subtype === 'string' && PLACEHOLDER_RESEND_SKIP_SUBTYPES.has(subtype)) {
        return subtype;
    }
    const unavailable = (0, helpers_1.findNodeChild)(node, 'unavailable');
    if (!unavailable) {
        return null;
    }
    if ((0, helpers_1.findNodeChild)(node, 'bot')) {
        return 'bot_unavailable_fanout';
    }
    if (unavailable.attrs.hosted === 'true') {
        return 'hosted_unavailable_fanout';
    }
    if (unavailable.attrs.type === 'view_once') {
        return 'view_once_unavailable_fanout';
    }
    return null;
}
class WaRetryCoordinator {
    constructor(options) {
        this.nextRetryCleanupAtMs = 0;
        this.placeholderInFlight = new Set();
        this.placeholderQueue = [];
        this.placeholderTimer = null;
        this.deps = options;
        this.retryTtlMs = options.retryStore.getTtlMs?.() ?? constants_2.RETRY_OUTBOUND_TTL_MS;
        this.retryReplayService = new replay_1.WaRetryReplayService({
            logger: options.logger,
            messageClient: options.messageClient,
            signalProtocol: options.signalProtocol,
            sessionResolver: options.sessionResolver,
            getCurrentCredentials: options.getCurrentCredentials,
            isMobilePrimary: options.isMobilePrimary,
            resolveUserIcdc: options.resolveUserIcdc,
            resolvePrivacyTokenNode: options.resolvePrivacyTokenNode
        });
        this.retryProcessingByMessageId = new Map();
        this.retrySessionBaseKeys = new Map();
        this.decryptFailureQueue = new BoundedTaskQueue_1.BoundedTaskQueue(DECRYPT_FAILURE_QUEUE_MAX_SIZE, DECRYPT_FAILURE_QUEUE_MAX_CONCURRENCY);
    }
    onDecryptFailure(context, error) {
        // Deferred to the bounded queue: building the receipt inline would stall
        // the inbound node pipeline.
        void this.decryptFailureQueue
            .enqueue(() => this.handleDecryptFailure(context, error))
            .catch((queueError) => {
            if (queueError instanceof BoundedTaskQueue_1.BoundedTaskQueueFullError) {
                this.deps.logger.warn('decrypt-failure retry dropped: queue saturated', {
                    id: context.stanzaId,
                    from: context.from,
                    participant: context.participant
                });
                return;
            }
            this.deps.logger.warn('failed to schedule decrypt-failure retry', {
                id: context.stanzaId,
                from: context.from,
                participant: context.participant,
                message: (0, primitives_1.toError)(queueError).message
            });
        });
        return Promise.resolve(true);
    }
    async handleDecryptFailure(context, error) {
        try {
            const prepared = await this.prepareDecryptFailureRetry(context, error);
            if (prepared && !prepared.delegatedToPlaceholderResend) {
                await this.sendDecryptFailureRetryReceipt(context, prepared);
            }
            // Ack the failed stanza even on the give-up path: the retry receipt
            // asks for a resend but does not consume the message, so without the
            // ack it is redelivered on every offline resume.
            await this.sendDecryptFailureAck(context);
        }
        catch (sendError) {
            this.deps.logger.warn('failed to send retry receipt for decrypt failure', {
                id: context.stanzaId,
                from: context.from,
                participant: context.participant,
                message: (0, primitives_1.toError)(sendError).message
            });
        }
    }
    async handleIncomingRetryReceipt(receiptNode) {
        if (!this.isRetryReceiptNode(receiptNode)) {
            return;
        }
        let shouldAck = false;
        try {
            await this.maybeCleanupRetryStore(Date.now());
            const expectedToJids = [];
            const credentials = this.deps.getCurrentCredentials();
            const meJid = credentials?.meJid?.trim();
            const meLid = credentials?.meLid?.trim();
            if (meJid) {
                expectedToJids.push(meJid);
            }
            if (meLid) {
                expectedToJids.push(meLid);
            }
            const request = (0, parse_1.parseRetryReceiptRequest)(receiptNode, expectedToJids.length > 0 ? { expectedToJids } : undefined);
            if (!request) {
                return;
            }
            shouldAck = true;
            await this.handleParsedRetryRequest(receiptNode, request);
        }
        catch (error) {
            this.deps.logger.warn('failed handling incoming retry request', {
                id: receiptNode.attrs.id,
                from: receiptNode.attrs.from,
                participant: receiptNode.attrs.participant,
                message: (0, primitives_1.toError)(error).message
            });
        }
        finally {
            if (shouldAck) {
                await this.sendRetryAckSafe(receiptNode);
            }
        }
    }
    isRetryReceiptNode(node) {
        return (node.tag === constants_1.WA_MESSAGE_TAGS.RECEIPT &&
            (node.attrs.type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY ||
                node.attrs.type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY));
    }
    async prepareDecryptFailureRetry(context, error) {
        const nowMs = Date.now();
        const registrationInfo = await this.deps.signalStore.getRegistrationInfo();
        if (!registrationInfo) {
            this.deps.logger.warn('retry receipt skipped: missing local registration info', {
                id: context.stanzaId,
                from: context.from
            });
            return null;
        }
        const requester = context.participant ?? context.from;
        const expiresAtMs = nowMs + this.retryTtlMs;
        const retryCount = await this.deps.retryStore.incrementInboundCounter(context.stanzaId, requester, nowMs, expiresAtMs);
        if (retryCount > constants_2.MAX_RETRY_ATTEMPTS) {
            // Give up past the ceiling: each attempt rebuilds an expensive keys
            // section, so an uncapped retry on redelivered backlog hammers the store.
            this.deps.logger.debug('retry receipt skipped: inbound retry limit exceeded', {
                id: context.stanzaId,
                from: context.from,
                participant: context.participant,
                retryCount
            });
            return null;
        }
        const delegatedToPlaceholderResend = retryCount >= PLACEHOLDER_RESEND_RETRY_THRESHOLD &&
            this.enqueuePlaceholderResend(context);
        if (delegatedToPlaceholderResend) {
            return {
                registrationId: registrationInfo.registrationId,
                retryCount,
                retryReason: (0, reason_1.mapRetryReasonFromError)(error),
                timestamp: context.t ?? String(Math.trunc(nowMs / 1000)),
                delegatedToPlaceholderResend: true
            };
        }
        const senderDeviceJid = context.participant ?? context.from;
        const forceKeysForHosted = senderDeviceJid ? (0, jid_1.isHostedDeviceJid)(senderDeviceJid) : false;
        return {
            registrationId: registrationInfo.registrationId,
            retryCount,
            retryKeys: forceKeysForHosted || retryCount >= constants_2.RETRY_KEYS_MIN_COUNT
                ? ((await this.buildRetryKeysSection(registrationInfo.identityKeyPair.pubKey, {
                    stanzaId: context.stanzaId,
                    from: context.from
                })) ?? undefined)
                : undefined,
            retryReason: (0, reason_1.mapRetryReasonFromError)(error),
            timestamp: context.t ?? String(Math.trunc(nowMs / 1000)),
            delegatedToPlaceholderResend: false
        };
    }
    async sendDecryptFailureRetryReceipt(context, prepared) {
        const { recipient } = context;
        const retryReceiptNode = (0, retry_1.buildRetryReceiptNode)({
            stanzaId: context.stanzaId,
            to: context.from,
            participant: context.participant,
            recipient,
            originalMsgId: context.stanzaId,
            retryCount: prepared.retryCount,
            t: prepared.timestamp,
            registrationId: prepared.registrationId,
            error: prepared.retryReason,
            categoryPeer: context.messageNode.attrs.category === 'peer',
            keys: prepared.retryKeys
        });
        await this.deps.sendNode(retryReceiptNode);
        this.deps.logger.trace('sent retry receipt for decrypt failure', {
            id: context.stanzaId,
            to: context.from,
            participant: context.participant,
            recipient,
            retryCount: prepared.retryCount,
            reason: prepared.retryReason,
            withKeys: prepared.retryKeys !== undefined
        });
    }
    async sendDecryptFailureAck(context) {
        if (!context.stanzaId || !context.from) {
            return;
        }
        try {
            await this.deps.sendNode((0, global_1.buildAckNode)({
                kind: 'message',
                node: context.messageNode,
                id: context.stanzaId,
                to: context.from,
                participant: context.participant,
                from: this.deps.getCurrentCredentials()?.meJid ?? undefined,
                error: constants_1.WA_NACK_REASONS.UNHANDLED_ERROR
            }));
            this.deps.logger.trace('acked undecryptable stanza', {
                id: context.stanzaId,
                from: context.from,
                participant: context.participant
            });
        }
        catch (error) {
            this.deps.logger.warn('failed to ack undecryptable stanza', {
                id: context.stanzaId,
                from: context.from,
                participant: context.participant,
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    async handleParsedRetryRequest(receiptNode, request) {
        if (request.type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY) {
            this.deps.logger.debug('received enc_rekey_retry request (voip path deferred)', {
                id: request.stanzaId,
                originalMsgId: request.originalMsgId,
                from: request.from,
                participant: request.participant,
                remoteRetryCount: request.retryCount,
                ...getRemoteRetryReasonLogFields(request.retryReason)
            });
            return;
        }
        await this.runRetryTaskSerialized(request.originalMsgId, async () => {
            await this.processRetryRequest(request);
        });
    }
    async processRetryRequest(request) {
        const prepared = await this.prepareRetryResend(request);
        if (!prepared) {
            return;
        }
        const requestLogger = this.deps.logger.child({
            id: request.stanzaId,
            originalMsgId: request.originalMsgId,
            requester: prepared.requesterJid
        });
        const resendResult = await this.retryReplayService.resendOutboundMessage(prepared.outbound, prepared.requesterJid, request.retryCount);
        if (resendResult === 'ineligible') {
            requestLogger.debug('retry request marked ineligible for resend', {
                mode: prepared.outbound.replayMode
            });
            return;
        }
        requestLogger.debug('retry request processed and resent', {
            mode: prepared.outbound.replayMode,
            remoteRetryCount: request.retryCount,
            ...getRemoteRetryReasonLogFields(request.retryReason)
        });
    }
    async prepareRetryResend(request) {
        const requestLogger = this.deps.logger.child({
            id: request.stanzaId,
            originalMsgId: request.originalMsgId
        });
        const requesterJid = request.participant ?? request.from ?? null;
        if (!requesterJid) {
            requestLogger.warn('retry request ignored: missing requester jid');
            return null;
        }
        const requesterLogger = requestLogger.child({ requester: requesterJid });
        let requesterAddress;
        let requesterNormalizedDeviceJid;
        try {
            const requesterParsed = (0, jid_1.parseJidFull)(requesterJid);
            requesterAddress = requesterParsed.address;
            requesterNormalizedDeviceJid = requesterParsed.normalizedJid;
        }
        catch (error) {
            requesterLogger.debug('retry request rejected: invalid requester jid', {
                message: (0, primitives_1.toError)(error).message
            });
            return null;
        }
        if (request.retryCount >= constants_2.MAX_RETRY_ATTEMPTS) {
            requesterLogger.debug('retry request rejected: retry count exceeded', {
                remoteRetryCount: request.retryCount,
                ...getRemoteRetryReasonLogFields(request.retryReason)
            });
            return null;
        }
        const outbound = await this.deps.retryStore.getOutboundMessage(request.originalMsgId);
        if (!outbound) {
            requesterLogger.debug('retry request ignored: outbound message not found');
            return null;
        }
        const sessionReady = await this.updateLocalSessionFromRetryRequest(request, requesterJid, requesterAddress, requesterNormalizedDeviceJid);
        if (!sessionReady) {
            requesterLogger.debug('retry request rejected: missing compatible session', {
                remoteRetryCount: request.retryCount,
                ...getRemoteRetryReasonLogFields(request.retryReason)
            });
            return null;
        }
        const authorization = await this.authorizeRetryRequest(request, outbound, requesterJid, requesterAddress, requesterNormalizedDeviceJid);
        if (!authorization.authorized) {
            requesterLogger.debug('retry request rejected', {
                reason: authorization.reason,
                remoteRetryCount: request.retryCount,
                ...getRemoteRetryReasonLogFields(request.retryReason)
            });
            return null;
        }
        return {
            requesterJid,
            requesterAddress,
            requesterNormalizedDeviceJid,
            outbound
        };
    }
    async trackOutboundReceipt(receiptNode) {
        if (receiptNode.tag !== constants_1.WA_MESSAGE_TAGS.RECEIPT) {
            return;
        }
        const messageId = receiptNode.attrs.id;
        if (!messageId) {
            return;
        }
        const receiptType = receiptNode.attrs.type;
        if (receiptType === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY ||
            receiptType === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY) {
            return;
        }
        const nextState = this.mapOutboundStateFromReceiptType(receiptType);
        if (!nextState) {
            return;
        }
        await this.runRetryTaskSerialized(messageId, async () => {
            const current = await this.deps.retryStore.getOutboundMessage(messageId);
            if (!current) {
                return;
            }
            const nowMs = Date.now();
            const expiresAtMs = nowMs + this.retryTtlMs;
            const merged = (0, parse_1.pickRetryStateMax)(current.state, nextState);
            if (merged !== current.state) {
                await this.deps.retryStore.updateOutboundMessageState(messageId, merged, nowMs, expiresAtMs);
            }
            const requesterJid = receiptNode.attrs.participant ?? receiptNode.attrs.from;
            if (!requesterJid) {
                return;
            }
            try {
                await this.deps.retryStore.markOutboundRequesterDelivered(messageId, (0, jid_1.normalizeDeviceJid)(requesterJid), nowMs, expiresAtMs);
            }
            catch (error) {
                this.deps.logger.warn('failed to update outbound requester delivery state', {
                    id: messageId,
                    requester: requesterJid,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        });
    }
    async runRetryTaskSerialized(messageId, task) {
        const previous = this.retryProcessingByMessageId.get(messageId) ?? Promise.resolve();
        const current = previous.then(task);
        const tracker = current.then(() => undefined, () => undefined);
        this.retryProcessingByMessageId.set(messageId, tracker);
        try {
            await current;
        }
        finally {
            const latest = this.retryProcessingByMessageId.get(messageId);
            if (latest === tracker) {
                this.retryProcessingByMessageId.delete(messageId);
            }
        }
    }
    async buildRetryKeysSection(identity, logContext) {
        const [signedPreKey, preKey] = await Promise.all([
            this.deps.signalStore.getSignedPreKey(),
            this.deps.preKeyStore.getOrGenSinglePreKey(keygen_1.generatePreKeyPair)
        ]);
        if (!signedPreKey) {
            this.deps.logger.warn('retry keys section skipped: signed prekey unavailable', {
                id: logContext.stanzaId,
                from: logContext.from
            });
            return null;
        }
        await this.deps.preKeyStore.markKeyAsUploaded(preKey.keyId);
        const signedIdentity = this.deps.getCurrentCredentials()?.signedIdentity;
        return {
            identity: (0, keys_1.toRawPubKey)(identity),
            key: {
                id: preKey.keyId,
                publicKey: (0, keys_1.toRawPubKey)(preKey.keyPair.pubKey)
            },
            skey: {
                id: signedPreKey.keyId,
                publicKey: (0, keys_1.toRawPubKey)(signedPreKey.keyPair.pubKey),
                signature: signedPreKey.signature
            },
            deviceIdentity: signedIdentity
                ? _proto_1.proto.ADVSignedDeviceIdentity.encode(signedIdentity).finish()
                : undefined
        };
    }
    async updateLocalSessionFromRetryRequest(request, requesterJid, requesterAddress, requesterNormalizedDeviceJid) {
        const requestLogger = this.deps.logger.child({
            id: request.stanzaId,
            originalMsgId: request.originalMsgId,
            requester: requesterJid
        });
        const [, currentSession] = await Promise.all([
            this.markRetryRequesterSenderKeyAsStale(request, requesterJid, requesterAddress),
            this.deps.sessionStore.getSession(requesterAddress)
        ]);
        const regIdMismatch = !!currentSession && request.regId > 0 && currentSession.remote.regId !== request.regId;
        if (regIdMismatch && !request.keyBundle) {
            await this.deps.sessionStore.deleteSession(requesterAddress);
        }
        if (request.keyBundle) {
            if (!request.keyBundle.key || !request.keyBundle.skey.signature) {
                return false;
            }
            if (request.offline) {
                if (!currentSession) {
                    requestLogger.debug('retry request rejected: offline retry missing existing session', {
                        remoteRetryCount: request.retryCount,
                        ...getRemoteRetryReasonLogFields(request.retryReason)
                    });
                    await this.deps.sessionStore.deleteSession(requesterAddress);
                    return false;
                }
                if (regIdMismatch) {
                    requestLogger.debug('retry request rejected: offline retry registration id mismatch', {
                        remoteRetryCount: request.retryCount,
                        ...getRemoteRetryReasonLogFields(request.retryReason)
                    });
                    await this.deps.sessionStore.deleteSession(requesterAddress);
                    return false;
                }
            }
            else if (regIdMismatch) {
                await this.deps.sessionStore.deleteSession(requesterAddress);
            }
            await this.deps.signalProtocol.establishOutgoingSession(requesterAddress, {
                regId: request.regId,
                identity: request.keyBundle.identity,
                signedKey: {
                    id: request.keyBundle.skey.id,
                    publicKey: request.keyBundle.skey.publicKey,
                    signature: request.keyBundle.skey.signature
                },
                oneTimeKey: {
                    id: request.keyBundle.key.id,
                    publicKey: request.keyBundle.key.publicKey
                }
            }, { reuseExisting: true });
            return this.applySessionBaseKeyPolicy(request, requesterJid, requesterAddress, requesterNormalizedDeviceJid);
        }
        const sessionStillExists = currentSession !== null && !regIdMismatch;
        if (sessionStillExists) {
            return this.applySessionBaseKeyPolicy(request, requesterJid, requesterAddress, requesterNormalizedDeviceJid);
        }
        const fetched = await this.fetchMissingPreKeysSession(requesterJid, requesterAddress, requesterNormalizedDeviceJid, request.regId);
        if (!fetched) {
            return false;
        }
        await this.deps.signalProtocol.establishOutgoingSession(requesterAddress, fetched);
        return this.applySessionBaseKeyPolicy(request, requesterJid, requesterAddress, requesterNormalizedDeviceJid);
    }
    async applySessionBaseKeyPolicy(request, requesterJid, requesterAddress, requesterNormalizedDeviceJid) {
        if (request.retryCount < 2) {
            return true;
        }
        const currentSession = await this.deps.sessionStore.getSession(requesterAddress);
        const sessionBaseKey = currentSession?.aliceBaseKey ?? null;
        if (!sessionBaseKey) {
            return true;
        }
        const expiresAtMs = Date.now() + this.retryTtlMs;
        if (request.retryCount === 2) {
            this.setRetrySessionBaseKey(request.originalMsgId, requesterNormalizedDeviceJid, sessionBaseKey, expiresAtMs);
            return true;
        }
        const saved = this.getRetrySessionBaseKey(request.originalMsgId, requesterNormalizedDeviceJid);
        if (!saved || !(0, bytes_1.uint8Equal)(saved.baseKey, sessionBaseKey)) {
            return true;
        }
        await this.deps.sessionStore.deleteSession(requesterAddress);
        this.deps.logger.debug('retry request forcing session refresh due to repeated base key', {
            id: request.stanzaId,
            originalMsgId: request.originalMsgId,
            requester: requesterJid,
            remoteRetryCount: request.retryCount,
            ...getRemoteRetryReasonLogFields(request.retryReason)
        });
        const fetched = await this.fetchMissingPreKeysSession(requesterJid, requesterAddress, requesterNormalizedDeviceJid, request.regId);
        if (!fetched) {
            return false;
        }
        await this.deps.signalProtocol.establishOutgoingSession(requesterAddress, fetched);
        return true;
    }
    async markRetryRequesterSenderKeyAsStale(request, requesterJid, requesterAddress) {
        if (!(0, jid_1.isGroupOrBroadcastJid)(request.from)) {
            return;
        }
        try {
            const deleted = await this.deps.senderKeyStore.markForgetSenderKey(request.from, [
                requesterAddress
            ]);
            this.deps.logger.debug('marked sender key as stale for group retry requester', {
                groupJid: request.from,
                requester: requesterJid,
                deleted
            });
        }
        catch (error) {
            this.deps.logger.warn('failed to mark sender key as stale for group retry requester', {
                groupJid: request.from,
                requester: requesterJid,
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    async fetchMissingPreKeysSession(requesterJid, requesterAddress, requesterNormalizedDeviceJid, requesterRegistrationId) {
        const requesterLogger = this.deps.logger.child({ requester: requesterJid });
        try {
            const results = await this.deps.signalMissingPreKeysSync.fetchMissingPreKeys([
                {
                    userJid: `${requesterAddress.user}@${requesterAddress.server}`,
                    devices: [
                        {
                            deviceId: requesterAddress.device,
                            registrationId: requesterRegistrationId
                        }
                    ]
                }
            ]);
            const first = results[0];
            if (!first || !('devices' in first)) {
                requesterLogger.debug('missing prekeys fetch returned user error', {
                    errorText: first && 'errorText' in first ? first.errorText : 'unknown'
                });
                return null;
            }
            const matched = first.devices.find((device) => (0, jid_1.normalizeDeviceJid)(device.deviceJid) === requesterNormalizedDeviceJid);
            if (!matched) {
                requesterLogger.debug('missing prekeys fetch did not return requested device', {
                    devices: first.devices.length
                });
                return null;
            }
            return matched.bundle;
        }
        catch (error) {
            requesterLogger.debug('failed to fetch missing prekeys for retry requester', {
                message: (0, primitives_1.toError)(error).message
            });
            return null;
        }
    }
    async authorizeRetryRequest(request, outbound, requesterJid, requesterAddress, requesterNormalizedDeviceJid) {
        if (outbound.state === 'ineligible') {
            return { authorized: false, reason: `state_${outbound.state}` };
        }
        let requesterStatus = null;
        try {
            requesterStatus = await this.deps.retryStore.getOutboundRequesterStatus(outbound.messageId, (0, jid_1.toUserJid)(requesterNormalizedDeviceJid));
        }
        catch (error) {
            this.deps.logger.warn('failed to resolve outbound requester status from retry store', {
                id: request.stanzaId,
                originalMsgId: request.originalMsgId,
                requester: requesterJid,
                message: (0, primitives_1.toError)(error).message
            });
        }
        if (requesterStatus) {
            if (!requesterStatus.eligible) {
                return { authorized: false, reason: 'requester_device_not_eligible' };
            }
            if (requesterStatus.delivered) {
                return { authorized: false, reason: 'requester_already_delivered' };
            }
        }
        const isGroupOutbound = (0, jid_1.isGroupOrBroadcastJid)(outbound.toJid);
        if (!isGroupOutbound && (outbound.state === 'read' || outbound.state === 'played')) {
            return { authorized: false, reason: `state_${outbound.state}` };
        }
        if (!requesterStatus) {
            const requesterAuthorized = await this.isRequesterAuthorizedDevice(requesterJid, requesterAddress, requesterNormalizedDeviceJid);
            if (!requesterAuthorized) {
                return { authorized: false, reason: 'requester_device_not_authorized' };
            }
        }
        return { authorized: true };
    }
    async isRequesterAuthorizedDevice(requesterJid, requesterAddress, requesterNormalizedDeviceJid) {
        try {
            const requesterUser = `${requesterAddress.user}@${requesterAddress.server}`;
            if (requesterNormalizedDeviceJid === (0, jid_1.normalizeDeviceJid)(requesterUser)) {
                return true;
            }
            const synced = await this.deps.signalDeviceSync.syncDeviceList([requesterUser]);
            const target = synced.find((entry) => entry.jid === requesterUser);
            if (!target) {
                return false;
            }
            for (let index = 0; index < target.deviceJids.length; index += 1) {
                if ((0, jid_1.normalizeDeviceJid)(target.deviceJids[index]) === requesterNormalizedDeviceJid) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            this.deps.logger.warn('retry authorization failed while syncing requester device list', {
                requester: requesterJid,
                message: (0, primitives_1.toError)(error).message
            });
            return false;
        }
    }
    mapOutboundStateFromReceiptType(type) {
        if (type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_READ) {
            return 'read';
        }
        if (type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_PLAYED) {
            return 'played';
        }
        if (type === undefined ||
            type === '' ||
            type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_DELIVERY ||
            type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_SENDER ||
            type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_INACTIVE ||
            type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_PEER) {
            return 'delivered';
        }
        return null;
    }
    async sendRetryAckSafe(receiptNode) {
        if (!receiptNode.attrs.id || !receiptNode.attrs.from) {
            this.deps.logger.warn('retry ack skipped: missing receipt id/from', {
                hasId: receiptNode.attrs.id !== undefined,
                hasFrom: receiptNode.attrs.from !== undefined,
                participant: receiptNode.attrs.participant,
                type: receiptNode.attrs.type
            });
            return;
        }
        try {
            await this.deps.sendNode((0, global_1.buildAckNode)({
                kind: 'receipt',
                node: receiptNode,
                retryType: true
            }));
        }
        catch (error) {
            this.deps.logger.warn('failed to send retry ack', {
                id: receiptNode.attrs.id,
                from: receiptNode.attrs.from,
                participant: receiptNode.attrs.participant,
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    async maybeCleanupRetryStore(nowMs) {
        if (nowMs < this.nextRetryCleanupAtMs) {
            return;
        }
        this.nextRetryCleanupAtMs = nowMs + RETRY_CLEANUP_INTERVAL_MS;
        this.cleanupRetrySessionBaseKeys(nowMs);
        try {
            await this.deps.retryStore.cleanupExpired(nowMs);
        }
        catch (error) {
            this.deps.logger.warn('retry store cleanup failed', {
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    retrySessionBaseKeyMapKey(originalMsgId, requesterNormalizedDeviceJid) {
        return `${originalMsgId}|${requesterNormalizedDeviceJid}`;
    }
    setRetrySessionBaseKey(originalMsgId, requesterNormalizedDeviceJid, baseKey, expiresAtMs) {
        const key = this.retrySessionBaseKeyMapKey(originalMsgId, requesterNormalizedDeviceJid);
        (0, collections_1.setBoundedMapEntry)(this.retrySessionBaseKeys, key, {
            baseKey: Uint8Array.from(baseKey),
            expiresAtMs
        }, RETRY_SESSION_BASE_KEY_CACHE_MAX_ENTRIES);
    }
    getRetrySessionBaseKey(originalMsgId, requesterNormalizedDeviceJid) {
        const key = this.retrySessionBaseKeyMapKey(originalMsgId, requesterNormalizedDeviceJid);
        const entry = this.retrySessionBaseKeys.get(key);
        if (!entry) {
            return null;
        }
        if (entry.expiresAtMs <= Date.now()) {
            this.retrySessionBaseKeys.delete(key);
            return null;
        }
        return entry;
    }
    cleanupRetrySessionBaseKeys(nowMs) {
        for (const [key, entry] of this.retrySessionBaseKeys) {
            if (entry.expiresAtMs > nowMs) {
                continue;
            }
            this.retrySessionBaseKeys.delete(key);
        }
    }
    isSenderFromOwnAccount(context) {
        const senderUser = (0, jid_1.parseSignalAddressFromJid)(context.participant ?? context.from).user;
        const credentials = this.deps.getCurrentCredentials();
        const meLid = credentials?.meLid;
        if (meLid && (0, jid_1.parseSignalAddressFromJid)(meLid).user === senderUser)
            return true;
        const meJid = credentials?.meJid;
        return !!meJid && (0, jid_1.parseSignalAddressFromJid)(meJid).user === senderUser;
    }
    /**
     * Queues a `PLACEHOLDER_MESSAGE_RESEND` peer request for a message the server
     * delivered as `<unavailable/>` (no `<enc>` to decrypt, so no retry receipt).
     * Returns `false` when the placeholder is unrecoverable, too old, or this
     * session is the primary. The payload surfaces later as a `message` event.
     */
    onUnavailableMessage(context) {
        return this.enqueuePlaceholderResend(context);
    }
    getPlaceholderResendMaxAgeSeconds() {
        const days = (0, coercion_1.tryAsNumber)(this.deps.getAbPropNumber?.('placeholder_message_resend_maximum_days_limit'));
        return ((days !== null && days > 0 ? days : PLACEHOLDER_RESEND_FALLBACK_MAX_AGE_DAYS) *
            DAY_SECONDS);
    }
    /**
     * Builds the message key the primary indexes the message under: the chat is
     * the `from`, or the `recipient` for a self-sent 1:1, always without the
     * `:device` segment. The participant rides along only for an incoming
     * group/broadcast message. Asking with the raw device-addressed `from`
     * matches nothing and the resend comes back empty.
     */
    buildPlaceholderResendKey(context) {
        const fromMe = this.isSenderFromOwnAccount(context);
        const isGroupOrBroadcast = (0, jid_1.isGroupOrBroadcastJid)(context.from);
        const chatJid = fromMe && !isGroupOrBroadcast
            ? (context.messageNode.attrs.recipient ?? context.from)
            : context.from;
        return {
            remoteJid: (0, jid_1.toUserJid)(chatJid),
            id: context.stanzaId,
            fromMe,
            ...(!fromMe && isGroupOrBroadcast && context.participant
                ? { participant: (0, jid_1.toUserJid)(context.participant) }
                : {})
        };
    }
    enqueuePlaceholderResend(context) {
        if (!this.deps.peerDataOperation || !this.deps.emitIncomingMessage) {
            return false;
        }
        if (this.deps.isMobilePrimary?.()) {
            return false;
        }
        const skipSubtype = resolvePlaceholderResendSkipSubtype(context.messageNode);
        if (skipSubtype !== null) {
            this.deps.logger.trace('placeholder resend skipped: unrecoverable placeholder', {
                id: context.stanzaId,
                subtype: skipSubtype
            });
            return false;
        }
        const timestampSeconds = context.t ? Number(context.t) : Date.now() / 1000;
        if (Number.isFinite(timestampSeconds)) {
            const ageSeconds = Date.now() / 1000 - timestampSeconds;
            if (ageSeconds > this.getPlaceholderResendMaxAgeSeconds()) {
                return false;
            }
        }
        if (this.placeholderInFlight.has(context.stanzaId)) {
            return true;
        }
        if (this.placeholderInFlight.size >= PLACEHOLDER_RESEND_IN_FLIGHT_MAX) {
            this.deps.logger.warn('placeholder resend: in-flight set saturated, dropping enqueue', {
                id: context.stanzaId,
                maxInFlight: PLACEHOLDER_RESEND_IN_FLIGHT_MAX
            });
            return false;
        }
        this.placeholderInFlight.add(context.stanzaId);
        this.placeholderQueue.push(this.buildPlaceholderResendKey(context));
        if (this.placeholderTimer === null) {
            this.placeholderTimer = setTimeout(() => {
                this.placeholderTimer = null;
                void this.flushPlaceholderBatch();
            }, PLACEHOLDER_RESEND_DEBOUNCE_MS);
        }
        return true;
    }
    async flushPlaceholderBatch() {
        const peerDataOperation = this.deps.peerDataOperation;
        const emitIncomingMessage = this.deps.emitIncomingMessage;
        if (!peerDataOperation || !emitIncomingMessage) {
            this.placeholderQueue = [];
            this.placeholderInFlight.clear();
            return;
        }
        while (this.placeholderQueue.length > 0) {
            const batch = this.placeholderQueue.splice(0, PLACEHOLDER_RESEND_BATCH_SIZE);
            try {
                const results = await peerDataOperation.request(_proto_1.proto.Message.PeerDataOperationRequestType.PLACEHOLDER_MESSAGE_RESEND, {
                    placeholderMessageResendRequest: batch.map((item) => ({
                        messageKey: {
                            remoteJid: item.remoteJid,
                            id: item.id,
                            fromMe: item.fromMe,
                            participant: item.participant
                        }
                    }))
                }, { timeoutMs: PLACEHOLDER_RESEND_TIMEOUT_MS });
                const meJid = this.deps.getCurrentCredentials()?.meJid;
                for (const result of results) {
                    const bytes = result.placeholderMessageResendResponse?.webMessageInfoBytes;
                    if (!bytes) {
                        continue;
                    }
                    try {
                        const recovered = _proto_1.proto.WebMessageInfo.decode(bytes);
                        emitIncomingMessage((0, incoming_1.buildRecoveredIncomingEvent)(recovered, meJid));
                    }
                    catch (error) {
                        this.deps.logger.warn('placeholder resend: failed to decode WebMessageInfo', {
                            message: (0, primitives_1.toError)(error).message
                        });
                    }
                }
            }
            catch (error) {
                this.deps.logger.warn('placeholder resend: request failed', {
                    batchSize: batch.length,
                    message: (0, primitives_1.toError)(error).message
                });
            }
            finally {
                for (const item of batch) {
                    this.placeholderInFlight.delete(item.id);
                }
            }
        }
    }
}
exports.WaRetryCoordinator = WaRetryCoordinator;
