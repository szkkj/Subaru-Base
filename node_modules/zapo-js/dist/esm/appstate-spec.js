import { proto } from './proto.js';
import { WA_APPSTATE_SCHEMAS as RAW_WA_APPSTATE_SCHEMAS } from '../../spec/appstate/index.js';
export { WA_APPSTATE_COLLECTIONS, WA_APPSTATE_SCHEMAS } from '../../spec/appstate/index.js';
const SCHEMA_BY_ACTION_NAME_BUILDER = {};
for (const key of Object.keys(RAW_WA_APPSTATE_SCHEMAS)) {
    SCHEMA_BY_ACTION_NAME_BUILDER[RAW_WA_APPSTATE_SCHEMAS[key].name] = key;
}
export const WA_APPSTATE_SCHEMA_BY_ACTION_NAME = Object.freeze(SCHEMA_BY_ACTION_NAME_BUILDER);
export function getAppstateSchemaByActionName(actionName) {
    const key = WA_APPSTATE_SCHEMA_BY_ACTION_NAME[actionName];
    if (!key) {
        return null;
    }
    return { key, schema: RAW_WA_APPSTATE_SCHEMAS[key] };
}
export function resolveEnumObject(protoEnumPath) {
    const segments = protoEnumPath.split('.');
    let cursor = proto.SyncActionValue;
    for (const seg of segments) {
        if (cursor === null || cursor === undefined)
            return null;
        if (typeof cursor !== 'object' && typeof cursor !== 'function')
            return null;
        cursor = cursor[seg];
    }
    if (cursor === null || cursor === undefined)
        return null;
    if (typeof cursor !== 'object' && typeof cursor !== 'function')
        return null;
    return cursor;
}
export function encodeEnumValue(protoEnumPath, name) {
    const enumObj = resolveEnumObject(protoEnumPath);
    if (!enumObj)
        return null;
    const value = enumObj[name];
    return typeof value === 'number' ? value : null;
}
export function decodeEnumValue(protoEnumPath, value) {
    const enumObj = resolveEnumObject(protoEnumPath);
    if (!enumObj)
        return null;
    for (const key of Object.keys(enumObj)) {
        if (enumObj[key] === value)
            return key;
    }
    return null;
}
export function decodeIndexArgsFromSchema(schema, parts) {
    if (parts.length !== schema.indexParts.length) {
        return null;
    }
    const args = {};
    for (let i = 0; i < schema.indexParts.length; i += 1) {
        const part = schema.indexParts[i];
        const raw = parts[i];
        if (part.type === 'literal') {
            continue;
        }
        if (part.type === 'boolString') {
            if (raw !== '0' && raw !== '1')
                return null;
            args[part.name] = raw === '1';
            continue;
        }
        if (part.type === 'jidOrZero') {
            args[part.name] = raw === '0' ? null : raw;
            continue;
        }
        if (part.type === 'enum') {
            const numeric = Number(raw);
            const name = Number.isFinite(numeric) ? decodeEnumValue(part.protoEnum, numeric) : null;
            args[part.name] = name ?? raw;
            continue;
        }
        args[part.name] = raw;
    }
    return args;
}
