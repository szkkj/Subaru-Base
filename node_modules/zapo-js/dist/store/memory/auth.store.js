"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaAuthMemoryStore = void 0;
/**
 * In-memory {@link WaAuthStore} implementation. Holds a single
 * {@link WaAuthCredentials} per instance in a field – nothing is persisted.
 *
 * @sensitive Holds private key material from {@link WaAuthCredentials} in
 * RAM. Never log instances, never `JSON.stringify`. Pairing credentials are
 * lost when the process exits, so the next connect will re-pair from scratch
 * (QR/link-code). Prefer a persistent backend (e.g. `@zapo-js/store-sqlite`)
 * for production.
 */
class WaAuthMemoryStore {
    constructor() {
        this.credentials = null;
    }
    async load() {
        return this.credentials;
    }
    async save(credentials) {
        this.credentials = credentials;
    }
    async clear() {
        this.credentials = null;
    }
}
exports.WaAuthMemoryStore = WaAuthMemoryStore;
