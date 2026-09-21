import type { WaAppStateSyncClient } from '../../appstate/sync/WaAppStateSyncClient';
import type { WaAppStateSyncOptions, WaAppStateSyncResult } from '../../appstate/types';
import { type DataForKey, type WaAppstateActionKey, type WaAppstateIndexArgs } from '../../appstate-spec';
import type { WaAppStateMessageKey, WaAppStateMutationEvent, WaClearChatOptions, WaDeleteChatOptions, WaDeleteMessageForMeOptions } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import { proto, type Proto } from '../../proto';
import type { WaStoredContactRecord } from '../../store/contracts/contact.store';
import type { WaMessageStore } from '../../store/contracts/message.store';
import type { ServerClock } from '../../util/clock';
type StatusDistributionMode = Proto.SyncActionValue.StatusPrivacyAction.StatusDistributionMode;
type StatusDistributionModeKey = keyof typeof proto.SyncActionValue.StatusPrivacyAction.StatusDistributionMode;
type SetMutationInputFor<K extends WaAppstateActionKey> = K extends K ? {
    readonly schema: K;
} & WaAppstateIndexArgs<K> & Partial<DataForKey<K>> : never;
type RemoveMutationInputFor<K extends WaAppstateActionKey> = K extends K ? {
    readonly schema: K;
} & WaAppstateIndexArgs<K> : never;
export interface WaSetMutationInputMap {
    readonly _: SetMutationInputFor<WaAppstateActionKey>;
}
export interface WaRemoveMutationInputMap {
    readonly _: RemoveMutationInputFor<WaAppstateActionKey>;
}
export type WaSetMutationInput = WaSetMutationInputMap['_'];
export type WaRemoveMutationInput = WaRemoveMutationInputMap['_'];
interface WaAppStateMutationCoordinatorOptions {
    readonly logger: Logger;
    readonly messageStore: WaMessageStore;
    readonly appStateSync: WaAppStateSyncClient;
    readonly mediaTransfer: WaMediaTransferClient;
    readonly isConnected: () => boolean;
    readonly serverClock: ServerClock;
    readonly archiveRangeLimit?: number;
    readonly emitMutation?: (event: WaAppStateMutationEvent) => void;
    readonly emitMutationSend?: (event: WaAppStateMutationEvent) => void;
    readonly emitSnapshotMutations?: boolean;
    readonly nctSaltSink?: (salt: Uint8Array | null) => Promise<void>;
    /**
     * Persistence sink for `Contact` collection mutations (the locally-saved
     * address-book name the primary device synced over app-state). Invoked on
     * every winning mutation including snapshot ones, so the contact store is
     * bootstrapped at pair-time regardless of `emitSnapshotMutations`.
     */
    readonly contactSink?: (record: WaStoredContactRecord) => void;
    /**
     * Sink for applied `SettingPushName` mutations (the account's own display
     * name). Invoked on every winning mutation including snapshot ones, so the
     * local display name is bootstrapped at pair-time.
     */
    readonly pushNameSink?: (name: string) => void;
}
export interface WaSetStatusPrivacyInput {
    readonly mode: StatusDistributionModeKey | StatusDistributionMode;
    readonly userJids?: readonly string[];
    readonly shareToFB?: boolean;
    readonly shareToIG?: boolean;
}
export interface WaBroadcastListParticipant {
    readonly lidJid: string;
    readonly pnJid?: string;
}
export interface WaSetBroadcastListInput {
    readonly id: string;
    readonly listName: string;
    readonly participants: readonly WaBroadcastListParticipant[];
    readonly labelIds?: readonly string[];
}
/**
 * Coordinates app-state mutations (mute/star/read/pin/archive/clear/delete/
 * lock chats, status privacy, broadcast lists) and emits parsed mutation
 * events on sync. Accessed via {@link WaClient.chat}.
 */
