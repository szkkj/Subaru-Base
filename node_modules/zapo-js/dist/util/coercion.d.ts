/**
 * Coerces `value` to a safe-integer/finite number, accepting `number` and
 * `bigint` inputs. Throws with a `${field}`-suffixed message on any other type.
 */
export declare function asNumber(value: unknown, field: string): number;
/** Optional variant of {@link asNumber}; returns `undefined` when input is nullish. */
export declare function asOptionalNumber(value: unknown, field?: string): number | undefined;
/** Asserts that `value` is a string. Throws with a `${field}`-suffixed message otherwise. */
export declare function asString(value: unknown, field: string): string;
/** Optional variant of {@link asString}; returns `undefined` when input is nullish. */
export declare function asOptionalString(value: unknown, field?: string): string | undefined;
/**
 * Coerces `value` to a Uint8Array view, accepting `Uint8Array`, `ArrayBuffer`,
 * and any `ArrayBufferView`. Throws with a `${field}`-suffixed message otherwise.
 */
export declare function asBytes(value: unknown, field: string): Uint8Array;
/** Optional variant of {@link asBytes}; returns `undefined` when input is nullish. */
export declare function asOptionalBytes(value: unknown, field?: string): Uint8Array | undefined;
/** Returns `undefined` when `value` is nullish, otherwise `Boolean(value)`. */
export declare function toBoolOrUndef(value: unknown): boolean | undefined;
/**
 * Returns `value` when it is a positive safe-integer, `undefined` when it is
 * undefined, and throws otherwise. Use when there is no local default and the
 * field should stay unset so the server applies its own.
 */
export declare function resolveOptionalPositive(value: number | undefined, name: string): number | undefined;
/**
 * Returns `value` when it is a positive safe-integer, `fallback` when it is
 * undefined, and throws otherwise.
 */
export declare function resolvePositive(value: number | undefined, fallback: number, name: string): number;
/**
 * Lenient variants for parsing external JSON payloads (GraphQL responses,
 * Mex notifications) where fields may be missing, empty, or arrive as the
 * wrong primitive. Return null instead of throwing.
 */
export declare function tryAsString(value: unknown): string | null;
export declare function tryAsNumber(value: unknown): number | null;
export declare function tryAsRecord(value: unknown): Readonly<Record<string, unknown>> | null;
