"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asNumber = asNumber;
exports.asOptionalNumber = asOptionalNumber;
exports.asString = asString;
exports.asOptionalString = asOptionalString;
exports.asBytes = asBytes;
exports.asOptionalBytes = asOptionalBytes;
exports.toBoolOrUndef = toBoolOrUndef;
exports.resolveOptionalPositive = resolveOptionalPositive;
exports.resolvePositive = resolvePositive;
exports.tryAsString = tryAsString;
exports.tryAsNumber = tryAsNumber;
exports.tryAsRecord = tryAsRecord;
const bytes_1 = require("./bytes");
const primitives_1 = require("./primitives");
/**
 * Coerces `value` to a safe-integer/finite number, accepting `number` and
 * `bigint` inputs. Throws with a `${field}`-suffixed message on any other type.
 */
function asNumber(value, field) {
    if (typeof value === 'number') {
        return (0, primitives_1.toSafeNumber)(value, field);
    }
    if (typeof value === 'bigint') {
        return (0, primitives_1.toSafeNumber)(Number(value), field);
    }
    throw new Error(`invalid number value for ${field}`);
}
/** Optional variant of {@link asNumber}; returns `undefined` when input is nullish. */
function asOptionalNumber(value, field = 'optional number') {
    if (value === null || value === undefined)
        return undefined;
    return asNumber(value, field);
}
/** Asserts that `value` is a string. Throws with a `${field}`-suffixed message otherwise. */
function asString(value, field) {
    if (typeof value === 'string') {
        return value;
    }
    throw new Error(`invalid string value for ${field}`);
}
/** Optional variant of {@link asString}; returns `undefined` when input is nullish. */
function asOptionalString(value, field = 'optional string') {
    if (value === null || value === undefined)
        return undefined;
    return asString(value, field);
}
/**
 * Coerces `value` to a Uint8Array view, accepting `Uint8Array`, `ArrayBuffer`,
 * and any `ArrayBufferView`. Throws with a `${field}`-suffixed message otherwise.
 */
function asBytes(value, field) {
    if (value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
        return (0, bytes_1.toBytesView)(value);
    }
    throw new Error(`invalid bytes value for ${field}`);
}
/** Optional variant of {@link asBytes}; returns `undefined` when input is nullish. */
function asOptionalBytes(value, field = 'optional bytes') {
    if (value === null || value === undefined)
        return undefined;
    return asBytes(value, field);
}
/** Returns `undefined` when `value` is nullish, otherwise `Boolean(value)`. */
function toBoolOrUndef(value) {
    return value === null || value === undefined ? undefined : Boolean(value);
}
/**
 * Returns `value` when it is a positive safe-integer, `undefined` when it is
 * undefined, and throws otherwise. Use when there is no local default and the
 * field should stay unset so the server applies its own.
 */
function resolveOptionalPositive(value, name) {
    if (value === undefined)
        return undefined;
    if (Number.isSafeInteger(value) && value > 0)
        return value;
    throw new Error(`${name} must be a positive safe integer`);
}
/**
 * Returns `value` when it is a positive safe-integer, `fallback` when it is
 * undefined, and throws otherwise.
 */
function resolvePositive(value, fallback, name) {
    return resolveOptionalPositive(value, name) ?? fallback;
}
/**
 * Lenient variants for parsing external JSON payloads (GraphQL responses,
 * Mex notifications) where fields may be missing, empty, or arrive as the
 * wrong primitive. Return null instead of throwing.
 */
function tryAsString(value) {
    return typeof value === 'string' && value.length > 0 ? value : null;
}
function tryAsNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const normalized = value.trim();
        if (normalized.length === 0)
            return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function tryAsRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
