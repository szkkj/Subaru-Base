import { type WaGroupSetting } from '../../protocol/group';
import { type WaGroupMemberAddMode, type WaGroupMemberLinkMode, type WaGroupMemberShareGroupHistoryMode } from '../../transport/node/builders/group';
import { type WaMexQuerySocket } from '../../transport/node/mex/client';
import type { BinaryNode } from '../../transport/types';
export interface WaGroupParticipant {
    readonly jid: string;
    readonly type: string;
    readonly isAdmin: boolean;
    readonly isSuperAdmin: boolean;
    readonly lid?: string;
    readonly phoneNumber?: string;
    readonly displayName?: string;
    readonly username?: string;
    readonly expirationSeconds?: number;
}
export interface WaGroupMetadata {
    readonly jid: string;
    readonly subject: string;
    readonly subjectOwner?: string;
    readonly subjectTime?: number;
    readonly owner?: string;
    /** PN-form jid of the group creator when the group is LID-addressed (`creator_pn`). */
    readonly ownerPhoneNumber?: string;
    /** Username handle of the group creator when set (`creator_username`). */
    readonly ownerUsername?: string;
    /** ISO country code of the group creator when set (`creator_country_code`). */
    readonly ownerCountryCode?: string;
    readonly creation?: number;
    readonly desc?: string;
    readonly descId?: string;
    readonly descOwner?: string;
    readonly descTime?: number;
    readonly restrict: boolean;
    readonly announce: boolean;
    readonly ephemeral?: number;
    readonly ephemeralTrigger?: number;
    readonly size?: number;
    readonly addressingMode?: 'lid' | 'pn';
    readonly isParentGroup: boolean;
    readonly isClosedCommunity: boolean;
    readonly defaultSubgroup: boolean;
    readonly generalSubgroup: boolean;
    readonly hiddenSubgroup: boolean;
    readonly allowNonAdminSubGroupCreation: boolean;
    readonly membershipApprovalEnabled: boolean;
    readonly noFrequentlyForwarded: boolean;
    readonly support: boolean;
    readonly suspended: boolean;
    readonly incognito: boolean;
    readonly allowAdminReports: boolean;
    readonly autoAddDisabled: boolean;
    readonly groupHistory: boolean;
    readonly capi: boolean;
    readonly groupSafetyCheck: boolean;
    readonly participantLabelEnabled: boolean;
    readonly limitSharingEnabled: boolean;
    readonly evolutionVersion?: number;
    readonly memberAddMode?: string;
    readonly memberLinkMode?: string;
    readonly memberShareGroupHistoryMode?: string;
    readonly growthLockedExpiration?: number;
    readonly appealStatus?: 'approved' | 'in_review' | 'none' | 'rejected';
    readonly appealUpdateTime?: number;
    readonly linkedParentJid?: string;
    readonly participants: readonly WaGroupParticipant[];
}
export interface WaMembershipRequest {
    readonly jid: string;
    readonly requestor?: string;
    readonly requestorPhone?: string;
    readonly requestorUsername?: string;
    readonly parentGroupJid?: string;
    readonly requestTime: number;
    readonly requestMethod?: string;
}
export interface WaGroupCreateOptions {
    readonly description?: string;
    readonly linkedParentJid?: string;
}
export interface WaCommunityCreateOptions {
    readonly description?: string;
    readonly membershipApprovalMode?: 'open' | 'request_required';
    readonly allowNonAdminSubGroupCreation?: boolean;
    readonly createGeneralChat?: boolean;
}
export interface WaCommunitySubGroupResult {
    readonly jid: string;
    readonly error?: number;
}
export interface WaLinkSubGroupsResult {
    readonly linkedJids: readonly string[];
    readonly failed: readonly WaCommunitySubGroupResult[];
}
export interface WaUnlinkSubGroupsResult {
    readonly unlinkedJids: readonly string[];
    readonly failed: readonly WaCommunitySubGroupResult[];
}
export interface WaCommunitySubGroup {
    readonly jid: string;
    readonly subject?: string;
    readonly subjectTime?: number;
    readonly defaultSubgroup: boolean;
    readonly generalSubgroup: boolean;
    readonly hiddenSubgroup: boolean;
    readonly membershipApprovalEnabled: boolean;
    readonly pendingMembershipRequests: number;
}
export interface WaCommunitySubGroupSuggestion {
    readonly jid: string;
    readonly subject: string | null;
    readonly description: string | null;
    readonly creator: string | null;
    readonly creationTime: number | null;
    readonly participantCount: number | null;
    readonly isExistingGroup: boolean;
    readonly hiddenGroup: boolean;
}
export interface WaCommunitySubGroupsResult {
    readonly communityJid: string;
    readonly announcementGroup: WaCommunitySubGroup | null;
    readonly subGroups: readonly WaCommunitySubGroup[];
}
export interface WaGroupSuspensionAppealResult {
    readonly success: boolean;
    readonly responseCode: string | null;
    readonly errorMessage: string | null;
    readonly appealCreationTime: number | null;
}
export interface WaGroupInviteParticipantSample {
    readonly jid: string;
    readonly phoneNumber?: string;
    readonly type?: string;
}
export interface WaGroupInviteInfo extends GroupCommons {
    readonly hiddenGroup: boolean;
    readonly defaultSubgroup: boolean;
    readonly generalChat: boolean;
    readonly hasCapi: boolean;
    /**
     * Sample of participants returned alongside the invite preview - WhatsApp
     * trims this list (admins/recent members), it is not the full roster.
     * Call {@link WaGroupCoordinator.queryGroupMetadata} after joining for
     * the complete list.
     */
    readonly participants: readonly WaGroupInviteParticipantSample[];
}
export interface WaRevokeInviteResult {
    readonly code: string;
    /**
     * Participants that joined via the now-revoked code and that the server
     * surfaced in the response (typically with `code: 404` meaning the
     * invite they used is gone). Empty when nobody was affected.
     */
    readonly affectedParticipants: readonly WaParticipantActionResult[];
}
export type WaParticipantActionStatus = 'ok' | 'error';
export interface WaParticipantActionResult {
    readonly jid: string;
    readonly status: WaParticipantActionStatus;
    /** HTTP-style numeric code returned by the server (`200`, `403`, `409`, ...). */
    readonly code: number;
    /** PN-form JID the server resolved for the participant (when addressing-mode is LID). */
    readonly phoneNumber?: string;
    /** Username (handle) the server resolved for the participant, when set. */
    readonly username?: string;
    /**
     * Optional content children attached to the participant outcome. Some
     * partial failures (`409: gone`, `408: not-allowed`, ...) carry extra
     * tags that hint at how to recover.
     */
    readonly raw: BinaryNode;
}
interface WaGroupCoordinatorOptions {
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
    readonly mexSocket?: WaMexQuerySocket;
}
/**
 * Coordinates group and community queries/mutations. Accessed via
 * {@link WaClient.group}. Community sub-APIs (`fetchSubGroups`,
 * `isInternalGroup`, `transferCommunityOwnership`, `fetchSubgroupSuggestions`,
 * `submitGroupSuspensionAppeal`) require an active MEX transport and throw
 * when unavailable.
 */
