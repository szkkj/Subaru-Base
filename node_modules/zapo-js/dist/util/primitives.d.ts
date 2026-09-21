/**
 * Normalizes an unknown thrown value into an `Error` – `Error` instances are
 * returned unchanged, strings/numbers are wrapped, and objects with `message`
 * or `code` fields are mapped to readable messages. Use in `catch` blocks
 * before logging.
 */
export declare function toError(value: unknown): Error;
/**
 * Coerces a `number` or `{ toNumber() }` (protobufjs `Long`) to a finite
 * safe-integer. Throws on missing/non-numeric/out-of-range inputs.
 */
export declare function toSafeNumber(value: number | {
    toNumber?: () => number;
} | null | undefined, field: string): number;
export declare function longToNumber(value: number | {
    toNumber(): number;
} | null | undefined): number;
export declare function normalizeNonNegativeInteger(value: number | undefined, fallback: number): number;
export declare function parseOptionalInt(value: string | undefined): number | undefined;
export declare function parseOptionalSignedInt(value: string | undefined): number | undefined;
