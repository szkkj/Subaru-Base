import { type Proto } from '../../proto';
/** A PN→LID mapping carried inside a history sync (one per chat peer with a LID). */
export interface PhoneNumberToLidMapping {
    readonly pnJid: string;
    readonly lidJid: string;
}
export interface HistorySyncBootstrapInput {
    /**
     * Chat-peer PN→LID pairs (the primary's own account excluded, only peers
     * resolving to a LID). A fresh account with no chats yields an empty list.
     */
    readonly phoneNumberToLidMappings?: readonly PhoneNumberToLidMapping[];
    readonly conversations?: readonly Proto.IConversation[];
    readonly pushnames?: readonly Proto.IPushname[];
    /** The companion pairing session id, echoed so the companion can bind it. */
    readonly companionMetaNonce?: string;
}
/**
 * Serializes a `HistorySync` and zlib-deflates it. The phone uses DEFLATE
 * level 1; any zlib-framed level inflates identically, so it is only a
 * size/speed tradeoff.
 */
export declare function encodeHistorySync(content: Proto.IHistorySync): Promise<Uint8Array>;
/**
 * Wraps a deflated `HistorySync` inline in a `HISTORY_SYNC_NOTIFICATION` protocol
 * message. Only small syncs are inlined; larger ones ride an external
 * `md-msg-hist` MMS blob referenced by the same notification.
 */
export declare function buildInlineHistorySyncNotification(syncType: Proto.Message.HistorySyncType, deflatedPayload: Uint8Array, options?: {
    readonly chunkOrder?: number;
    readonly progress?: number;
}): Proto.Message.IProtocolMessage;
/**
 * Builds the `INITIAL_BOOTSTRAP` `HISTORY_SYNC_NOTIFICATION` a mobile-primary
 * pushes to a freshly-linked companion: a deflated `HistorySync` wrapped in a
 * protocol message for delivery as an encrypted peer message. Note
 * `HistorySync.syncType` and `HistorySyncNotification.syncType` are distinct
 * enum types with shared values, so each field uses its own.
 */
export declare function buildHistorySyncBootstrapMessage(input?: HistorySyncBootstrapInput): Promise<{
    readonly message: Proto.Message.IProtocolMessage;
    readonly payloadBytes: number;
}>;
