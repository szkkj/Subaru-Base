import { decodeEnumValue, decodeIndexArgsFromSchema, getAppstateSchemaByActionName } from '../../appstate-spec.js';
export function parseAppStateMutationEvent(mutation) {
    const parts = parseIndexParts(mutation.index);
    if (!parts || parts.length === 0) {
        return null;
    }
    const resolved = getAppstateSchemaByActionName(parts[0]);
    if (!resolved) {
        return null;
    }
    const indexArgs = decodeIndexArgsFromSchema(resolved.schema, parts);
    if (!indexArgs) {
        return null;
    }
    const valueRaw = mutation.value ?? null;
    const base = {
        source: mutation.source,
        collection: mutation.collection,
        version: mutation.version,
        timestamp: mutation.timestamp,
        _raw: { index: mutation.index, indexParts: parts, value: valueRaw }
    };
    if (mutation.operation === 'remove') {
        return {
            schema: resolved.key,
            operation: 'remove',
            ...indexArgs,
            ...base
        };
    }
    const data = unwrapData(resolved.schema, valueRaw);
    return {
        schema: resolved.key,
        operation: 'set',
        ...indexArgs,
        ...(data ?? {}),
        ...base
    };
}
function unwrapData(schema, value) {
    if (!value) {
        return null;
    }
    const field = schema.valueField;
    let inner;
    if (field === null) {
        const rest = {};
        for (const key of Object.keys(value)) {
            if (key === 'timestamp')
                continue;
            rest[key] = value[key];
        }
        inner = rest;
    }
    else {
        const sub = value[field];
        if (sub === null || sub === undefined || typeof sub !== 'object') {
            return null;
        }
        inner = { ...sub };
    }
    applyEnumDecodeToData(schema.valueEnumFields, inner);
    return inner;
}
function applyEnumDecodeToData(enumFields, data) {
    if (!enumFields)
        return;
    for (const [fieldPath, enumPath] of Object.entries(enumFields)) {
        applyDecodeAtPath(data, fieldPath.split('.'), (raw) => {
            if (typeof raw !== 'number')
                return raw;
            const name = decodeEnumValue(enumPath, raw);
            return name ?? raw;
        });
    }
}
function applyDecodeAtPath(obj, segments, transform) {
    if (segments.length === 0)
        return;
    const [head, ...rest] = segments;
    if (rest.length === 0) {
        if (head in obj) {
            const value = obj[head];
            if (Array.isArray(value)) {
                obj[head] = value.map(transform);
            }
            else if (value !== null && value !== undefined) {
                obj[head] = transform(value);
            }
        }
        return;
    }
    const next = obj[head];
    if (Array.isArray(next)) {
        for (const item of next) {
            if (item && typeof item === 'object') {
                applyDecodeAtPath(item, rest, transform);
            }
        }
        return;
    }
    if (next && typeof next === 'object') {
        applyDecodeAtPath(next, rest, transform);
    }
}
function parseIndexParts(index) {
    let parsed;
    try {
        parsed = JSON.parse(index);
    }
    catch {
        return null;
    }
    if (!Array.isArray(parsed)) {
        return null;
    }
    const parts = [];
    for (const item of parsed) {
        if (typeof item === 'string') {
            parts.push(item);
            continue;
        }
        if (typeof item === 'number' || typeof item === 'boolean') {
            parts.push(String(item));
            continue;
        }
        return null;
    }
    return parts;
}
