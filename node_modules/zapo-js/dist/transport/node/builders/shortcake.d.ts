import type { BinaryNode } from '../../types';
/** `<iq type="get" xmlns="md"><passkey_request_options/></iq>` */
export declare function buildGetPasskeyRequestOptionsRequestNode(): BinaryNode;
/** `<iq type="get" xmlns="md"><ref/></iq>` */
export declare function buildShortcakeGetRefRequestNode(): BinaryNode;
/**
 * `<iq type="set" xmlns="md"><passkey_prologue><credential_id/><webauthn_assertion/>`
 * `<prologue_payload/>[<pairing_handoff_proof/>]</passkey_prologue></iq>`
 */
export declare function buildSetPasskeyPrologueRequestNode(args: {
    readonly credentialId: Uint8Array;
    readonly webauthnAssertion: Uint8Array;
    readonly prologuePayload: Uint8Array;
    readonly pairingHandoffProof?: Uint8Array;
}): BinaryNode;
/** `<iq type="set" xmlns="md"><companion_nonce/></iq>` */
export declare function buildSetCompanionNonceRequestNode(companionNonce: Uint8Array): BinaryNode;
/** `<iq type="set" xmlns="md"><encrypted_pairing_request/></iq>` */
export declare function buildSetEncryptedPairingRequestRequestNode(encryptedPairingRequest: Uint8Array): BinaryNode;
