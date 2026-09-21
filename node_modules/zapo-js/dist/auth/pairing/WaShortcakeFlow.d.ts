import type { WaAuthCredentials } from '../types';
import type { Logger } from '../../infra/log/types';
import { proto } from '../../proto';
import type { BinaryNode } from '../../transport/types';
/**
 * Externally-provided WebAuthn assertion. The passkey/credential source lives
 * OUTSIDE the protocol layer – the caller signs the server's request options
 * however it likes (real authenticator, virtual authenticator, relay…) and
 * hands back the raw assertion + credential id.
 */
export type WaShortcakeAssertionSigner = (requestOptions: Uint8Array) => Promise<{
    readonly credentialId: Uint8Array;
    readonly webauthnAssertion: Uint8Array;
}>;
export interface WaShortcakeFlowOptions {
    readonly logger: Logger;
    readonly socket: {
        readonly sendNode: (node: BinaryNode) => Promise<void>;
        readonly query: (node: BinaryNode, timeoutMs: number) => Promise<BinaryNode>;
    };
    /** WebAuthn signer (passkey assertion) – external, keeps credentials out of the protocol. */
    readonly signAssertion: WaShortcakeAssertionSigner;
    /**
     * Companion credentials access. The pairing-request payload (`PairingRequest`:
     * noise static + identity pubkey + ADV secret) is built internally from
     * these; the ADV secret is also rotated on a prologue request (matching the
     * official clients), so an updater is required.
     */
    readonly auth: {
        readonly getCredentials: () => WaAuthCredentials | null;
        readonly updateCredentials: (credentials: WaAuthCredentials) => Promise<void>;
    };
    /** Companion platform reported in the ephemeral identity. */
    readonly deviceType?: proto.DeviceProps.PlatformType;
    /** Optional internal observability hooks. */
    readonly callbacks?: {
        /** Verification code derived after the primary replies. */
        readonly emitVerificationCode?: (code: string) => void;
        /** Prologue accepted by the server; now waiting for the primary. */
        readonly emitPrologueSent?: () => void;
    };
}
/**
 * Drives the companion side of the WhatsApp "Shortcake" passkey-linking
 * handshake (the `xmlns="md"` IQ exchange + commit/reveal ECDH). It owns the
 * wire protocol and crypto only; the WebAuthn assertion and the registration
 * payload are injected by the caller.
 */
export declare class WaShortcakeFlow {
    private readonly opts;
    private session;
    private handoffKey;
    constructor(options: WaShortcakeFlowOptions);
    hasSession(): boolean;
    clearSession(): void;
    /**
     * Runs the prologue: fetch the request options, obtain the WebAuthn
     * assertion (external), fetch the ref, build the companion ephemeral
     * identity + commitment, and send the `passkey_prologue` IQ.
     */
    executePrologue(args?: {
        readonly requestOptions?: Uint8Array;
        readonly pairingHandoffProof?: Uint8Array;
    }): Promise<void>;
    /**
     * Routes the two server-pushed Shortcake notifications. Returns `true` when
     * the notification was a Shortcake one (and was consumed):
     * - `passkey_prologue_request` kicks the flow off (server forces passkey,
     *   often right after a pairing-code `companion_finish`); the WebAuthn
     *   options are usually embedded.
     * - `crsc_continuation` carries the primary's ephemeral identity.
     */
    handleIncomingNotification(node: BinaryNode): Promise<boolean>;
    private handlePasskeyPrologueRequest;
    /**
     * Derives a pairing handoff HMAC key from the current ADV secret and rotates
     * the ADV secret (matching the official clients). The derived key signs the
     * next prologue's handoff proof; the rotated secret goes into the eventual
     * `PairingRequest`.
     */
    private stashHandoffKeyAndRotateAdv;
    private handlePrimaryEphemeralIdentity;
    /** Current verification code, once derived. */
    getVerificationCode(): string | null;
    /**
     * Confirms the verification code: builds + AES-GCM seals the pairing request
     * and sends the `encrypted_pairing_request` IQ.
     */
    confirmVerificationCode(): Promise<void>;
    private requestPasskeyRequestOptions;
    private requestRef;
    private ackNotification;
}
