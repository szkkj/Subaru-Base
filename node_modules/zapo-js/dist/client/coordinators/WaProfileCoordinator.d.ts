import type { WaAppStateMutationCoordinator } from '../coordinators/WaAppStateMutationCoordinator';
import type { Logger } from '../../infra/log/types';
import type { SignalLidSyncResult } from '../../signal/api/SignalDeviceSyncApi';
import { type WaProfilePictureType } from '../../transport/node/builders/profile';
import { type WaMexQuerySocket } from '../../transport/node/mex/client';
import type { BinaryNode } from '../../transport/types';
export interface WaProfilePictureResult {
    readonly url?: string;
    readonly directPath?: string;
    readonly id?: string;
    readonly type?: string;
}
export interface WaProfileStatusResult {
    readonly status: string | null;
}
export interface WaProfileInfo {
    readonly jid: string;
    readonly pictureId?: number;
    readonly status?: string | null;
}
export interface WaDisappearingModeResult {
    readonly duration: number;
    readonly timestamp: number;
    readonly ephemeralityDisabled?: boolean;
}
export interface WaTextStatusResult {
    readonly jid: string;
    readonly text: string | null;
    readonly emoji: string | null;
    readonly ephemeralDurationSec: number | null;
    readonly lastUpdateTime: number | null;
}
export interface WaSetTextStatusInput {
    readonly text?: string | null;
    readonly emoji?: string | null;
    readonly ephemeralDurationSec?: number | null;
}
export interface WaUsernameResult {
    readonly jid: string;
    readonly username: string | null;
}
export interface WaOwnUsernameResult {
    readonly username: string | null;
    readonly state: string | null;
    readonly pin: string | null;
}
export interface WaSetUsernameInput {
    readonly username: string;
    readonly reserved?: boolean;
    readonly sessionId?: string;
    readonly source?: 'USER_INPUT';
}
export interface WaUsernameAvailabilityResult {
    readonly available: boolean;
    readonly suggestions: readonly string[];
}
export type WaUsernameLookupResult = {
    readonly status: 'found';
    readonly jid: string;
    readonly username: string | null;
    readonly isBusiness: boolean;
    readonly pnJid: string | null;
} | {
    readonly status: 'key-required';
    readonly username: string | null;
} | {
    readonly status: 'not-found';
};
export interface WaResolveUsernameInput {
    /** A leading `@` and a `:1234` key suffix are accepted. */
    readonly username: string;
    /** Overrides a key parsed out of {@link username}. */
    readonly usernameKey?: string;
}
/**
 * Coordinates own/peer profile queries and mutations: picture, status, text
 * status, username, disappearing mode, and LID lookup. Accessed via
 * {@link WaClient.profile}.
 */
