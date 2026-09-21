"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaPairingFlow = void 0;
const pairing_code_crypto_1 = require("../pairing/pairing-code-crypto");
const _crypto_1 = require("../../crypto");
const _proto_1 = require("../../proto");
const browser_1 = require("../../protocol/browser");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const WaAdvSignature_1 = require("../../signal/attestation/WaAdvSignature");
const global_1 = require("../../transport/node/builders/global");
const pairing_1 = require("../../transport/node/builders/pairing");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
/** Server-enforced bounds on the `pair-success` `device-identity` payload. */
const PAIR_SUCCESS_DEVICE_IDENTITY_MIN_BYTES = 1;
const PAIR_SUCCESS_DEVICE_IDENTITY_MAX_BYTES = 500;
class WaPairingFlow {
    constructor(options) {
        this.pairSuccessInFlight = false;
        this.opts = options;
        this.pairingSession = null;
    }
    hasPairingSession() {
        return this.pairingSession !== null;
    }
    clearSession() {
        this.opts.logger.trace('pairing flow session cleared');
        this.pairingSession = null;
    }
    async requestPairingCode(phoneNumber, shouldShowPushNotification = true, customCode) {
        this.opts.logger.info('requesting pairing code', {
            shouldShowPushNotification,
            hasCustomCode: customCode !== undefined
        });
        const normalizedCustomCode = customCode !== undefined ? (0, pairing_code_crypto_1.normalizeCustomPairingCode)(customCode) : undefined;
        const credentials = this.requireCredentials();
        const phoneJid = (0, jid_1.parsePhoneJid)(phoneNumber);
        const createdAtSeconds = Math.floor(Date.now() / 1000);
        const [companionHello, refreshedCredentials] = await Promise.all([
            (0, pairing_code_crypto_1.createCompanionHello)({ customCode: normalizedCustomCode }),
            this.rotateAdvSecret(credentials)
        ]);
        const browserDisplayName = (0, browser_1.getWaBrowserDisplayName)(this.opts.device.browser);
        const response = await this.opts.socket.query((0, pairing_1.buildCompanionHelloRequestNode)({
            phoneJid,
            shouldShowPushNotification,
            wrappedCompanionEphemeralPub: companionHello.wrappedCompanionEphemeralPub,
            companionServerAuthKeyPub: refreshedCredentials.noiseKeyPair.pubKey,
            companionPlatformId: this.opts.device.platform,
            companionPlatformDisplay: `${browserDisplayName} (${this.opts.device.osDisplayName})`
        }), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        this.opts.logger.debug('pairing code request response received', {
            responseTag: response.tag,
            responseType: response.attrs.type
        });
        (0, query_1.assertIqResult)(response, 'companion hello');
        const linkCodeNode = (0, helpers_1.findNodeChild)(response, constants_1.WA_NODE_TAGS.LINK_CODE_COMPANION_REG);
        if (!linkCodeNode) {
            throw new Error('companion hello response missing link_code_companion_reg');
        }
        const refNode = (0, helpers_1.findNodeChild)(linkCodeNode, constants_1.WA_NODE_TAGS.LINK_CODE_PAIRING_REF);
        if (!refNode) {
            throw new Error('companion hello response missing link_code_pairing_ref');
        }
        const ref = (0, helpers_1.decodeNodeContentUtf8OrBytes)(refNode.content, 'link_code_pairing_ref');
        this.pairingSession = {
            pairingCode: companionHello.pairingCode,
            phoneJid,
            ref,
            createdAtSeconds,
            companionEphemeralKeyPair: companionHello.companionEphemeralKeyPair,
            attempts: 0,
            finished: false
        };
        this.opts.callbacks.emitPairingCode(companionHello.pairingCode);
        this.opts.logger.debug('pairing code emitted', {
            phoneJid,
            createdAtSeconds: this.pairingSession.createdAtSeconds
        });
        return companionHello.pairingCode;
    }
    async fetchPairingCountryCodeIso() {
        this.opts.logger.trace('fetching pairing country code ISO');
        const response = await this.opts.socket.query((0, pairing_1.buildGetCountryCodeRequestNode)(), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        const countryCodeNode = (0, helpers_1.findNodeChild)(response, constants_1.WA_NODE_TAGS.COUNTRY_CODE);
        const iso = countryCodeNode?.attrs.iso;
        if (!iso) {
            throw new Error('country_code response is missing iso');
        }
        this.opts.logger.debug('pairing country code received', { iso });
        return iso;
    }
    async handleIncomingIqSet(node) {
        const iqLogger = this.opts.logger.child({ id: node.attrs.id });
        iqLogger.trace('pairing flow received iq:set', { from: node.attrs.from });
        const firstChild = (0, helpers_1.getFirstNodeChild)(node);
        if (!firstChild) {
            return false;
        }
        if (firstChild.tag === constants_1.WA_NODE_TAGS.PAIR_DEVICE) {
            iqLogger.debug('handling pair-device stanza');
            await this.handlePairDevice(node, firstChild);
            return true;
        }
        if (firstChild.tag === constants_1.WA_NODE_TAGS.PAIR_SUCCESS) {
            iqLogger.debug('handling pair-success stanza');
            await this.handlePairSuccess(node, firstChild);
            return true;
        }
        return false;
    }
    async handleLinkCodeNotification(node) {
        const linkCodeNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.LINK_CODE_COMPANION_REG);
        if (!linkCodeNode) {
            return false;
        }
        this.opts.logger.trace('handling link_code_companion_reg notification', {
            id: node.attrs.id,
            stage: linkCodeNode.attrs.stage
        });
        await this.opts.socket.sendNode((0, global_1.buildAckNode)({
            kind: 'notification',
            node
        }));
        const stage = linkCodeNode.attrs.stage;
        if (stage === constants_1.WA_SIGNALING.LINK_CODE_STAGE_REFRESH_CODE) {
            const refNode = (0, helpers_1.findNodeChild)(linkCodeNode, constants_1.WA_NODE_TAGS.LINK_CODE_PAIRING_REF);
            if (!refNode || !this.pairingSession?.ref) {
                return true;
            }
            const ref = (0, helpers_1.decodeNodeContentUtf8OrBytes)(refNode.content, 'refresh_code.link_code_pairing_ref');
            if ((0, bytes_1.uint8Equal)(ref, this.pairingSession.ref)) {
                this.opts.logger.debug('received pairing refresh notification', {
                    forceManualRefresh: linkCodeNode.attrs.force_manual_refresh === 'true'
                });
                this.opts.callbacks.emitPairingRefresh(linkCodeNode.attrs.force_manual_refresh === 'true');
            }
            return true;
        }
        if (stage !== constants_1.WA_SIGNALING.LINK_CODE_STAGE_PRIMARY_HELLO) {
            return true;
        }
        await this.handlePrimaryHello(linkCodeNode);
        return true;
    }
    async handleCompanionRegRefreshNotification(node) {
        const hasExpectedChild = (0, helpers_1.hasNodeChild)(node, constants_1.WA_SIGNALING.COMPANION_REG_REFRESH_NOTIFICATION) ||
            (0, helpers_1.hasNodeChild)(node, 'pair-device-rotate-qr');
        if (!hasExpectedChild) {
            return false;
        }
        // Rotate first so we don't ack success before local credential state is durably updated.
        await this.rotateAdvSecret(this.requireCredentials());
        await this.opts.socket.sendNode((0, global_1.buildAckNode)({
            kind: 'notification',
            node,
            typeOverride: constants_1.WA_SIGNALING.COMPANION_REG_REFRESH_NOTIFICATION
        }));
        this.opts.logger.debug('handled companion_reg_refresh notification');
        this.opts.qrFlow.refreshCurrentQr();
        return true;
    }
    async handlePairDevice(iqNode, pairDeviceNode) {
        const refs = (0, helpers_1.getNodeChildrenNonEmptyUtf8ByTag)(pairDeviceNode, constants_1.WA_NODE_TAGS.REF, 'pair-device.ref');
        // Commit adv-secret rotation before sending IQ success to avoid protocol/state divergence.
        await this.rotateAdvSecret(this.requireCredentials());
        await this.opts.socket.sendNode((0, global_1.buildIqResultNode)(iqNode));
        this.opts.qrFlow.setRefs(refs);
        this.opts.logger.debug('pair-device refs updated', { refsCount: refs.length });
    }
    async handlePairSuccess(iqNode, pairSuccessNode) {
        if (this.pairSuccessInFlight) {
            this.opts.logger.debug('pair-success ignored: already processing');
            return;
        }
        if (this.opts.auth.getCredentials()?.meJid) {
            this.opts.logger.debug('pair-success ignored: session already registered');
            return;
        }
        this.pairSuccessInFlight = true;
        try {
            await this.completePairSuccess(iqNode, pairSuccessNode);
        }
        finally {
            this.pairSuccessInFlight = false;
        }
    }
    async completePairSuccess(iqNode, pairSuccessNode) {
        this.opts.logger.debug('processing pair-success node');
        const credentials = this.requireCredentials();
        const [deviceIdentityNode, deviceNode, platformNode] = (0, helpers_1.findNodeChildrenByTags)(pairSuccessNode, [constants_1.WA_NODE_TAGS.DEVICE_IDENTITY, 'device', constants_1.WA_NODE_TAGS.PLATFORM]);
        if (!deviceIdentityNode || !deviceNode || !platformNode) {
            this.opts.logger.error('pair-success missing required nodes', {
                hasDeviceIdentity: !!deviceIdentityNode,
                hasDevice: !!deviceNode,
                hasPlatform: !!platformNode
            });
            throw new Error('pair-success stanza is missing required nodes');
        }
        const deviceIdentityBytes = (0, helpers_1.decodeNodeContentUtf8OrBytes)(deviceIdentityNode.content, 'pair-success.device-identity');
        if (deviceIdentityBytes.length < PAIR_SUCCESS_DEVICE_IDENTITY_MIN_BYTES ||
            deviceIdentityBytes.length > PAIR_SUCCESS_DEVICE_IDENTITY_MAX_BYTES) {
            throw new Error(`pair-success device-identity must be ${PAIR_SUCCESS_DEVICE_IDENTITY_MIN_BYTES}-${PAIR_SUCCESS_DEVICE_IDENTITY_MAX_BYTES} bytes, got ${deviceIdentityBytes.length}`);
        }
        const wrappedIdentity = _proto_1.proto.ADVSignedDeviceIdentityHMAC.decode(deviceIdentityBytes);
        const wrappedDetails = (0, bytes_1.decodeProtoBytes)(wrappedIdentity.details, 'ADVSignedDeviceIdentityHMAC.details');
        const wrappedHmac = (0, bytes_1.decodeProtoBytes)(wrappedIdentity.hmac, 'ADVSignedDeviceIdentityHMAC.hmac');
        const accountType = wrappedIdentity.accountType ?? _proto_1.proto.ADVEncryptionType.E2EE;
        const isHosted = accountType === _proto_1.proto.ADVEncryptionType.HOSTED;
        if (this.opts.dangerous?.disablePairSuccessHmacVerification !== true) {
            const hmacInput = isHosted
                ? (0, bytes_1.concatBytes)([WaAdvSignature_1.ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE, wrappedDetails])
                : wrappedDetails;
            const expectedHmac = (0, WaAdvSignature_1.computeAdvIdentityHmac)(credentials.advSecretKey, hmacInput);
            if (!(0, bytes_1.uint8TimingSafeEqual)(expectedHmac, wrappedHmac)) {
                this.opts.logger.error('pair-success hmac mismatch', {
                    meJid: deviceNode.attrs.jid,
                    meLid: deviceNode.attrs.lid,
                    platform: platformNode.attrs.name,
                    isHosted
                });
                await this.sendPairSuccessValidationError(iqNode);
                throw new Error('pair-success HMAC validation failed');
            }
        }
        const built = await this.buildPairSuccessResponseIdentity(credentials, wrappedDetails);
        if (!built) {
            await this.sendPairSuccessValidationError(iqNode);
            throw new Error('pair-success account signature validation failed');
        }
        const { signedIdentity, keyIndex, responseIdentityBytes } = built;
        const nextCredentials = {
            ...credentials,
            signedIdentity,
            meJid: deviceNode.attrs.jid,
            meLid: deviceNode.attrs.lid,
            platform: platformNode.attrs.name,
            loginCounter: 0
        };
        await this.opts.auth.updateCredentials(nextCredentials);
        this.opts.logger.info('pair-success credentials updated', {
            meJid: nextCredentials.meJid,
            meLid: nextCredentials.meLid,
            platform: nextCredentials.platform
        });
        this.opts.qrFlow.clear();
        await this.opts.socket.sendNode({
            tag: constants_1.WA_NODE_TAGS.IQ,
            attrs: {
                ...(iqNode.attrs.id ? { id: iqNode.attrs.id } : {}),
                to: iqNode.attrs.from ?? constants_1.WA_DEFAULTS.HOST_DOMAIN,
                type: constants_1.WA_IQ_TYPES.RESULT
            },
            content: [
                {
                    tag: 'pair-device-sign',
                    attrs: {},
                    content: [
                        {
                            tag: constants_1.WA_NODE_TAGS.DEVICE_IDENTITY,
                            attrs: {
                                'key-index': String(keyIndex)
                            },
                            content: responseIdentityBytes
                        }
                    ]
                }
            ]
        });
        this.opts.callbacks.emitPaired(nextCredentials);
        this.opts.logger.debug('pair-success completed and paired event emitted');
    }
    /** Returns `null` when the primary's account signature does not verify. */
    async buildPairSuccessResponseIdentity(credentials, wrappedDetails) {
        const signedIdentity = _proto_1.proto.ADVSignedDeviceIdentity.decode(wrappedDetails);
        const details = (0, bytes_1.decodeProtoBytes)(signedIdentity.details, 'ADVSignedDeviceIdentity.details');
        const accountSignature = (0, bytes_1.decodeProtoBytes)(signedIdentity.accountSignature, 'ADVSignedDeviceIdentity.accountSignature');
        const accountSignatureKey = (0, bytes_1.decodeProtoBytes)(signedIdentity.accountSignatureKey, 'ADVSignedDeviceIdentity.accountSignatureKey');
        const localIdentity = credentials.registrationInfo.identityKeyPair;
        const advDeviceIdentity = _proto_1.proto.ADVDeviceIdentity.decode(details);
        const isDeviceHosted = advDeviceIdentity.deviceType === _proto_1.proto.ADVEncryptionType.HOSTED;
        if (this.opts.dangerous?.disableAdvSignatureVerification !== true) {
            const validAccountSignature = await (0, WaAdvSignature_1.verifyDeviceIdentityAccountSignature)(details, accountSignature, localIdentity.pubKey, accountSignatureKey, isDeviceHosted);
            if (!validAccountSignature) {
                this.opts.logger.error('pair-success account signature invalid', {
                    keyIndex: advDeviceIdentity.keyIndex ?? 0,
                    isDeviceHosted
                });
                return null;
            }
        }
        signedIdentity.deviceSignature = await (0, WaAdvSignature_1.generateDeviceSignature)(details, localIdentity, accountSignatureKey, false);
        const responseIdentityBytes = _proto_1.proto.ADVSignedDeviceIdentity.encode({
            details: signedIdentity.details,
            accountSignature: signedIdentity.accountSignature,
            deviceSignature: signedIdentity.deviceSignature
        }).finish();
        return {
            signedIdentity,
            keyIndex: advDeviceIdentity.keyIndex ?? 0,
            responseIdentityBytes
        };
    }
    /** Mirrors the `not-authorized` IQ error WhatsApp Web returns on a failed pair-success. */
    async sendPairSuccessValidationError(iqNode) {
        try {
            await this.opts.socket.sendNode((0, global_1.buildIqErrorNode)(iqNode, { code: 401, text: 'not-authorized' }));
        }
        catch (error) {
            this.opts.logger.warn('failed to send pair-success error response', {
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    async handlePrimaryHello(linkCodeNode) {
        let credentials = this.requireCredentials();
        const pairingSession = this.pairingSession;
        if (!pairingSession) {
            this.opts.logger.trace('primary_hello ignored: no active session');
            return;
        }
        pairingSession.attempts += 1;
        this.opts.logger.debug('processing primary_hello', {
            attempts: pairingSession.attempts,
            finished: pairingSession.finished
        });
        if (pairingSession.finished) {
            if (pairingSession.attempts > constants_1.WA_DEFAULTS.PAIRING_CODE_MAX_PRIMARY_HELLOS) {
                throw new Error('pairing code exceeded maximum primary hello attempts');
            }
            credentials = await this.rotateAdvSecret(credentials);
            pairingSession.finished = false;
        }
        const [refNode, wrappedPrimaryNode, primaryIdentityNode] = (0, helpers_1.findNodeChildrenByTags)(linkCodeNode, [
            constants_1.WA_NODE_TAGS.LINK_CODE_PAIRING_REF,
            'link_code_pairing_wrapped_primary_ephemeral_pub',
            'primary_identity_pub'
        ]);
        if (!refNode || !wrappedPrimaryNode || !primaryIdentityNode) {
            throw new Error('primary_hello notification is missing fields');
        }
        const ref = (0, helpers_1.decodeNodeContentUtf8OrBytes)(refNode.content, 'primary_hello.link_code_pairing_ref');
        if (!pairingSession.ref || !(0, bytes_1.uint8Equal)(ref, pairingSession.ref)) {
            this.opts.logger.warn('primary_hello ref mismatch ignored', {
                phoneJid: pairingSession.phoneJid
            });
            return;
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (nowSeconds - pairingSession.createdAtSeconds >
            constants_1.WA_DEFAULTS.PAIRING_CODE_MAX_AGE_SECONDS) {
            throw new Error('primary_hello received for an expired pairing code');
        }
        const finish = await (0, pairing_code_crypto_1.completeCompanionFinish)({
            pairingCode: pairingSession.pairingCode,
            wrappedPrimaryEphemeralPub: (0, helpers_1.decodeNodeContentUtf8OrBytes)(wrappedPrimaryNode.content, 'primary_hello.link_code_pairing_wrapped_primary_ephemeral_pub'),
            primaryIdentityPub: (0, helpers_1.decodeNodeContentUtf8OrBytes)(primaryIdentityNode.content, 'primary_hello.primary_identity_pub'),
            companionEphemeralPrivKey: pairingSession.companionEphemeralKeyPair.privKey,
            registrationIdentityKeyPair: credentials.registrationInfo.identityKeyPair
        });
        await this.opts.auth.updateCredentials({
            ...credentials,
            advSecretKey: finish.advSecret
        });
        const result = await this.opts.socket.query((0, pairing_1.buildCompanionFinishRequestNode)({
            phoneJid: pairingSession.phoneJid,
            wrappedKeyBundle: finish.wrappedKeyBundle,
            companionIdentityPublic: finish.companionIdentityPublic,
            ref
        }), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        if (result.attrs.type === constants_1.WA_IQ_TYPES.ERROR) {
            throw new Error('companion_finish returned error');
        }
        pairingSession.finished = true;
        this.opts.logger.debug('primary_hello completed with companion_finish success');
    }
    async rotateAdvSecret(credentials) {
        const nextCredentials = {
            ...credentials,
            advSecretKey: await (0, _crypto_1.randomBytesAsync)(32)
        };
        await this.opts.auth.updateCredentials(nextCredentials);
        return nextCredentials;
    }
    requireCredentials() {
        const credentials = this.opts.auth.getCredentials();
        if (!credentials) {
            throw new Error('credentials are not initialized');
        }
        return credentials;
    }
}
exports.WaPairingFlow = WaPairingFlow;
