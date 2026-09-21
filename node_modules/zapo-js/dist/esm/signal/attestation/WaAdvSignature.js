import { hmacSha256Sign, toRawPubKey, xeddsaSign, xeddsaVerify } from '../../crypto/index.js';
import { ADV_PREFIX_ACCOUNT_KEY_INDEX, ADV_PREFIX_ACCOUNT_SIGNATURE, ADV_PREFIX_DEVICE_SIGNATURE, ADV_PREFIX_HOSTED_ACCOUNT_KEY_INDEX, ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE, ADV_PREFIX_HOSTED_DEVICE_SIGNATURE } from '../attestation/constants.js';
import { concatBytes } from '../../util/bytes.js';
export { ADV_PREFIX_ACCOUNT_KEY_INDEX, ADV_PREFIX_ACCOUNT_SIGNATURE, ADV_PREFIX_DEVICE_SIGNATURE, ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE } from '../attestation/constants.js';
/**
 * Companion-side check that the primary's account key signed a device identity.
 * Verifies `accountSignature` over `prefix || details || identityPublicKey`
 * against the account signature public key. Inverse of
 * {@link generateDeviceIdentityAccountSignature}.
 */
export async function verifyDeviceIdentityAccountSignature(details, accountSignature, identityPublicKey, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE : ADV_PREFIX_ACCOUNT_SIGNATURE;
    const message = concatBytes([prefix, details, identityPublicKey]);
    return xeddsaVerify(toRawPubKey(accountSignatureKey), message, accountSignature);
}
/**
 * Companion-side signature proving possession of the identity private key after
 * adopting a primary-signed identity. Signs
 * `prefix || details || identityKeyPair.pubKey || accountSignatureKey`, and is
 * verified by the primary via {@link verifyDeviceSignature}.
 */
export async function generateDeviceSignature(details, identityKeyPair, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? ADV_PREFIX_HOSTED_DEVICE_SIGNATURE : ADV_PREFIX_DEVICE_SIGNATURE;
    const message = concatBytes([prefix, details, identityKeyPair.pubKey, accountSignatureKey]);
    return xeddsaSign(identityKeyPair.privKey, message);
}
/**
 * HMAC-SHA256 over an `ADVSignedDeviceIdentity` (or hosted-prefixed variant)
 * keyed by the shared ADV secret, binding the signed identity to the pairing
 * secret inside `ADVSignedDeviceIdentityHMAC`.
 */
export function computeAdvIdentityHmac(secretKey, details) {
    return hmacSha256Sign(secretKey, details);
}
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
export async function generateDeviceIdentityAccountSignature(details, companionIdentityPublicKey, accountIdentityKeyPair, isHosted = false) {
    const prefix = isHosted ? ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE : ADV_PREFIX_ACCOUNT_SIGNATURE;
    const message = concatBytes([prefix, details, companionIdentityPublicKey]);
    return xeddsaSign(accountIdentityKeyPair.privKey, message);
}
/**
 * Primary-side counterpart to {@link generateDeviceSignature}. Verifies the
 * device signature a companion returns after adopting a signed identity, which
 * proves the companion holds the identity private key it registered. The signed
 * message is `prefix || details || companionIdentityPublicKey || accountSignatureKey`.
 */
export async function verifyDeviceSignature(details, deviceSignature, companionIdentityPublicKey, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? ADV_PREFIX_HOSTED_DEVICE_SIGNATURE : ADV_PREFIX_DEVICE_SIGNATURE;
    const message = concatBytes([prefix, details, companionIdentityPublicKey, accountSignatureKey]);
    return xeddsaVerify(toRawPubKey(companionIdentityPublicKey), message, deviceSignature);
}
/**
 * Signs an `ADVKeyIndexList` details blob with the account (primary) identity
 * key. A primary republishes this list whenever its companion set changes so
 * every device can validate the current set of key indexes. The signed message
 * is `prefix || keyIndexListDetails`.
 */
export async function signKeyIndexList(keyIndexListDetails, accountIdentityKeyPair, isHosted = false) {
    const prefix = isHosted ? ADV_PREFIX_HOSTED_ACCOUNT_KEY_INDEX : ADV_PREFIX_ACCOUNT_KEY_INDEX;
    const message = concatBytes([prefix, keyIndexListDetails]);
    return xeddsaSign(accountIdentityKeyPair.privKey, message);
}
/**
 * Verifies an `ADVSignedKeyIndexList` account signature against the primary's
 * account signature key. Inverse of {@link signKeyIndexList}; used by a device
 * to validate a key-index list published by the primary.
 */
export async function verifyKeyIndexListSignature(keyIndexListDetails, accountSignature, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? ADV_PREFIX_HOSTED_ACCOUNT_KEY_INDEX : ADV_PREFIX_ACCOUNT_KEY_INDEX;
    const message = concatBytes([prefix, keyIndexListDetails]);
    return xeddsaVerify(toRawPubKey(accountSignatureKey), message, accountSignature);
}
