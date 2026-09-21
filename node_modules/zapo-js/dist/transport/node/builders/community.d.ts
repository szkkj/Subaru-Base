import type { BinaryNode } from '../../types';
export interface BuildLinkSubGroupsIqInput {
    readonly communityJid: string;
    readonly subGroups: readonly {
        readonly jid: string;
        readonly hidden?: boolean;
    }[];
}
export declare function buildLinkSubGroupsIq(input: BuildLinkSubGroupsIqInput): BinaryNode;
export interface BuildUnlinkSubGroupsIqInput {
    readonly communityJid: string;
    readonly subGroupJids: readonly string[];
    readonly removeOrphanedMembers?: boolean;
}
export declare function buildUnlinkSubGroupsIq(input: BuildUnlinkSubGroupsIqInput): BinaryNode;
export declare function buildDeactivateCommunityIq(communityJid: string): BinaryNode;
export declare function buildLinkedGroupsParticipantsIq(communityJid: string): BinaryNode;
