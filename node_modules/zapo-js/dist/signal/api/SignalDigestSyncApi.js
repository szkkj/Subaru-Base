"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalDigestSyncApi = void 0;
const _crypto_1 = require("../../crypto");
const keys_1 = require("../../crypto/core/keys");
const constants_1 = require("../../protocol/constants");
const codec_1 = require("../api/codec");
const constants_2 = require("../api/constants");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
const bytes_1 = require("../../util/bytes");
/**
 * Validates the local Signal key bundle (identity, signed prekey, one-time
 * prekey ids) against the server-side digest. Used to detect drift after a
 * crash or partial sync and decide whether to re-upload.
 */
class SignalDigestSyncApi {
    constructor(options) {
        this.logger = options.logger;
        this.query = options.query;
        this.signalStore = options.signalStore;
        this.preKeyStore = options.preKeyStore;
        this.defaultTimeoutMs =
            options.defaultTimeoutMs ?? constants_1.WA_DEFAULTS.SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS;
        this.hostDomain = options.hostDomain ?? constants_1.WA_DEFAULTS.HOST_DOMAIN;
    }
    async validateLocalKeyBundle(prefetchedOrTimeout, timeoutMs = this.defaultTimeoutMs) {
        const prefetched = typeof prefetchedOrTimeout === 'number' ? undefined : prefetchedOrTimeout;
        const effectiveTimeoutMs = typeof prefetchedOrTimeout === 'number' ? prefetchedOrTimeout : timeoutMs;
        this.logger.debug('signal digest query request', { timeoutMs: effectiveTimeoutMs });
        const response = await this.query({
            tag: constants_1.WA_NODE_TAGS.IQ,
            attrs: {
                type: constants_1.WA_IQ_TYPES.GET,
                xmlns: constants_1.WA_XMLNS.SIGNAL,
                to: this.hostDomain
            },
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.DIGEST,
                    attrs: {}
                }
            ]
        }, effectiveTimeoutMs);
        if (response.tag !== constants_1.WA_NODE_TAGS.IQ) {
            throw new Error(`invalid signal digest response tag: ${response.tag}`);
        }
        if (response.attrs.type === constants_1.WA_IQ_TYPES.ERROR) {
            const error = (0, query_1.parseIqError)(response);
            if (error.numericCode === 404 || error.code === '404') {
                return {
                    valid: false,
                    shouldReupload: true,
                    reason: 'missing_remote_digest',
                    preKeyCount: 0
                };
            }
            throw new Error(`signal digest iq failed (${error.code}: ${error.text})`);
        }
        if (response.attrs.type !== constants_1.WA_IQ_TYPES.RESULT) {
            throw new Error(`invalid signal digest response type: ${response.attrs.type ?? 'unknown'}`);
        }
        const digest = this.parseDigestPayload(response);
        const expectedType = constants_2.SIGNAL_KEY_BUNDLE_TYPE_BYTES[0];
        if (digest.keyBundleType !== expectedType) {
            return {
                valid: false,
                shouldReupload: false,
                reason: 'unsupported_key_bundle_type',
                preKeyCount: digest.preKeyIds.length
            };
        }
        const [registrationInfo, signedPreKey] = prefetched
            ? [prefetched.registrationInfo, prefetched.signedPreKey]
            : await Promise.all([
                this.signalStore.getRegistrationInfo(),
                this.signalStore.getSignedPreKey()
            ]);
        if (!registrationInfo || !signedPreKey) {
            return {
                valid: false,
                shouldReupload: false,
                reason: 'missing_local_state',
                preKeyCount: digest.preKeyIds.length
            };
        }
        if (registrationInfo.registrationId !== digest.registrationId) {
            return {
                valid: false,
                shouldReupload: true,
                reason: 'registration_mismatch',
                preKeyCount: digest.preKeyIds.length
            };
        }
        if (!(0, bytes_1.uint8Equal)((0, keys_1.toRawPubKey)(registrationInfo.identityKeyPair.pubKey), (0, keys_1.toRawPubKey)(digest.identity))) {
            return {
                valid: false,
                shouldReupload: true,
                reason: 'identity_mismatch',
                preKeyCount: digest.preKeyIds.length
            };
        }
        if (signedPreKey.keyId !== digest.signedKey.id ||
            !(0, bytes_1.uint8Equal)((0, keys_1.toRawPubKey)(signedPreKey.keyPair.pubKey), (0, keys_1.toRawPubKey)(digest.signedKey.publicKey)) ||
            !(0, bytes_1.uint8Equal)(signedPreKey.signature, digest.signedKey.signature)) {
            return {
                valid: false,
                shouldReupload: true,
                reason: 'signed_prekey_mismatch',
                preKeyCount: digest.preKeyIds.length
            };
        }
        const preKeys = await this.preKeyStore.getPreKeysById(digest.preKeyIds);
        const bytesToHash = [
            (0, keys_1.toRawPubKey)(registrationInfo.identityKeyPair.pubKey),
            (0, keys_1.toRawPubKey)(signedPreKey.keyPair.pubKey),
            signedPreKey.signature
        ];
        for (let index = 0; index < preKeys.length; index += 1) {
            const preKey = preKeys[index];
            if (!preKey) {
                return {
                    valid: false,
                    shouldReupload: true,
                    reason: 'missing_local_prekey',
                    preKeyCount: digest.preKeyIds.length
                };
            }
            bytesToHash.push((0, keys_1.toRawPubKey)(preKey.keyPair.pubKey));
        }
        const localHash = (0, _crypto_1.sha1)(bytesToHash).subarray(0, digest.hash.byteLength);
        if (!(0, bytes_1.uint8Equal)(localHash, digest.hash)) {
            return {
                valid: false,
                shouldReupload: true,
                reason: 'hash_mismatch',
                preKeyCount: digest.preKeyIds.length
            };
        }
        return {
            valid: true,
            shouldReupload: false,
            reason: 'ok',
            preKeyCount: digest.preKeyIds.length
        };
    }
    parseDigestPayload(node) {
        const digestNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.DIGEST);
        if (!digestNode) {
            throw new Error('signal digest response missing digest node');
        }
        const registrationNode = (0, helpers_1.findNodeChild)(digestNode, constants_1.WA_NODE_TAGS.REGISTRATION);
        const typeNode = (0, helpers_1.findNodeChild)(digestNode, constants_1.WA_NODE_TAGS.TYPE);
        const identityNode = (0, helpers_1.findNodeChild)(digestNode, constants_1.WA_NODE_TAGS.IDENTITY);
        const signedKeyNode = (0, helpers_1.findNodeChild)(digestNode, constants_1.WA_NODE_TAGS.SKEY);
        const listNode = (0, helpers_1.findNodeChild)(digestNode, constants_1.WA_NODE_TAGS.LIST);
        const hashNode = (0, helpers_1.findNodeChild)(digestNode, constants_1.WA_NODE_TAGS.HASH);
        if (!registrationNode ||
            !typeNode ||
            !identityNode ||
            !signedKeyNode ||
            !listNode ||
            !hashNode) {
            throw new Error('signal digest response is incomplete');
        }
        const signedKeyIdNode = (0, helpers_1.findNodeChild)(signedKeyNode, constants_1.WA_NODE_TAGS.ID);
        const signedKeyValueNode = (0, helpers_1.findNodeChild)(signedKeyNode, constants_1.WA_NODE_TAGS.VALUE);
        const signedKeySignatureNode = (0, helpers_1.findNodeChild)(signedKeyNode, constants_1.WA_NODE_TAGS.SIGNATURE);
        if (!signedKeyIdNode || !signedKeyValueNode || !signedKeySignatureNode) {
            throw new Error('signal digest response signed pre-key is incomplete');
        }
        const registrationId = (0, codec_1.parseUint)((0, codec_1.decodeExactLength)(registrationNode.content, 'signal digest registration', constants_2.SIGNAL_REGISTRATION_ID_LENGTH), 'signal digest registration');
        const keyBundleType = (0, codec_1.parseUint)((0, codec_1.decodeExactLength)(typeNode.content, 'signal digest type', constants_2.SIGNAL_KEY_BUNDLE_TYPE_LENGTH), 'signal digest type');
        const identity = (0, codec_1.decodeExactLength)(identityNode.content, 'signal digest identity', constants_2.SIGNAL_KEY_DATA_LENGTH);
        const signedKeyId = (0, codec_1.parseUint)((0, codec_1.decodeExactLength)(signedKeyIdNode.content, 'signal digest skey.id', constants_2.SIGNAL_KEY_ID_LENGTH), 'signal digest skey.id');
        const signedKeyPublicKey = (0, codec_1.decodeExactLength)(signedKeyValueNode.content, 'signal digest skey.value', constants_2.SIGNAL_KEY_DATA_LENGTH);
        const signedKeySignature = (0, codec_1.decodeExactLength)(signedKeySignatureNode.content, 'signal digest skey.signature', constants_2.SIGNAL_SIGNATURE_LENGTH);
        const listChildren = (0, helpers_1.getNodeChildren)(listNode);
        const preKeyIds = new Array(listChildren.length);
        for (let index = 0; index < listChildren.length; index += 1) {
            const child = listChildren[index];
            preKeyIds[index] = (0, codec_1.parseUint)((0, codec_1.decodeExactLength)(child.content, `signal digest list[${index}]`, constants_2.SIGNAL_KEY_ID_LENGTH), `signal digest list[${index}]`);
        }
        const hash = (0, helpers_1.decodeNodeContentBase64OrBytes)(hashNode.content, 'signal digest hash');
        return {
            registrationId,
            keyBundleType,
            identity,
            signedKey: {
                id: signedKeyId,
                publicKey: signedKeyPublicKey,
                signature: signedKeySignature
            },
            preKeyIds,
            hash
        };
    }
}
exports.SignalDigestSyncApi = SignalDigestSyncApi;
