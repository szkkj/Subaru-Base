export declare const WA_PRIVACY_CATEGORIES: Readonly<{
    readonly READ_RECEIPTS: "readreceipts";
    readonly LAST_SEEN: "last";
    readonly ONLINE: "online";
    readonly PROFILE_PICTURE: "profile";
    readonly ABOUT: "status";
    readonly GROUP_ADD: "groupadd";
    readonly CALL_ADD: "calladd";
    readonly MESSAGES: "messages";
    readonly DEFENSE_MODE: "defense";
    readonly LINKED_PROFILES: "linked_profiles";
    readonly PIX: "pix";
}>;
export type WaPrivacyCategory = (typeof WA_PRIVACY_CATEGORIES)[keyof typeof WA_PRIVACY_CATEGORIES];
export declare const WA_PRIVACY_VALUES: Readonly<{
    readonly ALL: "all";
    readonly CONTACTS: "contacts";
    readonly CONTACT_BLACKLIST: "contact_blacklist";
    readonly NONE: "none";
    readonly MATCH_LAST_SEEN: "match_last_seen";
    readonly KNOWN: "known";
    readonly OFF: "off";
    readonly ON_STANDARD: "on_standard";
    readonly ERROR: "error";
}>;
export type WaPrivacyValue = (typeof WA_PRIVACY_VALUES)[keyof typeof WA_PRIVACY_VALUES];
export declare const WA_PRIVACY_CATEGORY_TO_SETTING: Readonly<{
    readonly readreceipts: "readReceipts";
    readonly last: "lastSeen";
    readonly online: "online";
    readonly profile: "profilePicture";
    readonly status: "about";
    readonly groupadd: "groupAdd";
    readonly calladd: "callAdd";
    readonly messages: "messages";
    readonly defense: "defenseMode";
    readonly linked_profiles: "linkedProfiles";
    readonly pix: "pix";
}>;
export declare const WA_PRIVACY_SETTING_TO_CATEGORY: Readonly<{
    readonly readReceipts: "readreceipts";
    readonly lastSeen: "last";
    readonly online: "online";
    readonly profilePicture: "profile";
    readonly about: "status";
    readonly groupAdd: "groupadd";
    readonly callAdd: "calladd";
    readonly messages: "messages";
    readonly defenseMode: "defense";
    readonly linkedProfiles: "linked_profiles";
    readonly pix: "pix";
}>;
export type WaPrivacySettingName = keyof typeof WA_PRIVACY_SETTING_TO_CATEGORY;
export type WaPrivacyVisibility = 'all' | 'contacts' | 'contact_blacklist' | 'none';
export interface WaPrivacySettingValueMap {
    readonly readReceipts: 'all' | 'none';
    readonly lastSeen: WaPrivacyVisibility;
    readonly online: 'all' | 'none' | 'match_last_seen';
    readonly profilePicture: WaPrivacyVisibility;
    readonly about: WaPrivacyVisibility;
    readonly groupAdd: 'all' | 'contacts' | 'contact_blacklist';
    readonly callAdd: 'all' | 'known' | 'contacts';
    readonly messages: 'all' | 'contacts';
    readonly defenseMode: 'off' | 'on_standard';
    /**
     * Who can see the Accounts Center profiles linked to this account. Takes
     * the same visibility values as `lastSeen`/`profilePicture`, deny-list
     * included.
     */
    readonly linkedProfiles: WaPrivacyVisibility;
    /** Who can see the Pix key on the profile (Brazil-only payments surface). */
    readonly pix: WaPrivacyVisibility;
}
/**
 * Values each setting actually accepts. The server reports categories the
 * library does not model and can answer `error`, so a value has to be checked
 * against its own setting - a globally valid value is not necessarily valid
 * here, and surfacing one would break the type the public API declares.
 */
export declare const WA_PRIVACY_SETTING_VALUES: Readonly<{
    readReceipts: readonly ["all", "none"];
    lastSeen: readonly ["all", "contacts", "contact_blacklist", "none"];
    online: readonly ["all", "none", "match_last_seen"];
    profilePicture: readonly ["all", "contacts", "contact_blacklist", "none"];
    about: readonly ["all", "contacts", "contact_blacklist", "none"];
    groupAdd: readonly ["all", "contacts", "contact_blacklist"];
    callAdd: readonly ["all", "known", "contacts"];
    messages: readonly ["all", "contacts"];
    defenseMode: readonly ["off", "on_standard"];
    linkedProfiles: readonly ["all", "contacts", "contact_blacklist", "none"];
    pix: readonly ["all", "contacts", "contact_blacklist", "none"];
}>;
export declare const WA_PRIVACY_DISALLOWED_LIST_CATEGORIES: Readonly<{
    readonly ABOUT: "status";
    readonly GROUP_ADD: "groupadd";
    readonly LAST_SEEN: "last";
    readonly PROFILE_PICTURE: "profile";
    readonly LINKED_PROFILES: "linked_profiles";
    readonly PIX: "pix";
}>;
type DisallowedCategoryToSetting = {
    readonly [K in keyof typeof WA_PRIVACY_DISALLOWED_LIST_CATEGORIES]: (typeof WA_PRIVACY_CATEGORY_TO_SETTING)[(typeof WA_PRIVACY_DISALLOWED_LIST_CATEGORIES)[K]];
};
export type WaPrivacyDisallowedListSettingName = DisallowedCategoryToSetting[keyof DisallowedCategoryToSetting];
/**
 * Disallowed lists refreshed alongside the categories whenever an
 * account-sync privacy update lands. Mirrors the set WhatsApp Web resyncs;
 * the remaining deny-list categories are only read on demand.
 */
export declare const WA_PRIVACY_ACCOUNT_SYNC_DISALLOWED_LISTS: readonly ["about", "groupAdd", "lastSeen", "profilePicture"];
export declare const WA_PRIVACY_TAGS: Readonly<{
    readonly CATEGORY: "category";
    readonly LIST: "list";
    readonly USER: "user";
}>;
/** `action` attr of a `<user>` node inside a disallowed-list mutation. */
export declare const WA_PRIVACY_LIST_ACTIONS: Readonly<{
    readonly ADD: "add";
    readonly REMOVE: "remove";
}>;
export type WaPrivacyListAction = (typeof WA_PRIVACY_LIST_ACTIONS)[keyof typeof WA_PRIVACY_LIST_ACTIONS];
/**
 * Placeholder sent as `dhash` when the client holds no version stamp for a
 * category's disallowed list (first write, or after a failed sync).
 */
export declare const WA_PRIVACY_DHASH_NONE = "none";
export {};
