export declare const WA_PRESENCE_TYPES: Readonly<{
    readonly AVAILABLE: "available";
    readonly UNAVAILABLE: "unavailable";
    readonly SUBSCRIBE: "subscribe";
}>;
export declare const WA_PRESENCE_LAST_SENTINELS: Readonly<{
    readonly DENY: "deny";
    readonly NONE: "none";
    readonly ERROR: "error";
}>;
export declare const WA_CHATSTATE_MEDIA: Readonly<{
    readonly AUDIO: "audio";
}>;
export type WaPresenceType = (typeof WA_PRESENCE_TYPES)[keyof typeof WA_PRESENCE_TYPES];
export type WaPresenceLastSentinel = (typeof WA_PRESENCE_LAST_SENTINELS)[keyof typeof WA_PRESENCE_LAST_SENTINELS];
export type WaChatstateMedia = (typeof WA_CHATSTATE_MEDIA)[keyof typeof WA_CHATSTATE_MEDIA];
