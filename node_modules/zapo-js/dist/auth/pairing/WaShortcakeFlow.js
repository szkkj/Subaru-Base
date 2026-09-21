"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaShortcakeFlow = void 0;
const shortcake_crypto_1 = require("../pairing/shortcake-crypto");
const _crypto_1 = require("../../crypto");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const global_1 = require("../../transport/node/builders/global");
const shortcake_1 = require("../../transport/node/builders/shortcake");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
const bytes_1 = require("../../util/bytes");
/** HKDF info for the pairing handoff HMAC key (derived from the ADV secret). */
const HANDOFF_KEY_INFO = bytes_1.TEXT_ENCODER.encode('shortcake-passkey-handoff-v1');
const HANDOFF_KEY_TTL_MS = 5 * 60 * 1000;
const Stage = Object.freeze({
    Idle: 'idle',
    WaitingForPrimaryIdentity: 'waiting_for_primary_identity',
    WaitingForConfirmation: 'waiting_for_confirmation',
    WaitingForPairing: 'waiting_for_pairing'
});
/**
 * Drives the companion side of the WhatsApp "Shortcake" passkey-linking
 * handshake (the `xmlns="md"` IQ exchange + commit/reveal ECDH). It owns the
 * wire protocol and crypto only; the WebAuthn assertion and the registration
 * payload are injected by the caller.
 */
