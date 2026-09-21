import { hkdf, hmacSha256Sign } from '../../crypto/index.js';
import { proto } from '../../proto.js';
import { base64ToBytesChecked, concatBytes, EMPTY_BYTES, TEXT_ENCODER } from '../../util/bytes.js';
import { PROTO_WIRE_TYPES, scanProtoFields } from '../../util/protoscan.js';
const WA_REPORTING_TOKEN_BYTES = 16;
const WA_REPORTING_TOKEN_KEY_BYTES = 32;
const WA_REPORTING_TOKEN_USE_CASE = 'Report Token';
const WA_REPORTING_TOKEN_CONFIG_BASE64 = 'CgQIARIACjQIAxIwKgQIAhIAKgQIAxIAKgQICBIAKgQICxIAKhAIERIMKgQIFRIAKgQIFhIAKgQIGRIACioIBBImCAIqBggBEgIIAioGCBASAggCKhIIERIOCAIqBAgVEgAqBAgWEgAKOggFEjYIAioGCAMSAggCKgYIBBICCAIqBggFEgIIAioGCBASAggCKhIIERIOCAIqBAgVEgAqBAgWEgAKIggGEh4qBAgBEgAqEAgREgwqBAgVEgAqBAgWEgAqBAgeEgAKLggHEioqBAgCEgAqBAgHEgAqBAgKEgAqEAgREgwqBAgVEgAqBAgWEgAqBAgUEgAKLggIEioqBAgCEgAqBAgHEgAqBAgJEgAqEAgREgwqBAgVEgAqBAgWEgAqBAgVEgAKNAgJEjAqBAgCEgAqBAgGEgAqBAgHEgAqBAgNEgAqEAgREgwqBAgVEgAqBAgWEgAqBAgUEgAKKAgMEiQIAioGCAESAggCKgYIAhICCAIqCAgOEgQIAiABKgYIDxICCAIKKggSEiYIAioGCAYSAggCKgYIEBICCAIqEggREg4IAioECBUSACoECBYSAAouCBoSKioECAQSACoECAUSACoECAgSACoECA0SACoQCBESDCoECBUSACoECBYSAApCCBwSPggCKgYIARICCAIqBggCEgIIAioGCAQSAggCKgYIBRICCAIqBggGEgIIAioSCAcSDggCKgQIFRIAKgQIFhIACgwIJRIIKgYIARICIAEKUggxEk4IAioGCAISAggCKhYIAxISCAIqBggBEgIIAioGCAISAggCKhIIBRIOCAIqBAgVEgAqBAgWEgAqFggIEhIIAioGCAESAggCKgYIAhICCAIKDAg1EggqBggBEgIgAQoOCDcSCggCKgYIARICIAEKDgg6EgoIAioGCAESAiABCg4IOxIKCAIqBggBEgIgAQpSCDwSTggCKgYIAhICCAIqFggDEhIIAioGCAESAggCKgYIAhICCAIqEggFEg4IAioECBUSACoECBYSACoWCAgSEggCKgYIARICCAIqBggCEgIIAgpSCEASTggCKgYIAhICCAIqFggDEhIIAioGCAESAggCKgYIAhICCAIqEggFEg4IAioECBUSACoECBYSACoWCAgSEggCKgYIARICCAIqBggCEgIIAgo2CEISMggCKgQIAhIAKgQIBhIAKgQIBxIAKgQIDRIAKhAIERIMKgQIFRIAKgQIFhIAKgQIFBIACg4IShIKCAIqBggBEgIgAQoOCFcSCggCKgYIARICIAEKMghYEi4IAioGCAESAggCKg4IAhIKCAIqBggBEgIIAioSCAMSDggCKgQIFRIAKgQIFhIACg4IXBIKCAIqBggBEgIgAQoOCF0SCggCKgYIARICIAEKDgheEgoIAioGCAESAiAB';
const WA_REPORTING_TOKEN_CONFIG_BYTES = base64ToBytesChecked(WA_REPORTING_TOKEN_CONFIG_BASE64, 'reporting_token.config');
export const WA_REPORTING_TOKEN_VERSION = 2;
let reportingTokenConfigSpec = null;
const reportingTokenConfigCache = new Map();
export function buildReportingTokenArtifacts(input) {
    const stanzaId = input.stanzaId.trim();
    if (!stanzaId || !isMessageReportingTokenCompatible(input.message)) {
        return null;
    }
    const messageSecret = input.message.messageContextInfo?.messageSecret;
    if (!messageSecret || messageSecret.byteLength === 0) {
        return null;
    }
    const reportingTokenContent = computeReportingTokenContent(input.messageBytes ?? proto.Message.encode(input.message).finish(), input.version ?? WA_REPORTING_TOKEN_VERSION);
    if (reportingTokenContent.byteLength === 0) {
        return null;
    }
    const secretInfo = TEXT_ENCODER.encode(stanzaId + input.senderUserJid + input.remoteJid + WA_REPORTING_TOKEN_USE_CASE);
    const reportingTokenKey = hkdf(messageSecret, null, secretInfo, WA_REPORTING_TOKEN_KEY_BYTES);
    const reportingToken = hmacSha256Sign(reportingTokenKey, reportingTokenContent).subarray(0, WA_REPORTING_TOKEN_BYTES);
    const version = input.version ?? WA_REPORTING_TOKEN_VERSION;
    return {
        node: {
            tag: 'reporting',
            attrs: {},
            content: [
                {
                    tag: 'reporting_token',
                    attrs: {
                        v: String(version)
                    },
                    content: reportingToken
                }
            ]
        },
        version,
        reportingToken,
        reportingTokenContent,
        reportingTokenKey
    };
}
function isMessageReportingTokenCompatible(message) {
    return (!message.reactionMessage &&
        !message.encReactionMessage &&
        !message.encEventResponseMessage &&
        !message.pollUpdateMessage);
}
function computeReportingTokenContent(messageBytes, version) {
    const reportingConfig = getReportingTokenConfig(version);
    const extracted = extractProtobufFieldParts(messageBytes, 0, messageBytes.length, reportingConfig, reportingConfig);
    if (extracted.totalSize === 0) {
        return EMPTY_BYTES;
    }
    const parts = new Array(extracted.parts.length);
    for (let index = 0; index < extracted.parts.length; index += 1) {
        parts[index] = extracted.parts[index].bytes;
    }
    return concatBytes(parts);
}
function getReportingTokenConfig(version) {
    const cached = reportingTokenConfigCache.get(version);
    if (cached) {
        return cached;
    }
    const spec = getReportingTokenConfigSpec();
    const fields = new Map();
    for (const [fieldNumber, fieldSpec] of spec.fields) {
        const selectedField = selectFieldForVersion(version, fieldNumber, fieldSpec);
        if (selectedField) {
            fields.set(fieldNumber, selectedField);
        }
    }
    const config = { fields };
    reportingTokenConfigCache.set(version, config);
    return config;
}
function getReportingTokenConfigSpec() {
    if (reportingTokenConfigSpec) {
        return reportingTokenConfigSpec;
    }
    reportingTokenConfigSpec = parseReportingTokenConfigSpec(WA_REPORTING_TOKEN_CONFIG_BYTES);
    return reportingTokenConfigSpec;
}
function parseReportingTokenConfigSpec(bytes) {
    const fields = new Map();
    scanProtoFields(bytes, 0, bytes.length, (field) => {
        if (field.fieldNumber === 1 && field.wireType === PROTO_WIRE_TYPES.LEN) {
            const parsedEntry = parseReportingTokenConfigMapEntry(bytes, field.valueStart, field.valueEnd);
            if (parsedEntry) {
                fields.set(parsedEntry.key, parsedEntry.value);
            }
        }
    });
    return { fields };
}
function parseReportingTokenConfigMapEntry(bytes, start, end) {
    let key = null;
    let value = null;
    scanProtoFields(bytes, start, end, (field) => {
        if (field.fieldNumber === 1 && field.wireType === PROTO_WIRE_TYPES.VARINT) {
            key = field.varintValue;
        }
        else if (field.fieldNumber === 2 && field.wireType === PROTO_WIRE_TYPES.LEN) {
            value = parseReportingTokenFieldSpec(bytes, field.valueStart, field.valueEnd);
        }
    });
    if (key === null || value === null) {
        return null;
    }
    return { key, value };
}
function parseReportingTokenFieldSpec(bytes, start, end) {
    let minVersion = 1;
    let maxVersion = null;
    let isMessage = false;
    const subfields = new Map();
    scanProtoFields(bytes, start, end, (field) => {
        if (field.wireType === PROTO_WIRE_TYPES.VARINT) {
            if (field.fieldNumber === 1) {
                minVersion = field.varintValue;
            }
            else if (field.fieldNumber === 2) {
                maxVersion = field.varintValue;
            }
            else if (field.fieldNumber === 4) {
                isMessage = field.varintValue !== 0;
            }
            return;
        }
        if (field.fieldNumber === 5 && field.wireType === PROTO_WIRE_TYPES.LEN) {
            const parsedEntry = parseReportingTokenConfigMapEntry(bytes, field.valueStart, field.valueEnd);
            if (parsedEntry) {
                subfields.set(parsedEntry.key, parsedEntry.value);
            }
        }
    });
    return {
        minVersion,
        maxVersion,
        isMessage,
        subfields: subfields.size > 0 ? subfields : null
    };
}
function selectFieldForVersion(version, fieldNumber, fieldSpec) {
    if (version < fieldSpec.minVersion) {
        return null;
    }
    if (fieldSpec.maxVersion !== null && version > fieldSpec.maxVersion) {
        return null;
    }
    if (!fieldSpec.subfields) {
        return {
            fieldNumber,
            isMessage: fieldSpec.isMessage,
            subfields: null
        };
    }
    const selectedSubfields = new Map();
    for (const [subFieldNumber, subFieldSpec] of fieldSpec.subfields) {
        const selectedField = selectFieldForVersion(version, subFieldNumber, subFieldSpec);
        if (selectedField) {
            selectedSubfields.set(subFieldNumber, selectedField);
        }
    }
    return {
        fieldNumber,
        isMessage: fieldSpec.isMessage,
        subfields: {
            fields: selectedSubfields
        }
    };
}
function extractProtobufFieldParts(bytes, start, end, config, rootConfig) {
    const parts = [];
    let totalSize = 0;
    scanProtoFields(bytes, start, end, (parsedField) => {
        const configuredField = config.fields.get(parsedField.fieldNumber);
        if (!configuredField) {
            return;
        }
        if (!configuredField.isMessage &&
            (!configuredField.subfields || configuredField.subfields.fields.size === 0)) {
            const fieldBytes = bytes.subarray(parsedField.headerStart, parsedField.valueEnd);
            parts.push({
                fieldNumber: parsedField.fieldNumber,
                bytes: fieldBytes
            });
            totalSize += fieldBytes.length;
            return;
        }
        if (parsedField.wireType !== PROTO_WIRE_TYPES.LEN) {
            return;
        }
        const nestedConfig = configuredField.isMessage ? rootConfig : configuredField.subfields;
        if (!nestedConfig) {
            return;
        }
        const nestedFields = extractProtobufFieldParts(bytes, parsedField.valueStart, parsedField.valueEnd, nestedConfig, rootConfig);
        if (nestedFields.parts.length === 0 || nestedFields.totalSize === 0) {
            return;
        }
        const tagBytes = encodeVarint(parsedField.fieldNumber * 8 + parsedField.wireType);
        const nestedLengthBytes = encodeVarint(nestedFields.totalSize);
        const fieldBytes = new Uint8Array(tagBytes.length + nestedLengthBytes.length + nestedFields.totalSize);
        fieldBytes.set(tagBytes, 0);
        fieldBytes.set(nestedLengthBytes, tagBytes.length);
        let nestedOffset = tagBytes.length + nestedLengthBytes.length;
        for (const nestedPart of nestedFields.parts) {
            fieldBytes.set(nestedPart.bytes, nestedOffset);
            nestedOffset += nestedPart.bytes.length;
        }
        parts.push({
            fieldNumber: parsedField.fieldNumber,
            bytes: fieldBytes
        });
        totalSize += fieldBytes.length;
    });
    parts.sort((left, right) => left.fieldNumber - right.fieldNumber);
    return {
        parts,
        totalSize
    };
}
function encodeVarint(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`invalid varint value: ${value}`);
    }
    const bytes = new Uint8Array(10);
    let length = 0;
    let current = value;
    while (current >= 128) {
        bytes[length] = (current % 128) + 128;
        length += 1;
        current = Math.floor(current / 128);
    }
    bytes[length] = current;
    length += 1;
    return bytes.subarray(0, length);
}
