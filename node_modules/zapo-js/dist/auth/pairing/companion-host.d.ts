import { type SignalKeyPair } from '../../crypto';
/**
 * `@sensitive` `advSecretKey` is companion secret material; consumers must not
 * persist it without encryption at rest.
 *
 * Fields decoded from a companion pairing QR string. The companion (the device
 * being linked) generates these; the primary consumes them to sign the device
 * identity. `advSecretKey` is the companion's secret, not the primary's.
 */
export interface ParsedCompanionQr {
    readonly ref: string;
    readonly noisePublicKey: Uint8Array;
    readonly identityPublicKey: Uint8Array;
    readonly advSecretKey: Uint8Array;
    readonly platform: string;
}
/**
 * Parses a companion pairing QR of the form
 * `ref,noisePubB64,identityPubB64,advSecretB64,platform`. The `ref` may itself
 * contain commas, so the four trailing fields are taken from the end.
 *
 * @throws when fewer than 5 comma-separated fields are present.
 */
export declare function parseCompanionQr(qr: string): ParsedCompanionQr;
/** `@sensitive` Carries the primary's `accountIdentityKeyPair` private key. */
export interface BuildSignedKeyIndexListInput {
    readonly accountIdentityKeyPair: SignalKeyPair;
    readonly rawId: number;
    readonly currentIndex: number;
    readonly timestampSeconds: number;
    readonly validIndexes: readonly number[];
}
/**
 * Builds the account-signed `ADVSignedKeyIndexList` bytes for the current device
 * set. The zero-valued `accountType` enum is omitted to match the phone's byte
 * layout.
 */
export declare function buildSignedKeyIndexList(input: BuildSignedKeyIndexListInput): Promise<Uint8Array>;
/**
 * `@sensitive` Carries the primary's `accountIdentityKeyPair` private key and the
 * companion's `advSecretKey`; do not persist unencrypted.
 */
export interface BuildSignedCompanionIdentityInput {
    readonly accountIdentityKeyPair: SignalKeyPair;
    readonly companionIdentityPublicKey: Uint8Array;
    readonly advSecretKey: Uint8Array;
    readonly rawId: number;
    readonly keyIndex: number;
    readonly timestampSeconds: number;
    readonly validIndexes: readonly number[];
}
export interface SignedCompanionIdentity {
    /** `ADVSignedDeviceIdentityHMAC` bytes for the `<device-identity>` node. */
    readonly deviceIdentityBytes: Uint8Array;
    /** `ADVSignedKeyIndexList` bytes for the `<key-index-list>` node. */
    readonly keyIndexListBytes: Uint8Array;
}
/**
 * Builds the signed device identity and key-index list for a linking companion.
 * The byte layout mirrors WhatsApp's phone (and the in-repo fake-server
 * reference): the zero-valued `accountType`/`deviceType` enum fields are omitted
 * so the signed `details` match what the companion verifies.
 */
export declare function buildSignedCompanionIdentity(input: BuildSignedCompanionIdentityInput): Promise<SignedCompanionIdentity>;
/**
 * Derives the `<pem>` AES-GCM key the phone ships in the pair-device upload:
 * `HKDF-SHA256(ikm = advSecret, salt = companionNoisePublicKey, info)`. Not yet
 * verified against a live server from this implementation; see
 * `CompanionHostOptions.includePem`.
 */
export declare function derivePemKey(advSecretKey: Uint8Array, companionNoisePublicKey: Uint8Array): Uint8Array;
/**
 * `@sensitive` Holds the `primaryEphemeralKeyPair` private key and the derived
 * `sharedEphemeral`; keep in memory only, never persist unencrypted.
 */
export interface LinkCodePrimaryHello {
    readonly primaryEphemeralKeyPair: SignalKeyPair;
    /** `salt(32) || counter(16) || AES-CTR(primaryEphemeralPub)` for `primary_hello`. */
    readonly wrappedPrimaryEphemeralPub: Uint8Array;
    /** ECDH(primaryEphemeralPriv, companionEphemeralPub); stashed for the finish step. */
    readonly sharedEphemeral: Uint8Array;
}
/**
 * Link-code handshake, primary step 1: unwrap the companion ephemeral with the
 * pairing code, generate the primary ephemeral, compute the shared ECDH secret,
 * and wrap the primary ephemeral for the `primary_hello` stanza. Mirror of the
 * companion's `createCompanionHello` + primary-ephemeral unwrap.
 */
export declare function preparePrimaryHello(args: {
    readonly pairingCode: string;
    readonly wrappedCompanionEphemeralPub: Uint8Array;
}): Promise<LinkCodePrimaryHello>;
/**
 * Link-code handshake, primary step 2: decrypt the `companion_finish` key bundle
 * and derive the shared `advSecret` (byte-identical to what the companion
 * derives). Validates that the bundle binds both identities.
 *
 * @throws when the bundle's embedded identities do not match.
 */
export declare function completePrimaryHandshake(args: {
    readonly sharedEphemeral: Uint8Array;
    readonly wrappedKeyBundle: Uint8Array;
    readonly companionIdentityPub: Uint8Array;
    readonly primaryIdentityKeyPair: SignalKeyPair;
}): Promise<Uint8Array>;
