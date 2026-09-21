export declare const WA_EMAIL_XMLNS = "urn:xmpp:whatsapp:account";
export declare const WA_EMAIL_TAGS: Readonly<{
    readonly EMAIL: "email";
    readonly EMAIL_ADDRESS: "email_address";
    readonly VERIFY_EMAIL: "verify_email";
    readonly CONFIRM_EMAIL: "confirm_email";
    readonly CONTEXT: "context";
    readonly CODE: "code";
    readonly LG: "lg";
    readonly LC: "lc";
    readonly AUTO_VERIFY: "auto_verify";
    readonly CONFIRMED: "confirmed";
}>;
export declare const WA_EMAIL_CONTEXTS: Readonly<{
    readonly ONBOARDING: "onboarding";
    readonly SETTINGS: "settings";
}>;
export type WaEmailContext = (typeof WA_EMAIL_CONTEXTS)[keyof typeof WA_EMAIL_CONTEXTS];
export declare const WA_EMAIL_LIMITS: Readonly<{
    readonly EMAIL_MAX_LENGTH: 320;
    readonly CODE_LENGTH: 6;
    readonly LOCALE_MIN_LENGTH: 2;
    readonly LOCALE_MAX_LENGTH: 3;
}>;
export declare const WA_EMAIL_ERROR_CODES: Readonly<{
    readonly FORBIDDEN: 403;
    readonly LOCKOUT: 534;
    readonly CODE_EXPIRED: 535;
    readonly CODE_INCORRECT: 536;
    readonly TOO_MANY_RETRIES: 537;
}>;
export type WaEmailErrorCode = (typeof WA_EMAIL_ERROR_CODES)[keyof typeof WA_EMAIL_ERROR_CODES];
