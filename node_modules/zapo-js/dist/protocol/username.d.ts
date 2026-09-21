export declare const WA_USERNAME_LIMITS: Readonly<{
    readonly MIN_LENGTH: 3;
    readonly MAX_LENGTH: 35;
    readonly KEY_LENGTH: 4;
}>;
export declare const WA_USERNAME_VALIDATION_ERRORS: Readonly<{
    readonly INVALID_CHARACTER: "INVALID_CHARACTER";
    readonly INVALID_LENGTH: "INVALID_LENGTH";
    readonly INVALID_NO_LETTERS: "INVALID_NO_LETTERS";
    readonly INVALID_PERIODS: "INVALID_PERIODS";
    readonly INVALID_DOMAIN_SUFFIX: "INVALID_DOMAIN_SUFFIX";
    readonly INVALID_WWW_PREFIX: "INVALID_WWW_PREFIX";
    readonly INVALID_WORD: "INVALID_WORD";
}>;
export type WaUsernameValidationError = (typeof WA_USERNAME_VALIDATION_ERRORS)[keyof typeof WA_USERNAME_VALIDATION_ERRORS];
export type WaUsernameValidation = {
    readonly isValid: true;
} | {
    readonly isValid: false;
    readonly errorType: WaUsernameValidationError;
};
/** Returns the first rule a username fails, in WhatsApp Web's own order. */
export declare function validateUsernameLocally(username: string): WaUsernameValidation;
export declare function isValidUsername(username: string): boolean;
/** True for the 4-digit numeric username key (recovery PIN). */
export declare function isUsernameKey(key: string): boolean;
/**
 * Strips the display-only `@` prefix. The server is not supposed to send it,
 * but WhatsApp Web tolerates and drops it, so stanza and user input alike go
 * through here first.
 */
export declare function normalizeUsername(username: string): string;
export declare function displayUsername(username: string): string;
export interface ParsedUsernameHandle {
    readonly username: string;
    readonly usernameKey: string | null;
}
/**
 * Splits `@user`, `user` or `@user:1234` into its parts without validating
 * either. Callers that need to tell apart a bad handle from a bad key start
 * here; {@link parseUsernameHandle} is the validating shorthand.
 */
export declare function splitUsernameHandle(input: string): ParsedUsernameHandle;
/** Parses `@user`, `user` or `@user:1234`. `null` when either part is invalid. */
export declare function parseUsernameHandle(input: string): ParsedUsernameHandle | null;
