"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaSignalMemoryStore = void 0;
class WaSignalMemoryStore {
    constructor() {
        this.registrationInfo = null;
        this.signedPreKey = null;
        this.signedPreKeyRotationTs = null;
    }
    async getRegistrationInfo() {
        return this.registrationInfo;
    }
    async setRegistrationInfo(info) {
        this.registrationInfo = info;
    }
    async getSignedPreKey() {
        return this.signedPreKey;
    }
    async setSignedPreKey(record) {
        this.signedPreKey = record;
    }
    async getSignedPreKeyById(keyId) {
        if (!this.signedPreKey) {
            return null;
        }
        return this.signedPreKey.keyId === keyId ? this.signedPreKey : null;
    }
    async setSignedPreKeyRotationTs(value) {
        this.signedPreKeyRotationTs = value;
    }
    async getSignedPreKeyRotationTs() {
        return this.signedPreKeyRotationTs;
    }
    async clear() {
        this.registrationInfo = null;
        this.signedPreKey = null;
        this.signedPreKeyRotationTs = null;
    }
}
exports.WaSignalMemoryStore = WaSignalMemoryStore;
