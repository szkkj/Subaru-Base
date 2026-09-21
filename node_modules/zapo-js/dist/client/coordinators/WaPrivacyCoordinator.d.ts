import { type WaBlocklistResult, type WaPrivacyDisallowedListResult, type WaPrivacySettings } from '../events/privacy';
import type { Logger } from '../../infra/log/types';
import { type WaPrivacyDisallowedListSettingName, type WaPrivacySettingName, type WaPrivacySettingValueMap } from '../../protocol/privacy';
import type { SignalUserJidPair } from '../../signal/api/SignalDeviceSyncApi';
import type { WaContactStore } from '../../store/contracts/contact.store';
import type { BinaryNode } from '../../transport/types';
/** JIDs to add to / remove from a category's disallowed list. */
export interface WaPrivacyDisallowedListInput {
    readonly add?: readonly string[];
    readonly remove?: readonly string[];
}
/** A disallowed list the server reported as changed, tagged with its category. */
export interface WaPrivacyDisallowedListUpdate extends WaPrivacyDisallowedListResult {
    readonly setting: WaPrivacyDisallowedListSettingName;
}
/** Everything an account-sync privacy refresh pulls back. */
export interface WaPrivacyAccountSyncResult {
    readonly settings: WaPrivacySettings;
    /**
     * Only the lists the server reported as changed - a category sitting off
     * `contact_blacklist` answers with no list at all and is left out.
     */
    readonly disallowedLists: readonly WaPrivacyDisallowedListUpdate[];
}
/**
 * Coordinates privacy queries/mutations: per-category settings, blocklist,
 * and the per-category disallowed lists. Accessed via {@link WaClient.privacy}.
 */
export interface WaPrivacyCoordinator {
    /**
     * Fetches the current value of every privacy category. A change made on
     * another device reaches this client on its own and surfaces as a
     * `privacy` event, so polling this is only needed for the initial read.
     */
    readonly getPrivacySettings: () => Promise<WaPrivacySettings>;
    /**
     * Updates a single privacy category to a new value, returning the `dhash`
     * the server echoes back - the version stamp of that category's
     * disallowed list, present only while the category sits on
     * `'contact_blacklist'` (`null` otherwise).
     *
     * The `'contact_blacklist'` value (a deny-list of specific contacts on
     * top of `'contacts'`/`'all'`) only flips the **mode** here and leaves the
     * list empty. Populate it with {@link setDisallowedList}, which carries
     * the mode and the entries in one stanza.
     */
    readonly setPrivacySetting: <S extends WaPrivacySettingName>(setting: S, value: WaPrivacySettingValueMap[S]) => Promise<string | null>;
    /**
     * Fetches the per-category disallowed list (the JIDs explicitly excluded
     * while the category sits on `'contact_blacklist'`). Returns an empty
     * list when the category is on any other value. `entries` carries the same
     * membership as `jids` plus each entry's handle, when the server
     * identified it that way.
     */
    readonly getDisallowedList: (category: WaPrivacyDisallowedListSettingName) => Promise<WaPrivacyDisallowedListResult>;
    /**
     * Adds/removes JIDs on a category's disallowed list, switching the
     * category to `'contact_blacklist'` in the same stanza (the server has no
     * separate deny-list endpoint). Inputs accept phone jids, LID jids, or
     * bare phone numbers and are resolved to both addressing forms, like
     * {@link blockUser}.
     *
     * The write is versioned by a `dhash` the coordinator reads right before
     * sending; if another device mutated the list in between, the server
     * answers `409` and the call refetches the stamp and retries once.
     * Returns the new `dhash`.
     */
    readonly setDisallowedList: (category: WaPrivacyDisallowedListSettingName, input: WaPrivacyDisallowedListInput) => Promise<string | null>;
    /**
     * Refetches everything an account-sync privacy update covers: the whole
     * category set plus the disallowed lists of
     * {@link WA_PRIVACY_ACCOUNT_SYNC_DISALLOWED_LISTS}, queried in parallel.
     * The result is both returned and emitted as the `privacy` event, so the
     * client's view stays consistent no matter who triggered the refresh.
     * Categories and lists are separate queries, so a change landing
     * mid-refresh can leave the two halves a version apart.
     *
     * Concurrent calls are deduplicated: one issued while another is still in
     * flight joins it and resolves with the same snapshot.
     *
     * This is what runs on its own when another device changes a setting -
     * the notification carrying the change is a trigger, not a payload to act
     * on. Call it directly only to force a refresh.
     */
    readonly refreshFromAccountSync: () => Promise<WaPrivacyAccountSyncResult>;
    /**
     * Returns the current account-wide blocklist. Blocks/unblocks performed
     * on another device are refetched through the same dirty-bit path as
     * {@link getPrivacySettings} and re-emitted as `blocklist`. `entries`
     * carries the same membership as `jids` plus each entry's handle, when the
     * server identified it that way.
     */
    readonly getBlocklist: () => Promise<WaBlocklistResult>;
    /**
     * Blocks a user (account-wide blocklist). Accepts a phone-number jid, a
     * LID jid, or a bare phone number (digits only). After this, the peer can
     * no longer
     * message/call you and cannot see your last seen/online/photo/status. The
     * block is symmetric only from the peer's read perspective - they don't
     * get an explicit "you were blocked" notification.
     *
     * The server keys blocklist entries by LID for migrated accounts, so a
     * phone-number input is resolved to its LID first (device-list cache,
     * then a usync query). Non-migrated accounts fall back to the plain
     * phone-jid form.
     *
     * A migrated entry also carries one identifier attribute, read from the
     * stored contact: the phone jid, the username handle, or the display name.
     * Entries with none of them are sent as `unknown_identifier`.
     */
    readonly blockUser: (jid: string) => Promise<void>;
    /**
     * Removes a user from the blocklist. Accepts the same inputs as
     * {@link blockUser} and performs the same LID resolution - unblocking a
     * migrated entry by phone jid is rejected by the server.
     */
    readonly unblockUser: (jid: string) => Promise<void>;
}
/**
 * Account-sync driving surface, kept off {@link WaPrivacyCoordinator} because
 * it is the client's to call, not the consumer's: `WaClient.privacy` narrows
 * to the public interface.
 */
