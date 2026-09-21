import type { WaAuthCredentials } from '../../auth/types';
import type { WaAuthStore } from '../contracts/auth.store';
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
export declare class WaAuthMemoryStore implements WaAuthStore {
    private credentials;
    load(): Promise<WaAuthCredentials | null>;
    save(credentials: WaAuthCredentials): Promise<void>;
    clear(): Promise<void>;
}
