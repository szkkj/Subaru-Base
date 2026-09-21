"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalRotateKeyApi = void 0;
const constants_1 = require("../../protocol/constants");
const prekeys_1 = require("../api/prekeys");
const keygen_1 = require("../registration/keygen");
const query_1 = require("../../transport/node/query");
/**
 * Generates a fresh signed prekey and uploads it to the server. Handles the
 * `406`/`409`/`5xx` error codes by signaling whether a digest re-validation
 * is required.
 */
class SignalRotateKeyApi {
    constructor(options) {
        this.logger = options.logger;
        this.query = options.query;
        this.signalStore = options.signalStore;
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS;
    }
    /**
     * Rotates the signed prekey by generating a new one (next key id) and
     * uploading it. Returns `shouldDigestKey: true` when the caller should
     * re-run a digest validation after the rotation.
     */
    async rotateSignedPreKey(timeoutMs = this.defaultTimeoutMs) {
        const [registrationInfo, currentSignedPreKey] = await Promise.all([
            this.signalStore.getRegistrationInfo(),
            this.signalStore.getSignedPreKey()
        ]);
        if (!registrationInfo) {
            throw new Error('signal rotate key requires registration info');
        }
        const nextSignedPreKey = await (0, keygen_1.generateSignedPreKey)(currentSignedPreKey ? currentSignedPreKey.keyId + 1 : 1, registrationInfo.identityKeyPair.privKey);
        await this.signalStore.setSignedPreKey(nextSignedPreKey);
        this.logger.info('signal signed prekey uploading', {
            keyId: nextSignedPreKey.keyId,
            timeoutMs
        });
        const response = await this.query((0, prekeys_1.buildSignedPreKeyRotateIq)(nextSignedPreKey), timeoutMs);
        if (response.tag !== constants_1.WA_NODE_TAGS.IQ) {
            throw new Error(`invalid signal rotate response tag: ${response.tag}`);
        }
        if (response.attrs.type === constants_1.WA_IQ_TYPES.RESULT) {
            this.logger.info('signal signed prekey upload completed', {
                keyId: nextSignedPreKey.keyId
            });
            return { shouldDigestKey: false };
        }
        if (response.attrs.type !== constants_1.WA_IQ_TYPES.ERROR) {
            throw new Error(`invalid signal rotate response type: ${response.attrs.type ?? 'unknown'}`);
        }
        const failure = (0, query_1.parseIqError)(response);
        const errorCode = failure.numericCode;
        if (errorCode === 406) {
            this.logger.warn('signal rotate key generated bad key');
            return { shouldDigestKey: false, errorCode };
        }
        if (errorCode === 409) {
            this.logger.warn('signal rotate key validation mismatch');
            return { shouldDigestKey: true, errorCode };
        }
        if (errorCode !== undefined && errorCode >= 500) {
            this.logger.warn('signal rotate key server error', {
                errorCode
            });
            return { shouldDigestKey: false, errorCode };
        }
        this.logger.warn('signal rotate key unrecognized error', {
            errorCode,
            errorText: failure.text
        });
        return { shouldDigestKey: true, ...(errorCode !== undefined ? { errorCode } : {}) };
    }
}
exports.SignalRotateKeyApi = SignalRotateKeyApi;
