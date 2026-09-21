import type { SignalKeyPair } from '../../crypto/curves/types';
export { ADV_PREFIX_ACCOUNT_KEY_INDEX, ADV_PREFIX_ACCOUNT_SIGNATURE, ADV_PREFIX_DEVICE_SIGNATURE, ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE } from '../attestation/constants';
/**
 * Companion-side check that the primary's account key signed a device identity.
 * Verifies `accountSignature` over `prefix || details || identityPublicKey`
 * against the account signature public key. Inverse of
 * {@link generateDeviceIdentityAccountSignature}.
 */
export declare function verifyDeviceIdentityAccountSignature(details: Uint8Array, accountSignature: Uint8Array, identityPublicKey: Uint8Array, accountSignatureKey: Uint8Array, isHosted?: boolean): Promise<boolean>;
/**
 * Companion-side signature proving possession of the identity private key after
 * adopting a primary-signed identity. Signs
 * `prefix || details || identityKeyPair.pubKey || accountSignatureKey`, and is
 * verified by the primary via {@link verifyDeviceSignature}.
 */
export declare function generateDeviceSignature(details: Uint8Array, identityKeyPair: SignalKeyPair, accountSignatureKey: Uint8Array, isHosted?: boolean): Promise<Uint8Array>;
/**
 * HMAC-SHA256 over an `ADVSignedDeviceIdentity` (or hosted-prefixed variant)
 * keyed by the shared ADV secret, binding the signed identity to the pairing
 * secret inside `ADVSignedDeviceIdentityHMAC`.
 */
export declare function computeAdvIdentityHmac(secretKey: Uint8Array, details: Uint8Array): Uint8Array;
/**
 * Primary-side counterpart to {@link verifyDeviceIdentityAccountSignature}.
 * Signs a companion's `ADVDeviceIdentity` details with the account (primary)
 * identity key so a linking companion can prove the primary authorized this
 * device. The signed message is `prefix || details || companionIdentityPublicKey`.
 *
 * `accountIdentityKeyPair` is the primary's own Signal identity key pair; its
 * public half is what ships as `ADVSignedDeviceIdentity.accountSignatureKey`.
 * Pass `companionIdentityPublicKey` in the exact byte form the companion will
 * present at verification (the value carried in its pairing QR / key bundle).
 */
export declare function generateDeviceIdentityAccountSignature(details: Uint8Array, companionIdentityPublicKey: Uint8Array, accountIdentityKeyPair: SignalKeyPair, isHosted?: boolean): Promise<Uint8Array>;
/**
 * Primary-side counterpart to {@link generateDeviceSignature}. Verifies the
 * device signature a companion returns after adopting a signed identity, which
 * proves the companion holds the identity private key it registered. The signed
 * message is `prefix || details || companionIdentityPublicKey || accountSignatureKey`.
 */
export declare function verifyDeviceSignature(details: Uint8Array, deviceSignature: Uint8Array, companionIdentityPublicKey: Uint8Array, accountSignatureKey: Uint8Array, isHosted?: boolean): Promise<boolean>;
/**
 * Signs an `ADVKeyIndexList` details blob with the account (primary) identity
 * key. A primary republishes this list whenever its companion set changes so
 * every device can validate the current set of key indexes. The signed message
 * is `prefix || keyIndexListDetails`.
 */
export declare function signKeyIndexList(keyIndexListDetails: Uint8Array, accountIdentityKeyPair: SignalKeyPair, isHosted?: boolean): Promise<Uint8Array>;
/**
 * Verifies an `ADVSignedKeyIndexList` account signature against the primary's
 * account signature key. Inverse of {@link signKeyIndexList}; used by a device
 * to validate a key-index list published by the primary.
 */
export declare function verifyKeyIndexListSignature(keyIndexListDetails: Uint8Array, accountSignature: Uint8Array, accountSignatureKey: Uint8Array, isHosted?: boolean): Promise<boolean>;
