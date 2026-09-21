"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_APPSTATE_SCHEMA_BY_ACTION_NAME = exports.WA_APPSTATE_SCHEMAS = exports.WA_APPSTATE_COLLECTIONS = void 0;
exports.getAppstateSchemaByActionName = getAppstateSchemaByActionName;
exports.resolveEnumObject = resolveEnumObject;
exports.encodeEnumValue = encodeEnumValue;
exports.decodeEnumValue = decodeEnumValue;
exports.decodeIndexArgsFromSchema = decodeIndexArgsFromSchema;
const _proto_1 = require("./proto");
const appstate_1 = require("../spec/appstate");
var appstate_2 = require("../spec/appstate");
Object.defineProperty(exports, "WA_APPSTATE_COLLECTIONS", { enumerable: true, get: function () { return appstate_2.WA_APPSTATE_COLLECTIONS; } });
Object.defineProperty(exports, "WA_APPSTATE_SCHEMAS", { enumerable: true, get: function () { return appstate_2.WA_APPSTATE_SCHEMAS; } });
const SCHEMA_BY_ACTION_NAME_BUILDER = {};
for (const key of Object.keys(appstate_1.WA_APPSTATE_SCHEMAS)) {
    SCHEMA_BY_ACTION_NAME_BUILDER[appstate_1.WA_APPSTATE_SCHEMAS[key].name] = key;
}
exports.WA_APPSTATE_SCHEMA_BY_ACTION_NAME = Object.freeze(SCHEMA_BY_ACTION_NAME_BUILDER);
function getAppstateSchemaByActionName(actionName) {
    const key = exports.WA_APPSTATE_SCHEMA_BY_ACTION_NAME[actionName];
    if (!key) {
        return null;
    }
    return { key, schema: appstate_1.WA_APPSTATE_SCHEMAS[key] };
}
function resolveEnumObject(protoEnumPath) {
    const segments = protoEnumPath.split('.');
    let cursor = _proto_1.proto.SyncActionValue;
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
function encodeEnumValue(protoEnumPath, name) {
    const enumObj = resolveEnumObject(protoEnumPath);
    if (!enumObj)
        return null;
    const value = enumObj[name];
    return typeof value === 'number' ? value : null;
}
function decodeEnumValue(protoEnumPath, value) {
    const enumObj = resolveEnumObject(protoEnumPath);
    if (!enumObj)
        return null;
    for (const key of Object.keys(enumObj)) {
        if (enumObj[key] === value)
            return key;
    }
    return null;
}
function decodeIndexArgsFromSchema(schema, parts) {
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
