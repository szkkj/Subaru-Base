"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaQrFlow = void 0;
const constants_1 = require("../../protocol/constants");
const bytes_1 = require("../../util/bytes");
class WaQrFlow {
    constructor(args) {
        this.logger = args.logger;
        this.getCredentials = args.getCredentials;
        this.getDevicePlatform = args.getDevicePlatform;
        this.emitQr = args.emitQr;
        this.qrRefs = [];
        this.qrRefIndex = 0;
        this.currentQrTimer = null;
    }
    hasQr() {
        return this.qrRefIndex < this.qrRefs.length || this.currentQrTimer !== null;
    }
    clear() {
        this.logger.trace('qr flow clear');
        if (this.currentQrTimer) {
            clearTimeout(this.currentQrTimer);
            this.currentQrTimer = null;
        }
        this.qrRefs = [];
        this.qrRefIndex = 0;
    }
    refreshCurrentQr() {
        if (this.qrRefIndex === 0) {
            this.logger.trace('qr flow refresh skipped: no active ref');
            return false;
        }
        const ref = this.qrRefs[this.qrRefIndex - 1];
        const credentials = this.getCredentials();
        if (!credentials) {
            this.logger.warn('qr flow refresh skipped: missing credentials');
            return false;
        }
        const ttlMs = this.qrRefs.length - this.qrRefIndex === 5
            ? constants_1.WA_DEFAULTS.QR_INITIAL_TTL_MS
            : constants_1.WA_DEFAULTS.QR_ROTATION_TTL_MS;
        this.logger.debug('qr flow refresh emit', {
            ttlMs,
            remainingRefs: this.qrRefs.length - this.qrRefIndex
        });
        this.emitQr(this.buildQr(ref, credentials), ttlMs);
        return true;
    }
    setRefs(refs) {
        this.clear();
        this.qrRefs = refs;
        this.logger.info('qr refs updated', { count: this.qrRefs.length });
        if (this.qrRefs.length === 0) {
            return;
        }
        this.rotateRef();
    }
    rotateRef() {
        const credentials = this.getCredentials();
        if (!credentials) {
            this.clear();
            return;
        }
        if (this.qrRefIndex >= this.qrRefs.length) {
            this.clear();
            return;
        }
        const ref = this.qrRefs[this.qrRefIndex++];
        const remainingRefs = this.qrRefs.length - this.qrRefIndex;
        const ttlMs = remainingRefs === 5 ? constants_1.WA_DEFAULTS.QR_INITIAL_TTL_MS : constants_1.WA_DEFAULTS.QR_ROTATION_TTL_MS;
        this.logger.trace('qr flow emit new code', { ttlMs, remainingRefs });
        this.currentQrTimer = setTimeout(() => {
            this.currentQrTimer = null;
            this.rotateRef();
        }, ttlMs);
        try {
            this.emitQr(this.buildQr(ref, credentials), ttlMs);
        }
        catch (error) {
            if (this.currentQrTimer) {
                clearTimeout(this.currentQrTimer);
                this.currentQrTimer = null;
            }
            throw error;
        }
    }
    buildQr(ref, credentials) {
        return (ref +
            ',' +
            (0, bytes_1.bytesToBase64)(credentials.noiseKeyPair.pubKey) +
            ',' +
            (0, bytes_1.bytesToBase64)(credentials.registrationInfo.identityKeyPair.pubKey) +
            ',' +
            (0, bytes_1.bytesToBase64)(credentials.advSecretKey) +
            ',' +
            this.getDevicePlatform());
    }
}
exports.WaQrFlow = WaQrFlow;
