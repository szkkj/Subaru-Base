import type { Logger } from '../../infra/log/types';
import type { WaMessageSecretEntry, WaMessageSecretStore } from '../contracts/message-secret.store';
export interface WaMessageSecretMemoryStoreOptions {
    readonly maxSecrets?: number;
    /**
     * Logger for capacity-saturation warnings. Emits a single `warn` the
     * first time the bounded map evicts an entry; subsequent evictions are
     * silent to avoid spam.
     */
    readonly logger?: Logger;
}
export declare class WaMessageSecretMemoryStore implements WaMessageSecretStore {
    private readonly secrets;
    private readonly ttlMs;
    private readonly maxSecrets;
    private readonly cleanup;
    private readonly logger;
    private capacityWarned;
    constructor(ttlMs?: number, options?: WaMessageSecretMemoryStoreOptions);
    private warnCapacity;
    get(messageId: string, nowMs?: number): Promise<WaMessageSecretEntry | null>;
    getBatch(messageIds: readonly string[], nowMs?: number): Promise<readonly (WaMessageSecretEntry | null)[]>;
    set(messageId: string, entry: WaMessageSecretEntry): Promise<void>;
    setBatch(entries: readonly {
        readonly messageId: string;
        readonly entry: WaMessageSecretEntry;
    }[]): Promise<void>;
    cleanupExpired(nowMs: number): Promise<number>;
    clear(): Promise<void>;
    destroy(): Promise<void>;
}