class WaShortcakeFlow {
    constructor(options) {
        this.opts = options;
        this.session = null;
        this.handoffKey = null;
    }
    hasSession() {
        return this.session !== null;
    }
    clearSession() {
        this.session = null;
        this.handoffKey = null;
    }
    /**
     * Runs the prologue: fetch the request options, obtain the WebAuthn
     * assertion (external), fetch the ref, build the companion ephemeral
     * identity + commitment, and send the `passkey_prologue` IQ.
     */
    async executePrologue(args = {}) {
        const deviceType = this.opts.deviceType ?? _proto_1.proto.DeviceProps.PlatformType.CHROME;
        const requestOptions = args.requestOptions ?? (await this.requestPasskeyRequestOptions());
        const assertion = await this.opts.signAssertion(requestOptions);
        const ref = await this.requestRef();
        const companion = await (0, shortcake_crypto_1.generateCompanionEphemeralIdentity)({ ref, deviceType });
        let pairingHandoffProof = args.pairingHandoffProof;
        const handoffKey = this.handoffKey;
        this.handoffKey = null;
        if (pairingHandoffProof === undefined &&
            handoffKey !== null &&
            Date.now() - handoffKey.ts < HANDOFF_KEY_TTL_MS) {
            pairingHandoffProof = (0, _crypto_1.hmacSha256Sign)(handoffKey.hmac, companion.prologuePayloadBytes);
        }
        const skipHandoffUx = pairingHandoffProof !== undefined;
        const response = await this.opts.socket.query((0, shortcake_1.buildSetPasskeyPrologueRequestNode)({
            credentialId: assertion.credentialId,
            webauthnAssertion: assertion.webauthnAssertion,
            prologuePayload: companion.prologuePayloadBytes,
            pairingHandoffProof
        }), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        (0, query_1.assertIqResult)(response, 'shortcake set-passkey-prologue');
        this.session = {
            companion,
            ref,
            deviceType,
            skipHandoffUx,
            stage: Stage.WaitingForPrimaryIdentity,
            encryptionKey: null,
            verificationCode: null
        };
        this.opts.logger.debug('shortcake prologue sent', { ref, skipHandoffUx });
        this.opts.callbacks?.emitPrologueSent?.();
    }
    /**
     * Routes the two server-pushed Shortcake notifications. Returns `true` when
     * the notification was a Shortcake one (and was consumed):
     * - `passkey_prologue_request` kicks the flow off (server forces passkey,
     *   often right after a pairing-code `companion_finish`); the WebAuthn
     *   options are usually embedded.
     * - `crsc_continuation` carries the primary's ephemeral identity.
     */
    async handleIncomingNotification(node) {
        if (node.attrs.type === constants_1.WA_NOTIFICATION_TYPES.PASSKEY_PROLOGUE_REQUEST) {
            return this.handlePasskeyPrologueRequest(node);
        }
        if (node.attrs.type === constants_1.WA_NOTIFICATION_TYPES.CRSC_CONTINUATION) {
            return this.handlePrimaryEphemeralIdentity(node);
        }
        return false;
    }
    async handlePasskeyPrologueRequest(node) {
        await this.ackNotification(node);
        await this.stashHandoffKeyAndRotateAdv();
        const optionsNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.PASSKEY_REQUEST_OPTIONS);
        const requestOptions = optionsNode
            ? (0, helpers_1.decodeNodeContentUtf8OrBytes)(optionsNode.content, 'shortcake.passkey_request_options')
            : undefined;
        this.opts.logger.debug('shortcake prologue requested by server', {
            embeddedOptions: optionsNode !== undefined
        });
        await this.executePrologue({ requestOptions });
        return true;
    }
    /**
     * Derives a pairing handoff HMAC key from the current ADV secret and rotates
     * the ADV secret (matching the official clients). The derived key signs the
     * next prologue's handoff proof; the rotated secret goes into the eventual
     * `PairingRequest`.
     */
    async stashHandoffKeyAndRotateAdv() {
        const credentials = this.opts.auth.getCredentials();
        if (!credentials) {
            return;
        }
        this.handoffKey = {
            hmac: (0, _crypto_1.hkdf)(credentials.advSecretKey, null, HANDOFF_KEY_INFO, 32),
            ts: Date.now()
        };
        await this.opts.auth.updateCredentials({
            ...credentials,
            advSecretKey: await (0, _crypto_1.randomBytesAsync)(32)
        });
    }
    async handlePrimaryEphemeralIdentity(node) {
        const child = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.PRIMARY_EPHEMERAL_IDENTITY);
        if (!child) {
            return false;
        }
        const session = this.session;
        if (!session || session.stage !== Stage.WaitingForPrimaryIdentity) {
            this.opts.logger.warn('shortcake primary identity ignored: no active prologue');
            await this.ackNotification(node);
            return true;
        }
        await this.ackNotification(node);
        const primary = (0, shortcake_crypto_1.decodePrimaryEphemeralIdentity)((0, helpers_1.decodeNodeContentUtf8OrBytes)(child.content, 'shortcake.primary_ephemeral_identity'));
        const nonceResponse = await this.opts.socket.query((0, shortcake_1.buildSetCompanionNonceRequestNode)(session.companion.companionNonce), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        (0, query_1.assertIqResult)(nonceResponse, 'shortcake set-companion-nonce');
        const verificationCode = (0, shortcake_crypto_1.deriveVerificationCode)(session.companion.companionNonce, primary);
        const encryptionKey = await (0, shortcake_crypto_1.deriveEncryptionKey)({
            companionPrivKey: session.companion.keyPair.privKey,
            primaryPublicKey: primary.publicKey,
            deviceType: session.deviceType,
            ref: session.ref
        });
        session.encryptionKey = encryptionKey;
        session.verificationCode = verificationCode;
        session.stage = Stage.WaitingForConfirmation;
        this.opts.logger.debug('shortcake verification code ready');
        this.opts.callbacks?.emitVerificationCode?.(verificationCode);
        await this.confirmVerificationCode();
        return true;
    }
    /** Current verification code, once derived. */
    getVerificationCode() {
        return this.session?.verificationCode ?? null;
    }
    /**
     * Confirms the verification code: builds + AES-GCM seals the pairing request
     * and sends the `encrypted_pairing_request` IQ.
     */
    async confirmVerificationCode() {
        const session = this.session;
        if (!session || session.stage !== Stage.WaitingForConfirmation || !session.encryptionKey) {
            throw new Error('shortcake: no verification code awaiting confirmation');
        }
        const credentials = this.opts.auth.getCredentials();
        if (!credentials) {
            throw new Error('shortcake: credentials are not initialized');
        }
        const plaintext = _proto_1.proto.PairingRequest.encode({
            companionPublicKey: credentials.noiseKeyPair.pubKey,
            companionIdentityKey: credentials.registrationInfo.identityKeyPair.pubKey,
            advSecret: credentials.advSecretKey
        }).finish();
        const envelope = await (0, shortcake_crypto_1.encryptPairingRequest)(session.encryptionKey, plaintext);
        const response = await this.opts.socket.query((0, shortcake_1.buildSetEncryptedPairingRequestRequestNode)(envelope), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        (0, query_1.assertIqResult)(response, 'shortcake set-encrypted-pairing-request');
        session.stage = Stage.WaitingForPairing;
        this.opts.logger.debug('shortcake encrypted pairing request sent');
    }
    async requestPasskeyRequestOptions() {
        const response = await this.opts.socket.query((0, shortcake_1.buildGetPasskeyRequestOptionsRequestNode)(), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        (0, query_1.assertIqResult)(response, 'shortcake get-passkey-request-options');
        const optionsNode = (0, helpers_1.findNodeChild)(response, constants_1.WA_NODE_TAGS.PASSKEY_REQUEST_OPTIONS);
        if (!optionsNode) {
            throw new Error('shortcake: get-passkey-request-options response missing options');
        }
        return (0, helpers_1.decodeNodeContentUtf8OrBytes)(optionsNode.content, 'shortcake.passkey_request_options');
    }
    async requestRef() {
        const response = await this.opts.socket.query((0, shortcake_1.buildShortcakeGetRefRequestNode)(), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        (0, query_1.assertIqResult)(response, 'shortcake get-ref');
        const refNode = (0, helpers_1.findNodeChild)(response, constants_1.WA_NODE_TAGS.REF);
        if (!refNode) {
            throw new Error('shortcake: get-ref response missing ref');
        }
        return bytes_1.TEXT_DECODER.decode((0, helpers_1.decodeNodeContentUtf8OrBytes)(refNode.content, 'shortcake.ref'));
    }
    async ackNotification(node) {
        await this.opts.socket.sendNode((0, global_1.buildAckNode)({ kind: 'notification', node }));
    }
}
exports.WaShortcakeFlow = WaShortcakeFlow;
