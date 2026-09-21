"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCompanionQr = parseCompanionQr;
exports.buildSignedKeyIndexList = buildSignedKeyIndexList;
exports.buildSignedCompanionIdentity = buildSignedCompanionIdentity;
exports.derivePemKey = derivePemKey;
exports.preparePrimaryHello = preparePrimaryHello;
exports.completePrimaryHandshake = completePrimaryHandshake;
const _crypto_1 = require("../../crypto");
const _proto_1 = require("../../proto");
const _protocol_1 = require("../../protocol");
const _signal_1 = require("../../signal");
const bytes_1 = require("../../util/bytes");
const PEM_HKDF_INFO = bytes_1.TEXT_ENCODER.encode('Canonical Ent Companion Nonce Encrypt');
const PBKDF2_ITERATIONS = 131072;
const PAIRING_AES_KEY_BYTES = 32;
/**
 * Parses a companion pairing QR of the form
 * `ref,noisePubB64,identityPubB64,advSecretB64,platform`. The `ref` may itself
 * contain commas, so the four trailing fields are taken from the end.
 *
 * @throws when fewer than 5 comma-separated fields are present.
 */
function parseCompanionQr(qr) {
    const parts = qr.split(',');
    if (parts.length < 5) {
        throw new Error(`companion qr must have at least 5 comma-separated parts, got ${parts.length}`);
    }
    const platform = parts[parts.length - 1];
    const advSecretB64 = parts[parts.length - 2];
    const identityPubB64 = parts[parts.length - 3];
    const noisePubB64 = parts[parts.length - 4];
    const ref = parts.slice(0, parts.length - 4).join(',');
    return {
        ref,
        noisePublicKey: (0, bytes_1.decodeBase64Url)(noisePubB64, 'companionQr.noisePublicKey'),
        identityPublicKey: (0, bytes_1.decodeBase64Url)(identityPubB64, 'companionQr.identityPublicKey'),
        advSecretKey: (0, bytes_1.decodeBase64Url)(advSecretB64, 'companionQr.advSecretKey'),
        platform
    };
}
/**
 * Builds the account-signed `ADVSignedKeyIndexList` bytes for the current device
 * set. The zero-valued `accountType` enum is omitted to match the phone's byte
 * layout.
 */
async function buildSignedKeyIndexList(input) {
    const details = _proto_1.proto.ADVKeyIndexList.encode({
        rawId: input.rawId,
        timestamp: input.timestampSeconds,
        currentIndex: input.currentIndex,
        validIndexes: [...input.validIndexes]
    }).finish();
    const accountSignature = await (0, _signal_1.signKeyIndexList)(details, input.accountIdentityKeyPair);
    return _proto_1.proto.ADVSignedKeyIndexList.encode({ details, accountSignature }).finish();
}
/**
 * Builds the signed device identity and key-index list for a linking companion.
 * The byte layout mirrors WhatsApp's phone (and the in-repo fake-server
 * reference): the zero-valued `accountType`/`deviceType` enum fields are omitted
 * so the signed `details` match what the companion verifies.
 */
async function buildSignedCompanionIdentity(input) {
    const accountSignatureKey = (0, _crypto_1.toRawPubKey)(input.accountIdentityKeyPair.pubKey);
    const details = _proto_1.proto.ADVDeviceIdentity.encode({
        rawId: input.rawId,
        timestamp: input.timestampSeconds,
        keyIndex: input.keyIndex
    }).finish();
    const accountSignature = await (0, _signal_1.generateDeviceIdentityAccountSignature)(details, input.companionIdentityPublicKey, input.accountIdentityKeyPair);
    const signedIdentity = _proto_1.proto.ADVSignedDeviceIdentity.encode({
        details,
        accountSignatureKey,
        accountSignature
    }).finish();
    const hmac = (0, _signal_1.computeAdvIdentityHmac)(input.advSecretKey, signedIdentity);
    const deviceIdentityBytes = _proto_1.proto.ADVSignedDeviceIdentityHMAC.encode({
        details: signedIdentity,
        hmac
    }).finish();
    const keyIndexListBytes = await buildSignedKeyIndexList({
        accountIdentityKeyPair: input.accountIdentityKeyPair,
        rawId: input.rawId,
        currentIndex: input.keyIndex,
        timestampSeconds: input.timestampSeconds,
        validIndexes: input.validIndexes
    });
    return { deviceIdentityBytes, keyIndexListBytes };
}
/**
 * Derives the `<pem>` AES-GCM key the phone ships in the pair-device upload:
 * `HKDF-SHA256(ikm = advSecret, salt = companionNoisePublicKey, info)`. Not yet
 * verified against a live server from this implementation; see
 * `CompanionHostOptions.includePem`.
 */