export interface WaGroupCoordinator {
    /** Fetches the full metadata for `groupJid`. */
    readonly queryGroupMetadata: (groupJid: string) => Promise<WaGroupMetadata>;
    /** Lists every group the current account participates in. */
    readonly queryAllGroups: () => Promise<readonly WaGroupMetadata[]>;
    /**
     * Resolves a group invite `code` (the path segment of a
     * `chat.whatsapp.com/<code>` URL) into a preview of the group: subject,
     * size, ephemeral timer, description, and a trimmed participant sample.
     * The sample is NOT the full roster - call {@link queryGroupMetadata}
     * after joining for the complete list.
     */
    readonly queryGroupInviteInfo: (code: string) => Promise<WaGroupInviteInfo>;
    /**
     * Creates a new group with `subject` and the given participant JIDs.
     * The creator is auto-added as admin; do **not** include your own JID
     * in `participants`. The returned metadata includes the participant
     * list - partial failures surface as participants with `type: 'error'`
     * or are filtered out by the server; inspect against the original
     * `participants` to spot rejections.
     */
    readonly createGroup: (subject: string, participants: readonly string[], options?: WaGroupCreateOptions) => Promise<WaGroupMetadata>;
    /** Renames the group. */
    readonly setSubject: (groupJid: string, subject: string) => Promise<void>;
    /** Sets or clears the group description; pass `null` to remove it. */
    readonly setDescription: (groupJid: string, description: string | null, prevDescId?: string) => Promise<void>;
    /** Toggles a named group setting (announce / restrict / ephemeral / ...). */
    readonly setSetting: (groupJid: string, setting: WaGroupSetting, enabled: boolean) => Promise<void>;
    /**
     * Sets who can add members to the group. `admin_add` restricts adds to
     * admins; `all_member_add` lets any participant add. Group admin
     * operation - non-admins receive a `403 not-authorized` error.
     */
    readonly setMemberAddMode: (groupJid: string, mode: WaGroupMemberAddMode) => Promise<void>;
    /**
     * Sets who can share/forward the group invite link. `admin_link`
     * restricts to admins; `all_member_link` lets any participant share.
     * Group admin operation.
     */
    readonly setMemberLinkMode: (groupJid: string, mode: WaGroupMemberLinkMode) => Promise<void>;
    /**
     * Sets whether new members see prior chat history. `admin_share` hides
     * history; `all_member_share` exposes the message backlog when someone
     * joins. Group admin operation.
     */
    readonly setMemberShareGroupHistoryMode: (groupJid: string, mode: WaGroupMemberShareGroupHistoryMode) => Promise<void>;
    /**
     * Sets the per-group disappearing-message lifetime in seconds (`0`
     * disables, `86400` = 24h, `604800` = 7d, `7776000` = 90d). Use this
     * to pick a duration; `setSetting('ephemeral', false)` is the explicit
     * disable path. `trigger` is the WhatsApp ephemeral-trigger code -
     * leave unset unless you know the protocol value to pass through.
     * Group admin operation.
     */
    readonly setEphemeralDuration: (groupJid: string, expirationSeconds: number, trigger?: number) => Promise<void>;
    /**
     * Adds the given participant JIDs to the group. The IQ as a whole
     * succeeds even when some invitees fail (blocked you, privacy settings
     * disallow add, already a member, etc.) - inspect the returned per-jid
     * results: `status: 'ok'` (code 200) means the invite landed,
     * everything else carries the server's HTTP-style `code`.
     */
    readonly addParticipants: (groupJid: string, participants: readonly string[]) => Promise<readonly WaParticipantActionResult[]>;
    /** Removes the given participant JIDs. Same per-jid result shape as {@link addParticipants}. */
    readonly removeParticipants: (groupJid: string, participants: readonly string[]) => Promise<readonly WaParticipantActionResult[]>;
    /** Promotes participants to admins. Same per-jid result shape as {@link addParticipants}. */
    readonly promoteParticipants: (groupJid: string, participants: readonly string[]) => Promise<readonly WaParticipantActionResult[]>;
    /** Demotes admins back to regular participants. Same per-jid result shape as {@link addParticipants}. */
    readonly demoteParticipants: (groupJid: string, participants: readonly string[]) => Promise<readonly WaParticipantActionResult[]>;
    /** Leaves one or more groups (batched in a single IQ). */
    readonly leaveGroup: (groupJids: readonly string[]) => Promise<void>;
    /**
     * Fetches the current invite code for `groupJid` (the path segment of the
     * `chat.whatsapp.com/<code>` link) without rotating it. Group admin
     * operation - non-admins receive a `403 not-authorized` error. Use
     * {@link revokeInvite} to issue a fresh code and invalidate the old one.
     */
    readonly queryInviteCode: (groupJid: string) => Promise<string>;
    /**
     * Revokes the current invite link. The server rotates the code
     * immediately - every previously-shared `chat.whatsapp.com/<code>` link
     * stops working. Returns the freshly-issued code.
     */
    readonly revokeInvite: (groupJid: string) => Promise<WaRevokeInviteResult>;
    /**
     * Joins a group using its invite `code` (the path segment of a
     * `chat.whatsapp.com/<code>` URL). Throws if the code is expired,
     * revoked, the group is full, or the current account is already a
     * member. Returns the joined group's metadata.
     */
    readonly joinGroupViaInvite: (code: string) => Promise<WaGroupMetadata>;
    /**
     * Creates a community (parent group). Defaults to request-required
     * membership unless `membershipApprovalMode === 'open'`.
     */
    readonly createCommunity: (subject: string, options?: WaCommunityCreateOptions) => Promise<WaGroupMetadata>;
    /** Deactivates (deletes) a community. */
    readonly deactivateCommunity: (communityJid: string) => Promise<void>;
    /** Links existing groups as sub-groups of `communityJid`. */
    readonly linkSubGroups: (communityJid: string, subGroupJids: readonly string[]) => Promise<WaLinkSubGroupsResult>;
    /**
     * Unlinks sub-groups from a community. Set `removeOrphanedMembers` to
     * also evict members that no longer belong to any linked group.
     */
    readonly unlinkSubGroups: (communityJid: string, subGroupJids: readonly string[], options?: {
        readonly removeOrphanedMembers?: boolean;
    }) => Promise<WaUnlinkSubGroupsResult>;
    /** Returns the merged participant list across all groups in a community. */
    readonly queryLinkedGroupsParticipants: (communityJid: string) => Promise<readonly WaGroupParticipant[]>;
    /** Lists sub-groups (and announcement group) of a community via MEX. */
    readonly fetchSubGroups: (communityJid: string) => Promise<WaCommunitySubGroupsResult>;
    /** Lists pending membership-approval requests for the group. */
    readonly queryMembershipApprovalRequests: (groupJid: string) => Promise<readonly WaMembershipRequest[]>;
    /** Approves the listed pending join requests. */
    readonly approveMembershipRequests: (groupJid: string, participantJids: readonly string[]) => Promise<void>;
    /** Rejects the listed pending join requests. */
    readonly rejectMembershipRequests: (groupJid: string, participantJids: readonly string[]) => Promise<void>;
    /** Cancels the current account's own pending join requests in the group. */
    readonly cancelMembershipRequests: (groupJid: string, participantJids: readonly string[]) => Promise<void>;
    /**
     * Joins a linked sub-group of a community the account already belongs
     * to. The IQ result carries no group payload (wa-web only validates the
     * envelope) - call {@link queryGroupMetadata} on `subGroupJid` after
     * this resolves to get the full metadata for the newly-joined group.
     */
    readonly joinLinkedGroup: (communityJid: string, subGroupJid: string, options?: {
        readonly type?: string;
    }) => Promise<void>;
    /** Returns `true` when the group is flagged as an internal WhatsApp group. */
    readonly isInternalGroup: (groupJid: string) => Promise<boolean>;
    /** Transfers community ownership to `newOwnerJid` (superadmin handoff). */
    readonly transferCommunityOwnership: (communityJid: string, newOwnerJid: string) => Promise<void>;
    /** Lists suggested sub-groups for a community, anchored on a hint group. */
    readonly fetchSubgroupSuggestions: (communityJid: string, hintSubgroupJid: string) => Promise<readonly WaCommunitySubGroupSuggestion[]>;
    /**
     * Submits a suspension appeal for the group. `responseCode === 'SUCCESS'`
     * or `'APPEAL_ALREADY_EXISTS'` are reported as successful.
     */
    readonly submitGroupSuspensionAppeal: (groupJid: string, options?: {
        readonly reason?: string | null;
        readonly debugInfo?: string;
    }) => Promise<WaGroupSuspensionAppealResult>;
}
interface GroupCommons {
    readonly jid: string;
    readonly subject: string;
    readonly size?: number;
    readonly creation?: number;
    readonly subjectOwner?: string;
    /** PN-form jid of the subject owner when the group is LID-addressed (`s_o_pn`). */
    readonly subjectOwnerPhoneNumber?: string;
    /** Username handle of the subject owner when set (`s_o_username`). */
    readonly subjectOwnerUsername?: string;
    readonly subjectTime?: number;
    readonly addressingMode?: 'lid' | 'pn';
    readonly desc?: string;
    readonly descId?: string;
    readonly descOwner?: string;
    readonly descTime?: number;
    readonly ephemeral?: number;
    readonly ephemeralTrigger?: number;
    readonly linkedParentJid?: string;
    readonly membershipApprovalEnabled: boolean;
}
/** Builds a {@link WaGroupCoordinator} backed by the given IQ query function and optional MEX socket. */
export declare function createGroupCoordinator(options: WaGroupCoordinatorOptions): WaGroupCoordinator;
export {};
