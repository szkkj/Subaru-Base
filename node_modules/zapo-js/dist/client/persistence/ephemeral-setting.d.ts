import type { WriteBehindPersistence } from '../persistence/WriteBehindPersistence';
import type { WaIncomingMessageEvent } from '../types';
import type { Logger } from '../../infra/log/types';
import type { Proto } from '../../proto';
import type { WaChatMetadataStore } from '../../store/contracts/chat-metadata.store';
export interface WaPersistIncomingEphemeralSettingOptions {
    readonly logger: Logger;
    readonly writeBehind: WriteBehindPersistence;
    readonly event: WaIncomingMessageEvent;
    readonly protocolMessage: Proto.Message.IProtocolMessage;
    readonly chatMetadataStore: WaChatMetadataStore;
}
/**
 * Persists a 1:1 `EPHEMERAL_SETTING` protocol message so outgoing sends pick up
 * the peer's change without waiting for history sync. Groups are skipped –
 * their timer comes from group notifications, not protocol messages.
 */
export declare function persistIncomingEphemeralSetting(options: WaPersistIncomingEphemeralSettingOptions): void;
export interface WaEphemeralObserverOptions {
    readonly logger: Logger;
    readonly chatMetadataStore: WaChatMetadataStore;
}
/**
 * Builds the inbound observer that refreshes the chat-metadata cache from
 * ordinary traffic. A peer stamps `contextInfo.ephemeralSettingTimestamp` on
 * every message in a disappearing chat, making it the only continuously
 * refreshed source - history sync and `EPHEMERAL_SETTING` are point-in-time.
 *
 * Never blocks and never rejects: the store round-trip is fire-and-forget.
 * Messages repeating a value share one round-trip, so the batch an offline
 * resume delivers costs a single read instead of one per message, while a
 * message carrying a *different* value still gets its own round-trip rather
 * than being swallowed by the one in flight.
 *
 * A write skips a setting older than the cached one, mirroring how the peer
 * resolves it: highest timestamp wins. That check is not atomic with the
 * write, so two round-trips that both read a cold cache can still land out of
 * order and leave the older value behind. The next message from the chat
 * corrects it, and a stale-but-older stamp loses to the peer's own value
 * anyway, so this is not worth serializing the receive path over.
 */
export declare function createEphemeralObserver(options: WaEphemeralObserverOptions): (event: WaIncomingMessageEvent) => void;