function derivePemKey(advSecretKey, companionNoisePublicKey) {
    return (0, _crypto_1.hkdf)(advSecretKey, companionNoisePublicKey, PEM_HKDF_INFO, 32);
}
/**
 * Link-code handshake, primary step 1: unwrap the companion ephemeral with the
 * pairing code, generate the primary ephemeral, compute the shared ECDH secret,
 * and wrap the primary ephemeral for the `primary_hello` stanza. Mirror of the
 * companion's `createCompanionHello` + primary-ephemeral unwrap.
 */
async function preparePrimaryHello(args) {
    if (args.wrappedCompanionEphemeralPub.length < 48) {
        throw new Error(`wrapped companion ephemeral pub too short: ${args.wrappedCompanionEphemeralPub.length} bytes (need >= 48)`);
    }
    const codeBytes = bytes_1.TEXT_ENCODER.encode(args.pairingCode);
    const companionCipherKey = await (0, _crypto_1.pbkdf2Sha256)(codeBytes, args.wrappedCompanionEphemeralPub.subarray(0, 32), PBKDF2_ITERATIONS, PAIRING_AES_KEY_BYTES);
    const companionEphemeralPub = (0, _crypto_1.aesCtrDecrypt)(companionCipherKey, args.wrappedCompanionEphemeralPub.subarray(32, 48), args.wrappedCompanionEphemeralPub.subarray(48));
    const [primaryEphemeralKeyPair, salt, counter] = await Promise.all([
        _crypto_1.X25519.generateKeyPair(),
        (0, _crypto_1.randomBytesAsync)(32),
        (0, _crypto_1.randomBytesAsync)(16)
    ]);
    const primaryCipherKey = await (0, _crypto_1.pbkdf2Sha256)(codeBytes, salt, PBKDF2_ITERATIONS, PAIRING_AES_KEY_BYTES);
    const encrypted = (0, _crypto_1.aesCtrEncrypt)(primaryCipherKey, counter, primaryEphemeralKeyPair.pubKey);
    const sharedEphemeral = await _crypto_1.X25519.scalarMult(primaryEphemeralKeyPair.privKey, companionEphemeralPub);
    return {
        primaryEphemeralKeyPair,
        wrappedPrimaryEphemeralPub: (0, bytes_1.concatBytes)([salt, counter, encrypted]),
        sharedEphemeral
    };
}
/**
 * Link-code handshake, primary step 2: decrypt the `companion_finish` key bundle
 * and derive the shared `advSecret` (byte-identical to what the companion
 * derives). Validates that the bundle binds both identities.
 *
 * @throws when the bundle's embedded identities do not match.
 */
async function completePrimaryHandshake(args) {
    const bundleEncryptionKey = (0, _crypto_1.hkdf)(args.sharedEphemeral, args.wrappedKeyBundle.subarray(0, 32), _protocol_1.WA_PAIRING_KDF_INFO.LINK_CODE_BUNDLE, 32);
    const plaintextBundle = (0, _crypto_1.aesGcmDecrypt)(bundleEncryptionKey, args.wrappedKeyBundle.subarray(32, 44), args.wrappedKeyBundle.subarray(44));
    const bundleCompanionIdentity = plaintextBundle.subarray(0, 32);
    const bundlePrimaryIdentity = plaintextBundle.subarray(32, 64);
    const bundleSecret = plaintextBundle.subarray(64);
    const rawCompanionIdentity = (0, _crypto_1.toRawPubKey)(args.companionIdentityPub);
    if (!(0, bytes_1.uint8Equal)(bundlePrimaryIdentity, (0, _crypto_1.toRawPubKey)(args.primaryIdentityKeyPair.pubKey))) {
        throw new Error('link-code bundle primary identity mismatch');
    }
    if (!(0, bytes_1.uint8Equal)(bundleCompanionIdentity, rawCompanionIdentity)) {
        throw new Error('link-code bundle companion identity mismatch');
    }
    const sharedIdentity = await _crypto_1.X25519.scalarMult(args.primaryIdentityKeyPair.privKey, rawCompanionIdentity);
    return (0, _crypto_1.hkdf)((0, bytes_1.concatBytes)([args.sharedEphemeral, sharedIdentity, bundleSecret]), null, _protocol_1.WA_PAIRING_KDF_INFO.ADV_SECRET, 32);
}