export interface WaPrivacyCoordinatorRuntime extends WaPrivacyCoordinator {
    /**
     * Queues a refresh, restarting the quiet window on every call so a burst
     * of `account_sync` notifications collapses into a single refetch instead
     * of one per stanza (each costs five queries). A refresh already in
     * flight is waited out rather than joined: its queries went out before
     * the change landed, so its snapshot would not carry the new value.
     */
    readonly scheduleAccountSyncRefresh: () => void;
    /**
     * Drops a queued refresh so a disconnect does not leave a refetch to fire
     * against a closed connection. A refresh already in flight still runs to
     * completion.
     */
    readonly stopAccountSyncRefresh: () => void;
}
interface WaPrivacyCoordinatorOptions {
    readonly logger: Logger;
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
    readonly resolveUserJidPair: (userJid: string) => Promise<SignalUserJidPair>;
    /**
     * The account's own LID, when it has one. Its presence marks the account
     * as LID-migrated, which every disallowed-list stanza has to declare.
     */
    readonly getSelfLid: () => string | null;
    readonly emitPrivacy: (event: WaPrivacyAccountSyncResult) => void;
    /** Source of the username / display-name identifiers a migrated write carries. */
    readonly contactStore: WaContactStore;
    /**
     * Server-synced `username_contact_privacy_setting_allow_uncontact_set_enable`
     * AB-prop, off by default - entries then fall back to `pn_jid`.
     */
    readonly isUsernamePrivacyListIdentifierEnabled: () => boolean;
}
/** Builds a {@link WaPrivacyCoordinator} backed by the given IQ query function. */
export declare function createPrivacyCoordinator(options: WaPrivacyCoordinatorOptions): WaPrivacyCoordinatorRuntime;
export {};
