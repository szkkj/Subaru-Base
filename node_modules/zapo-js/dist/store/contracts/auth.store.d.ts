import type { WaAuthCredentials } from '../../auth/types';
export interface WaAuthStore {
    load(): Promise<WaAuthCredentials | null>;
    save(credentials: WaAuthCredentials): Promise<void>;
    clear(): Promise<void>;
}
