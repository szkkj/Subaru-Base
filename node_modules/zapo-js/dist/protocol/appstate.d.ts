export declare const WA_APP_STATE_COLLECTIONS: Readonly<{
    readonly REGULAR: "regular";
    readonly REGULAR_LOW: "regular_low";
    readonly REGULAR_HIGH: "regular_high";
    readonly CRITICAL_BLOCK: "critical_block";
    readonly CRITICAL_UNBLOCK_LOW: "critical_unblock_low";
}>;
export declare const WA_APP_STATE_COLLECTION_STATES: Readonly<{
    readonly SUCCESS: "success";
    readonly SUCCESS_HAS_MORE: "success_has_more";
    readonly CONFLICT: "conflict";
    readonly CONFLICT_HAS_MORE: "conflict_has_more";
    readonly ERROR_RETRY: "error_retry";
    readonly ERROR_FATAL: "error_fatal";
    readonly BLOCKED: "blocked";
}>;
export declare const WA_APP_STATE_ERROR_CODES: Readonly<{
    readonly CONFLICT: "409";
    readonly BAD_REQUEST: "400";
    readonly NOT_FOUND: "404";
    readonly NOT_ALLOWED: "405";
    readonly NOT_ACCEPTABLE: "406";
}>;
export declare const WA_APP_STATE_SYNC_DATA_TYPE: Readonly<{
    readonly PATCH: "Patch";
    readonly SNAPSHOT: "Snapshot";
    readonly LOCAL: "Local";
}>;
export declare const WA_APP_STATE_KEY_TYPES: Readonly<{
    readonly MD_APP_STATE: "md-app-state";
    readonly MD_MSG_HIST: "md-msg-hist";
}>;
export declare const WA_APP_STATE_KDF_INFO: Readonly<{
    readonly MUTATION_KEYS: NodeJS.NonSharedUint8Array;
    readonly PATCH_INTEGRITY: NodeJS.NonSharedUint8Array;
}>;
