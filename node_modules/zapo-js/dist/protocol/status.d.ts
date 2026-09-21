export declare const WA_STATUS_DISTRIBUTION_SETTINGS: Readonly<{
    readonly CONTACTS: "contacts";
    readonly ALLOWLIST: "allowlist";
    readonly DENYLIST: "denylist";
    readonly CLOSE_FRIENDS: "close_friends";
}>;
export type WaStatusDistributionSetting = (typeof WA_STATUS_DISTRIBUTION_SETTINGS)[keyof typeof WA_STATUS_DISTRIBUTION_SETTINGS];
