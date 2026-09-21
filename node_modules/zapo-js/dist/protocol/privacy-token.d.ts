export declare const WA_PRIVACY_TOKEN_TYPES: Readonly<{
    readonly TRUSTED_CONTACT: "trusted_contact";
}>;
export declare const WA_PRIVACY_TOKEN_TAGS: Readonly<{
    readonly TOKENS: "tokens";
    readonly TOKEN: "token";
    readonly TC_TOKEN: "tctoken";
    readonly CS_TOKEN: "cstoken";
}>;
export declare const WA_PRIVACY_TOKEN_NOTIFICATION_TYPE = "privacy_token";
export declare const WA_TC_TOKEN_DEFAULTS: Readonly<{
    readonly DURATION_S: 604800;
    readonly NUM_BUCKETS: 4;
    readonly SENDER_DURATION_S: 604800;
    readonly SENDER_NUM_BUCKETS: 4;
    readonly MAX_DURATION_S: 15552000;
}>;
