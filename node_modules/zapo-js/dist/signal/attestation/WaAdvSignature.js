"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE = exports.ADV_PREFIX_DEVICE_SIGNATURE = exports.ADV_PREFIX_ACCOUNT_SIGNATURE = exports.ADV_PREFIX_ACCOUNT_KEY_INDEX = void 0;
exports.verifyDeviceIdentityAccountSignature = verifyDeviceIdentityAccountSignature;
exports.generateDeviceSignature = generateDeviceSignature;
exports.computeAdvIdentityHmac = computeAdvIdentityHmac;
exports.generateDeviceIdentityAccountSignature = generateDeviceIdentityAccountSignature;
exports.verifyDeviceSignature = verifyDeviceSignature;
exports.signKeyIndexList = signKeyIndexList;
exports.verifyKeyIndexListSignature = verifyKeyIndexListSignature;
const _crypto_1 = require("../../crypto");
const constants_1 = require("../attestation/constants");
const bytes_1 = require("../../util/bytes");
var constants_2 = require("../attestation/constants");
Object.defineProperty(exports, "ADV_PREFIX_ACCOUNT_KEY_INDEX", { enumerable: true, get: function () { return constants_2.ADV_PREFIX_ACCOUNT_KEY_INDEX; } });
Object.defineProperty(exports, "ADV_PREFIX_ACCOUNT_SIGNATURE", { enumerable: true, get: function () { return constants_2.ADV_PREFIX_ACCOUNT_SIGNATURE; } });
Object.defineProperty(exports, "ADV_PREFIX_DEVICE_SIGNATURE", { enumerable: true, get: function () { return constants_2.ADV_PREFIX_DEVICE_SIGNATURE; } });
Object.defineProperty(exports, "ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE", { enumerable: true, get: function () { return constants_2.ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE; } });
/**
 * Companion-side check that the primary's account key signed a device identity.
 * Verifies `accountSignature` over `prefix || details || identityPublicKey`
 * against the account signature public key. Inverse of
 * {@link generateDeviceIdentityAccountSignature}.
 */
async function verifyDeviceIdentityAccountSignature(details, accountSignature, identityPublicKey, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? constants_1.ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE : constants_1.ADV_PREFIX_ACCOUNT_SIGNATURE;
    const message = (0, bytes_1.concatBytes)([prefix, details, identityPublicKey]);
    return (0, _crypto_1.xeddsaVerify)((0, _crypto_1.toRawPubKey)(accountSignatureKey), message, accountSignature);
}
/**
 * Companion-side signature proving possession of the identity private key after
 * adopting a primary-signed identity. Signs
 * `prefix || details || identityKeyPair.pubKey || accountSignatureKey`, and is
 * verified by the primary via {@link verifyDeviceSignature}.
 */
async function generateDeviceSignature(details, identityKeyPair, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? constants_1.ADV_PREFIX_HOSTED_DEVICE_SIGNATURE : constants_1.ADV_PREFIX_DEVICE_SIGNATURE;
    const message = (0, bytes_1.concatBytes)([prefix, details, identityKeyPair.pubKey, accountSignatureKey]);
    return (0, _crypto_1.xeddsaSign)(identityKeyPair.privKey, message);
}
/**
 * HMAC-SHA256 over an `ADVSignedDeviceIdentity` (or hosted-prefixed variant)
 * keyed by the shared ADV secret, binding the signed identity to the pairing
 * secret inside `ADVSignedDeviceIdentityHMAC`.
 */
function computeAdvIdentityHmac(secretKey, details) {
    return (0, _crypto_1.hmacSha256Sign)(secretKey, details);
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
async function generateDeviceIdentityAccountSignature(details, companionIdentityPublicKey, accountIdentityKeyPair, isHosted = false) {
    const prefix = isHosted ? constants_1.ADV_PREFIX_HOSTED_ACCOUNT_SIGNATURE : constants_1.ADV_PREFIX_ACCOUNT_SIGNATURE;
    const message = (0, bytes_1.concatBytes)([prefix, details, companionIdentityPublicKey]);
    return (0, _crypto_1.xeddsaSign)(accountIdentityKeyPair.privKey, message);
}
/**
 * Primary-side counterpart to {@link generateDeviceSignature}. Verifies the
 * device signature a companion returns after adopting a signed identity, which
 * proves the companion holds the identity private key it registered. The signed
 * message is `prefix || details || companionIdentityPublicKey || accountSignatureKey`.
 */
async function verifyDeviceSignature(details, deviceSignature, companionIdentityPublicKey, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? constants_1.ADV_PREFIX_HOSTED_DEVICE_SIGNATURE : constants_1.ADV_PREFIX_DEVICE_SIGNATURE;
    const message = (0, bytes_1.concatBytes)([prefix, details, companionIdentityPublicKey, accountSignatureKey]);
    return (0, _crypto_1.xeddsaVerify)((0, _crypto_1.toRawPubKey)(companionIdentityPublicKey), message, deviceSignature);
}
/**
 * Signs an `ADVKeyIndexList` details blob with the account (primary) identity
 * key. A primary republishes this list whenever its companion set changes so
 * every device can validate the current set of key indexes. The signed message
 * is `prefix || keyIndexListDetails`.
 */
async function signKeyIndexList(keyIndexListDetails, accountIdentityKeyPair, isHosted = false) {
    const prefix = isHosted ? constants_1.ADV_PREFIX_HOSTED_ACCOUNT_KEY_INDEX : constants_1.ADV_PREFIX_ACCOUNT_KEY_INDEX;
    const message = (0, bytes_1.concatBytes)([prefix, keyIndexListDetails]);
    return (0, _crypto_1.xeddsaSign)(accountIdentityKeyPair.privKey, message);
}
/**
 * Verifies an `ADVSignedKeyIndexList` account signature against the primary's
 * account signature key. Inverse of {@link signKeyIndexList}; used by a device
 * to validate a key-index list published by the primary.
 */
async function verifyKeyIndexListSignature(keyIndexListDetails, accountSignature, accountSignatureKey, isHosted = false) {
    const prefix = isHosted ? constants_1.ADV_PREFIX_HOSTED_ACCOUNT_KEY_INDEX : constants_1.ADV_PREFIX_ACCOUNT_KEY_INDEX;
    const message = (0, bytes_1.concatBytes)([prefix, keyIndexListDetails]);
    return (0, _crypto_1.xeddsaVerify)((0, _crypto_1.toRawPubKey)(accountSignatureKey), message, accountSignature);
}
