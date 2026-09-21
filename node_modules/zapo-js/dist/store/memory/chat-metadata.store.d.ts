import type { Logger } from '../../infra/log/types';
import type { WaChatMetadataSnapshot, WaChatMetadataStore } from '../contracts/chat-metadata.store';
export interface WaChatMetadataMemoryStoreOptions {
    readonly maxChats?: number;
    /**
     * Logger for capacity-saturation warnings. Emits a single `warn` the first
     * time the bounded map evicts an entry; later evictions are silent.
     */
    readonly logger?: Logger;
}
export declare class WaChatMetadataMemoryStore implements WaChatMetadataStore {
    private readonly records;
    private readonly ttlMs;
    private readonly maxChats;
    private readonly cleanup;
    private readonly logger;
    private capacityWarned;
    constructor(ttlMs?: number, options?: WaChatMetadataMemoryStoreOptions);
    private warnCapacity;
    upsertChatMetadata(snapshot: WaChatMetadataSnapshot): Promise<void>;
    getChatMetadata(chatJid: string, nowMs?: number): Promise<WaChatMetadataSnapshot | null>;
    deleteChatMetadata(chatJid: string): Promise<number>;
    cleanupExpired(nowMs: number): Promise<number>;
    clear(): Promise<void>;
    destroy(): Promise<void>;
}
