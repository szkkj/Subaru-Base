const DIGITS_ONLY_RE = /^\d+$/;
const SIGNED_DIGITS_RE = /^-?\d+$/;
/**
 * Normalizes an unknown thrown value into an `Error` – `Error` instances are
 * returned unchanged, strings/numbers are wrapped, and objects with `message`
 * or `code` fields are mapped to readable messages. Use in `catch` blocks
 * before logging.
 */
export function toError(value) {
    if (value instanceof Error)
        return value;
    if (typeof value === 'string')
        return new Error(value);
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return new Error(String(value));
    }
    if (value && typeof value === 'object') {
        const message = value.message;
        if (typeof message === 'string' && message.length > 0) {
            return new Error(message);
        }
        const code = value.code;
        if (typeof code === 'string' || typeof code === 'number') {
            return new Error(`unknown error (${code})`);
        }
    }
    return new Error('unknown error');
}
function assertSafeInteger(value, field, nullishBehavior) {
    if (Number.isFinite(value) && Number.isSafeInteger(value))
        return value;
    const prefix = nullishBehavior === 'throw' ? `invalid ${field}` : 'invalid long numeric value';
    throw new Error(`${prefix}: ${value}`);
}
/**
 * Coerces a `number` or `{ toNumber() }` (protobufjs `Long`) to a finite
 * safe-integer. Throws on missing/non-numeric/out-of-range inputs.
 */
export function toSafeNumber(value, field) {
    if (value === null || value === undefined)
        throw new Error(`missing ${field}`);
    const numeric = typeof value === 'number' ? value : value.toNumber?.();
    if (typeof numeric !== 'number')
        throw new Error(`invalid ${field}`);
    return assertSafeInteger(numeric, field, 'throw');
}
export function longToNumber(value) {
    if (value === null || value === undefined)
        return 0;
    return assertSafeInteger(typeof value === 'number' ? value : value.toNumber(), '', 'zero');
}
export function normalizeNonNegativeInteger(value, fallback) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return fallback;
    return Math.max(0, Math.trunc(value));
}
function parseStrictUnsignedInt(value) {
    if (!DIGITS_ONLY_RE.test(value))
        return undefined;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed))
        return undefined;
    return parsed;
}
export function parseOptionalInt(value) {
    if (!value)
        return undefined;
    return parseStrictUnsignedInt(value);
}
export function parseOptionalSignedInt(value) {
    if (!value)
        return undefined;
    if (!SIGNED_DIGITS_RE.test(value))
        return undefined;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
}
