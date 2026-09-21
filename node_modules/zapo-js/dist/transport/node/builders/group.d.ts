import type { BinaryNode } from '../../types';
export interface BuildCreateGroupIqInput {
    readonly subject: string;
    readonly participants: readonly string[];
    readonly description?: string;
    readonly linkedParentJid?: string;
    readonly parent?: true | {
        readonly defaultMembershipApprovalMode?: 'request_required' | undefined;
    };
    readonly allowNonAdminSubGroupCreation?: boolean;
    readonly createGeneralChat?: boolean;
}
export declare function buildCreateGroupIq(input: BuildCreateGroupIqInput): BinaryNode;
type GroupParticipantAction = 'add' | 'remove' | 'promote' | 'demote';
export declare function buildGroupParticipantChangeIq(input: {
    readonly groupJid: string;
    readonly action: GroupParticipantAction;
    readonly participants: readonly string[];
}): BinaryNode;
export declare function buildLeaveGroupIq(groupJids: readonly string[]): BinaryNode;
export declare function buildGetMembershipApprovalRequestsIq(groupJid: string): BinaryNode;
export declare function buildMembershipRequestsActionIq(input: {
    readonly groupJid: string;
    readonly approve?: readonly string[];
    readonly reject?: readonly string[];
}): BinaryNode;
export declare function buildCancelMembershipRequestsIq(input: {
    readonly groupJid: string;
    readonly participantJids: readonly string[];
}): BinaryNode;
export type WaGroupMemberAddMode = 'admin_add' | 'all_member_add';
export type WaGroupMemberLinkMode = 'admin_link' | 'all_member_link';
export type WaGroupMemberShareGroupHistoryMode = 'admin_share' | 'all_member_share';
export declare function buildSetGroupMemberAddModeIq(input: {
    readonly groupJid: string;
    readonly mode: WaGroupMemberAddMode;
}): BinaryNode;
export declare function buildSetGroupMemberLinkModeIq(input: {
    readonly groupJid: string;
    readonly mode: WaGroupMemberLinkMode;
}): BinaryNode;
export declare function buildSetGroupMemberShareGroupHistoryModeIq(input: {
    readonly groupJid: string;
    readonly mode: WaGroupMemberShareGroupHistoryMode;
}): BinaryNode;
export declare function buildSetGroupEphemeralIq(input: {
    readonly groupJid: string;
    readonly expirationSeconds: number;
    readonly trigger?: number;
}): BinaryNode;
export declare function buildJoinLinkedGroupIq(input: {
    readonly groupJid: string;
    readonly subGroupJid: string;
    readonly type?: string;
}): BinaryNode;
export {};