export declare class WaAppStateMutationCoordinator {
    private readonly logger;
    private readonly messageStore;
    private readonly appStateSync;
    private readonly mediaTransfer;
    private readonly isConnected;
    private readonly serverClock;
    private readonly archiveRangeLimit;
    private readonly emitMutation?;
    private readonly emitMutationSend?;
    private readonly emitSnapshotMutations;
    private readonly nctSaltSink?;
    private readonly contactSink?;
    private readonly pushNameSink?;
    private readonly pendingMutations;
    private flushPromise;
    constructor(options: WaAppStateMutationCoordinatorOptions);
    /**
     * Runs an app-state sync round, optionally applying pending mutations.
     * Throws when the client is not connected. Returns the per-collection
     * result; blocked collections are logged.
     */
    sync(options?: WaAppStateSyncOptions): Promise<WaAppStateSyncResult>;
    /** Returns the names of collections reported as `BLOCKED` in `syncResult`. */
    getBlockedCollections(syncResult: WaAppStateSyncResult): readonly string[];
    /**
     * Walks a sync result and emits one `app_state_mutation` event per
     * distinct (collection, index) – only the last mutation per key wins.
     * Snapshot-source mutations are skipped unless `emitSnapshotMutations`
     * was enabled at construction.
     */
    emitEventsFromSyncResult(syncResult: WaAppStateSyncResult): void;
    private handleNctSaltMutation;
    private handleContactMutation;
    private handlePushNameMutation;
    /**
     * Mutes or unmutes a chat. `muteEndTimestampMs` is required when
     * `muted` is `true` and must be a non-negative safe-integer epoch.
     *
     * For a "mute forever" entry, pass a very large epoch value (the
     * official client uses year-9999 epochs). The mute end is the absolute
     * timestamp when WhatsApp will re-enable notifications - the client
     * does **not** unmute automatically when the timer expires (you'll see
     * the chat un-muted on the phone, but no `mutation` event re-fires).
     */
    setChatMute(chatJid: string, muted: boolean, muteEndTimestampMs?: number): Promise<void>;
    /** Stars or un-stars a specific message. */
    setMessageStar(message: WaAppStateMessageKey, starred: boolean): Promise<void>;
    /** Marks the chat as read or unread. */
    setChatRead(chatJid: string, read: boolean): Promise<void>;
    /**
     * Pins or unpins the chat. Pinning also clears any active archive flag
     * (the two states are mutually exclusive on the client). WhatsApp
     * imposes a server-side cap on pinned chats - extra pins sync but the
     * official UI will hide / reject them.
     */
    setChatPin(chatJid: string, pinned: boolean): Promise<void>;
    /** Archives or unarchives the chat. Archiving also clears any pin. */
    setChatArchive(chatJid: string, archived: boolean): Promise<void>;
    /**
     * Clears the chat history (without deleting the chat itself - it stays
     * in the chat list, just empty). Defaults to **preserving** starred
     * messages and media; set `options.deleteStarred`/`deleteMedia` to wipe
     * those too. The clear is local-only - other participants keep their
     * copies.
     */
    clearChat(chatJid: string, options?: WaClearChatOptions): Promise<void>;
    /**
     * Deletes the chat entirely (removes from the chat list + drops every
     * stored message). Local-only - the conversation continues to exist on
     * the peer's device. For groups, this does **not** leave the group;
     * use {@link WaGroupCoordinator.leaveGroup} for that.
     */
    deleteChat(chatJid: string, options?: WaDeleteChatOptions): Promise<void>;
    /**
     * Deletes a single message **locally** - removes it from your own
     * device(s) only. The recipient(s) still see it. Use a `revoke`
     * outgoing message ({@link WaMessageCoordinator.send} with
     * `{ type: 'revoke', ... }`) to delete-for-everyone instead.
     * `messageTimestampMs` must be a non-negative safe-integer epoch when set.
     */
    deleteMessageForMe(message: WaAppStateMessageKey, options?: WaDeleteMessageForMeOptions): Promise<void>;
    /** Locks or unlocks the chat. Locking also clears archive and pin. */
    setChatLock(chatJid: string, locked: boolean): Promise<void>;
    /**
     * Drains any queued mutations through a sync round. Concurrent callers
     * share the in-flight flush promise. Failed collections are re-queued
     * before the error is rethrown.
     */
    flushMutations(): Promise<void>;
    private enqueueAndFlush;
    /**
     * Surfaces an action this client is sending via the outbound `mutation_send`
     * event, so consumers can observe their own change at action time. Parse
     * failures are swallowed (best-effort).
     */
    private emitLocalMutation;
    private enqueueMutation;
    private takePendingMutationsBatch;
    private flushPendingMutationsLoop;
    private requeueMutations;
    /**
     * Sets the account-wide status-broadcast distribution policy. `mode`
     * accepts either the proto enum number or its string name; allow/deny
     * lists are provided via `userJids`.
     */
    setStatusPrivacy(input: WaSetStatusPrivacyInput): Promise<void>;
    /** Mutes/unmutes a single user's status broadcasts. Rejects group/broadcast JIDs. */
    setUserStatusMute(jid: string, muted: boolean): Promise<void>;
    /** Creates or updates the broadcast list identified by `input.id`. */
    setBroadcastList(input: WaSetBroadcastListInput): Promise<void>;
    /** Deletes the broadcast list identified by `id`. */
    removeBroadcastList(id: string): Promise<void>;
    /**
     * Applies a `set` mutation against any registered app-state schema. This
     * is the way to reach schemas that don't have a typed helper on this
     * coordinator (Contact, LabelEdit, LabelJid, QuickReply, AiThreadPin,
     * Favorites, Nux, ...). For the common chat actions there's a dedicated
     * method ({@link setChatMute}, {@link setChatRead}, {@link setMessageStar},
     * {@link setChatPin}, {@link setChatArchive}, etc.) – use those instead.
     *
     * `input` is flat – pick a `schema` name from {@link WA_APPSTATE_SCHEMAS},
     * fill the index fields (`id`, `chatJid`, `labelId`, ...) and the value
     * fields side-by-side, and the coordinator routes them to the right
     * SyncActionValue subfield.
     *
     * @example
     * ```ts
     * // Add a contact to the address book
     * await client.chat.set({
     *     schema: 'Contact',
     *     id: '5511999999999@s.whatsapp.net',
     *     contactAction: { fullName: 'Maria Silva', firstName: 'Maria' }
     * })
     *
     * // Create a chat label (color is a server-side palette index)
     * await client.chat.set({
     *     schema: 'LabelEdit',
     *     id: 'label-1',
     *     labelEditAction: { name: 'Pendente', color: 0, isActive: true }
     * })
     *
     * // Apply that label to a chat
     * await client.chat.set({
     *     schema: 'LabelJid',
     *     labelId: 'label-1',
     *     chatJid: '5511999999999@s.whatsapp.net',
     *     labelAssociationAction: { labeled: true }
     * })
     *
     * // Save a business quick reply
     * await client.chat.set({
     *     schema: 'QuickReply',
     *     id: 'qr-greeting',
     *     quickReplyAction: { shortcut: '/oi', message: 'Olá! Tudo bem?' }
     * })
     * ```
     */
    set(input: WaSetMutationInput): Promise<void>;
    /**
     * Applies a `remove` mutation against any registered app-state schema  -
     * same shape as {@link set} but without the value fields (only the schema
     * name + index args). Use this for schemas without a typed helper.
     *
     * @example
     * ```ts
     * // Drop a contact from the address book
     * await client.chat.remove({
     *     schema: 'Contact',
     *     id: '5511999999999@s.whatsapp.net'
     * })
     *
     * // Remove a label from a chat (the label itself stays – use LabelEdit
     * // with `deleted: true` to delete the label definition entirely)
     * await client.chat.remove({
     *     schema: 'LabelJid',
     *     labelId: 'label-1',
     *     chatJid: '5511999999999@s.whatsapp.net'
     * })
     *
     * // Delete a quick reply
     * await client.chat.remove({
     *     schema: 'QuickReply',
     *     id: 'qr-greeting'
     * })
     * ```
     */
    remove(input: WaRemoveMutationInput): Promise<void>;
    private createArchiveMutation;
    private buildChatMessageRange;
    private toChatMessageRangeMessage;
    private normalizeMessageRangeParticipant;
    private toOptionalTimestampSeconds;
    private normalizeChatMutationJid;
    private buildMessageMutationIndex;
    private resolveMessageMutationParticipant;
    private describeMutationActions;
}
export {};
