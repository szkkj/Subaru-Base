import type { WriteBehindPersistence } from '../persistence/WriteBehindPersistence';
import type { WaClientEventMap } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import { type Proto } from '../../proto';
import type { WaChatMetadataStore } from '../../store/contracts/chat-metadata.store';
export declare const HISTORY_SYNC_FIELDS: Readonly<{
    readonly CONVERSATIONS: 2;
    readonly CHUNK_ORDER: 5;
    readonly PROGRESS: 6;
    readonly PUSHNAMES: 7;
    readonly PHONE_NUMBER_TO_LID_MAPPINGS: 15;
    readonly NCT_SALT: 19;
    readonly INLINE_CONTACTS: 20;
}>;
export declare const CONVERSATION_FIELDS: Readonly<{
    readonly ID: 1;
    readonly MESSAGES: 2;
}>;
interface WaHistorySyncPrivacyTokenConversation {
    readonly jid: string;
    readonly tcToken?: Uint8Array | null;
    readonly tcTokenTimestamp?: number | null;
    readonly tcTokenSenderTimestamp?: number | null;
}
interface WaHistorySyncDeps {
    readonly logger: Logger;
    readonly mediaTransfer: WaMediaTransferClient;
    readonly writeBehind: WriteBehindPersistence;
    readonly chatMetadataStore?: WaChatMetadataStore;
    readonly emitEvent: <K extends keyof WaClientEventMap>(event: K, ...args: Parameters<WaClientEventMap[K]>) => void;
    readonly onPrivacyTokens?: (conversations: readonly WaHistorySyncPrivacyTokenConversation[]) => Promise<void>;
    readonly onNctSalt?: (salt: Uint8Array) => Promise<void>;
    /** Acks the chunk via the `hist_sync` receipt so the primary stops resending it. */
    readonly onProcessed?: (syncType: Proto.Message.HistorySyncType) => Promise<void>;
    /** Author fallback for self-sent group messages that carry no participant. */
    readonly meJid?: string | null;
}
export declare function runHistorySyncNotification(deps: WaHistorySyncDeps, notification: Proto.Message.IHistorySyncNotification): Promise<void>;
/**
 * Applies one history sync chunk while it downloads, descending into
 * `conversations` so peak memory tracks the largest single message and not the
 * chunk. Chunk-wide records settle after the stream, once every LID mapping is in.
 */
export declare function processHistorySyncNotification(deps: WaHistorySyncDeps, notification: Proto.Message.IHistorySyncNotification): Promise<void>;
export {};