export interface WaProfileCoordinator {
    /** Fetches a profile picture envelope (URL + direct path + id). */
    readonly getProfilePicture: (jid: string, type?: WaProfilePictureType, existingId?: string) => Promise<WaProfilePictureResult>;
    /**
     * Sets the profile picture for the current account or `targetJid`
     * (group/community admin operation when set). `imageBytes` is uploaded
     * **as-is** - the library does not transcode, resize, or crop, so pass
     * pre-encoded JPEG bytes shaped to WhatsApp's expected picture format
     * (square, JPEG, reasonable resolution). Returns the server-side
     * picture id on success.
     */
    readonly setProfilePicture: (imageBytes: Uint8Array, targetJid?: string) => Promise<string | null>;
    /** Deletes the profile picture for the current account or `targetJid` (admin op for groups/communities). */
    readonly deleteProfilePicture: (targetJid?: string) => Promise<void>;
    /** Fetches the legacy "About" status for a single JID. */
    readonly getStatus: (jid: string) => Promise<WaProfileStatusResult>;
    /** Sets the current account's legacy "About" status. */
    readonly setStatus: (text: string) => Promise<void>;
    /**
     * Sets the account's pushName - the display name broadcast to other
     * users in chats and group participant lists. Writes a `SettingPushName`
     * app-state mutation to sync the account's other devices, persists the
     * name locally, and re-broadcasts an available presence carrying it (the
     * step that propagates the name on primary connections, where no phone
     * re-broadcasts on this device's behalf). Empty strings clear the name.
     */
    readonly setPushName: (name: string) => Promise<void>;
    /** Batched usync fetch of picture id + status for many JIDs. */
    readonly getProfiles: (jids: readonly string[]) => Promise<readonly WaProfileInfo[]>;
    /** Batched fetch of the disappearing-mode setting per JID. */
    readonly getDisappearingMode: (jids: readonly string[]) => Promise<readonly WaDisappearingModeResult[]>;
    /**
     * Sets the account-wide default disappearing-mode duration applied to
     * **new** 1:1 chats started by this account. `durationSeconds` is the
     * ephemeral message lifetime (`0` disables, `86400` = 24h, `604800` =
     * 7d, `7776000` = 90d). Existing chats keep their per-chat setting -
     * change that with a system `disappearing_mode` message instead.
     */
    readonly setDisappearingMode: (durationSeconds: number) => Promise<void>;
    /** Batched fetch of the modern text-status (emoji + text) per JID. */
    readonly getTextStatuses: (jids: readonly string[]) => Promise<readonly WaTextStatusResult[]>;
    /**
     * Updates the current account's text status (the modern "About" emoji +
     * text shown in chat). Passing `text: null` (or `''`) **clears** the
     * status; passing `ephemeralDurationSec` without `text` and `emoji` is
     * silently coerced back to `0` (server rejects expiring empty statuses).
     */
    readonly setTextStatus: (input: WaSetTextStatusInput) => Promise<void>;
    /** Batched fetch of username per JID. */
    readonly getUsernames: (jids: readonly string[]) => Promise<readonly WaUsernameResult[]>;
    /**
     * Resolves a username handle to the account's LID, so a message can be
     * addressed to `@handle`. `'key-required'` means the server withheld the
     * JID - repeat the call with `usernameKey`.
     *
     * @throws when the handle fails local validation, before any round-trip.
     */
    readonly resolveUsername: (input: WaResolveUsernameInput) => Promise<WaUsernameLookupResult>;
    /** Fetches the current account's username record (value, state, recovery pin). */
    readonly getOwnUsername: () => Promise<WaOwnUsernameResult>;
    /**
     * Reserves/sets a username on the current account. Returns `true` only
     * when the server reports `'SUCCESS'`; on any other server outcome (taken,
     * rate-limited) it returns `false` without throwing - check the value and
     * consult {@link checkUsernameAvailability} for suggestions.
     *
     * @throws when the handle fails local validation, before any round-trip.
     */
    readonly setUsername: (input: WaSetUsernameInput) => Promise<boolean>;
    /** Deletes the current account's username. Returns `true` on success. */
    readonly deleteUsername: () => Promise<boolean>;
    /** Fetches the "About" text for a single JID via MEX. */
    readonly getAboutStatus: (jid: string) => Promise<string | null>;
    /** Checks whether a username is available and returns server suggestions. */
    readonly checkUsernameAvailability: (username: string) => Promise<WaUsernameAvailabilityResult>;
    /**
     * Sets the username recovery PIN. Returns `true` on success.
     *
     * @throws when `pin` is not exactly 4 digits, before any round-trip.
     */
    readonly setUsernameKey: (pin: string) => Promise<boolean>;
    /** Resolves LIDs for a list of phone numbers (handles normalization). */
    readonly getLidsByPhoneNumbers: (phoneNumbers: readonly string[]) => Promise<readonly SignalLidSyncResult[]>;
}
interface WaProfileCoordinatorOptions {
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>, options?: {
        readonly useSystemId?: boolean;
    }) => Promise<BinaryNode>;
    readonly generateSid: () => Promise<string>;
    readonly mexSocket: WaMexQuerySocket;
    readonly queryLidsByPhoneJids: (phoneJids: readonly string[]) => Promise<readonly SignalLidSyncResult[]>;
    /**
     * App-state mutation coordinator. {@link WaProfileCoordinator.setPushName}
     * routes through `mutations.set({ schema: 'SettingPushName', ... })` so
     * the pushName change shares the same flush pipeline as other queued
     * mutations.
     */
    readonly mutations: WaAppStateMutationCoordinator;
    /**
     * Applies a pushName change locally: persists the display name and
     * re-broadcasts an available presence carrying it. Expected to be
     * idempotent (a no-op when the name already matches).
     */
    readonly applyOwnPushName: (name: string) => Promise<void>;
    /**
     * Resolves the receiver-mode `<tctoken>` node for a contact, echoed back on
     * privacy-gated profile queries (picture get, about/status usync) to prove
     * this account is a trusted contact. Returns `null` when no valid token is
     * held for the JID.
     */
    readonly resolvePrivacyTokenNode: (jid: string) => Promise<BinaryNode | null>;
    readonly logger: Logger;
}
/** Builds a {@link WaProfileCoordinator} from its IQ/MEX/SID dependencies. */
export declare function createProfileCoordinator(options: WaProfileCoordinatorOptions): WaProfileCoordinator;
export {};
