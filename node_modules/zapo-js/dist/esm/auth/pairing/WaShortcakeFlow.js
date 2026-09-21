import { decodePrimaryEphemeralIdentity, deriveEncryptionKey, deriveVerificationCode, encryptPairingRequest, generateCompanionEphemeralIdentity } from '../pairing/shortcake-crypto.js';
import { hkdf, hmacSha256Sign, randomBytesAsync } from '../../crypto/index.js';
import { proto } from '../../proto.js';
import { WA_DEFAULTS, WA_NODE_TAGS, WA_NOTIFICATION_TYPES } from '../../protocol/constants.js';
import { buildAckNode } from '../../transport/node/builders/global.js';
import { buildGetPasskeyRequestOptionsRequestNode, buildSetCompanionNonceRequestNode, buildSetEncryptedPairingRequestRequestNode, buildSetPasskeyPrologueRequestNode, buildShortcakeGetRefRequestNode } from '../../transport/node/builders/shortcake.js';
import { decodeNodeContentUtf8OrBytes, findNodeChild } from '../../transport/node/helpers.js';
import { assertIqResult } from '../../transport/node/query.js';
import { TEXT_DECODER, TEXT_ENCODER } from '../../util/bytes.js';
/** HKDF info for the pairing handoff HMAC key (derived from the ADV secret). */
const HANDOFF_KEY_INFO = TEXT_ENCODER.encode('shortcake-passkey-handoff-v1');
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
export class WaShortcakeFlow {
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
        const deviceType = this.opts.deviceType ?? proto.DeviceProps.PlatformType.CHROME;
        const requestOptions = args.requestOptions ?? (await this.requestPasskeyRequestOptions());
        const assertion = await this.opts.signAssertion(requestOptions);
        const ref = await this.requestRef();
        const companion = await generateCompanionEphemeralIdentity({ ref, deviceType });
        let pairingHandoffProof = args.pairingHandoffProof;
        const handoffKey = this.handoffKey;
        this.handoffKey = null;
        if (pairingHandoffProof === undefined &&
            handoffKey !== null &&
            Date.now() - handoffKey.ts < HANDOFF_KEY_TTL_MS) {
            pairingHandoffProof = hmacSha256Sign(handoffKey.hmac, companion.prologuePayloadBytes);
        }
        const skipHandoffUx = pairingHandoffProof !== undefined;
        const response = await this.opts.socket.query(buildSetPasskeyPrologueRequestNode({
            credentialId: assertion.credentialId,
            webauthnAssertion: assertion.webauthnAssertion,
            prologuePayload: companion.prologuePayloadBytes,
            pairingHandoffProof
        }), WA_DEFAULTS.IQ_TIMEOUT_MS);
        assertIqResult(response, 'shortcake set-passkey-prologue');
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
        if (node.attrs.type === WA_NOTIFICATION_TYPES.PASSKEY_PROLOGUE_REQUEST) {
            return this.handlePasskeyPrologueRequest(node);
        }
        if (node.attrs.type === WA_NOTIFICATION_TYPES.CRSC_CONTINUATION) {
            return this.handlePrimaryEphemeralIdentity(node);
        }
        return false;
    }
    async handlePasskeyPrologueRequest(node) {
        await this.ackNotification(node);
        await this.stashHandoffKeyAndRotateAdv();
        const optionsNode = findNodeChild(node, WA_NODE_TAGS.PASSKEY_REQUEST_OPTIONS);
        const requestOptions = optionsNode
            ? decodeNodeContentUtf8OrBytes(optionsNode.content, 'shortcake.passkey_request_options')
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
            hmac: hkdf(credentials.advSecretKey, null, HANDOFF_KEY_INFO, 32),
            ts: Date.now()
        };
        await this.opts.auth.updateCredentials({
            ...credentials,
            advSecretKey: await randomBytesAsync(32)
        });
    }
    async handlePrimaryEphemeralIdentity(node) {
        const child = findNodeChild(node, WA_NODE_TAGS.PRIMARY_EPHEMERAL_IDENTITY);
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
        const primary = decodePrimaryEphemeralIdentity(decodeNodeContentUtf8OrBytes(child.content, 'shortcake.primary_ephemeral_identity'));
        const nonceResponse = await this.opts.socket.query(buildSetCompanionNonceRequestNode(session.companion.companionNonce), WA_DEFAULTS.IQ_TIMEOUT_MS);
        assertIqResult(nonceResponse, 'shortcake set-companion-nonce');
        const verificationCode = deriveVerificationCode(session.companion.companionNonce, primary);
        const encryptionKey = await deriveEncryptionKey({
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
        const plaintext = proto.PairingRequest.encode({
            companionPublicKey: credentials.noiseKeyPair.pubKey,
            companionIdentityKey: credentials.registrationInfo.identityKeyPair.pubKey,
            advSecret: credentials.advSecretKey
        }).finish();
        const envelope = await encryptPairingRequest(session.encryptionKey, plaintext);
        const response = await this.opts.socket.query(buildSetEncryptedPairingRequestRequestNode(envelope), WA_DEFAULTS.IQ_TIMEOUT_MS);
        assertIqResult(response, 'shortcake set-encrypted-pairing-request');
        session.stage = Stage.WaitingForPairing;
        this.opts.logger.debug('shortcake encrypted pairing request sent');
    }
    async requestPasskeyRequestOptions() {
        const response = await this.opts.socket.query(buildGetPasskeyRequestOptionsRequestNode(), WA_DEFAULTS.IQ_TIMEOUT_MS);
        assertIqResult(response, 'shortcake get-passkey-request-options');
        const optionsNode = findNodeChild(response, WA_NODE_TAGS.PASSKEY_REQUEST_OPTIONS);
        if (!optionsNode) {
            throw new Error('shortcake: get-passkey-request-options response missing options');
        }
        return decodeNodeContentUtf8OrBytes(optionsNode.content, 'shortcake.passkey_request_options');
    }
    async requestRef() {
        const response = await this.opts.socket.query(buildShortcakeGetRefRequestNode(), WA_DEFAULTS.IQ_TIMEOUT_MS);
        assertIqResult(response, 'shortcake get-ref');
        const refNode = findNodeChild(response, WA_NODE_TAGS.REF);
        if (!refNode) {
            throw new Error('shortcake: get-ref response missing ref');
        }
        return TEXT_DECODER.decode(decodeNodeContentUtf8OrBytes(refNode.content, 'shortcake.ref'));
    }
    async ackNotification(node) {
        await this.opts.socket.sendNode(buildAckNode({ kind: 'notification', node }));
    }
}
