export declare const WA_DIRTY_TYPES: Readonly<{
    readonly ACCOUNT_SYNC: "account_sync";
    readonly GROUPS: "groups";
    readonly SYNCD_APP_STATE: "syncd_app_state";
    readonly NEWSLETTER_METADATA: "newsletter_metadata";
}>;
export declare const WA_DIRTY_PROTOCOLS: Readonly<{
    readonly DEVICES: "devices";
    readonly PICTURE: "picture";
    readonly PRIVACY: "privacy";
    readonly BLOCKLIST: "blocklist";
    readonly NOTICE: "notice";
}>;
export declare const WA_ACCOUNT_SYNC_PROTOCOLS: readonly ["devices", "picture", "privacy", "blocklist", "notice"];
export declare const WA_SUPPORTED_DIRTY_TYPES: readonly ["account_sync", "syncd_app_state", "groups", "newsletter_metadata"];
