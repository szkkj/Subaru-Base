export declare const WA_GROUP_PARTICIPANT_TYPES: Readonly<{
    readonly SUPERADMIN: "superadmin";
    readonly ADMIN: "admin";
    readonly REGULAR: "participant";
}>;
/** `<membership_requests_action>` child tags for approving/rejecting group join requests. */
export declare const WA_GROUP_MEMBERSHIP_ACTION_TAGS: Readonly<{
    readonly REQUESTS_ACTION: "membership_requests_action";
    readonly APPROVE: "approve";
    readonly REJECT: "reject";
}>;
export type WaGroupSetting = 'announcement' | 'restrict' | 'ephemeral' | 'membership_approval_mode' | 'allow_non_admin_sub_group_creation' | 'group_history' | 'allow_admin_reports' | 'no_frequently_forwarded';
