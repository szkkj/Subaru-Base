import { concatBytes, TEXT_DECODER, TEXT_ENCODER } from '../util/bytes.js';
const RETRY_PAYLOAD_CODEC_MAGIC = 0x5a;
const RETRY_PAYLOAD_CODEC_VERSION = 1;
const RETRY_PAYLOAD_MODE = Object.freeze({
    plaintext: 1,
    encrypted: 2,
    opaque_node: 3
});
const RETRY_PAYLOAD_ENC_TYPE = Object.freeze({
    msg: 1,
    pkmsg: 2,
    skmsg: 3
});
const RETRY_PAYLOAD_ENC_TYPE_REVERSE = Object.freeze({
    1: 'msg',
    2: 'pkmsg',
    3: 'skmsg'
});
/**
 * Encodes a {@link WaRetryReplayPayload} into the on-disk codec format used
 * by the retry store. Supports the `plaintext`/`encrypted`/`opaque_node` modes.
 */
export function encodeRetryReplayPayload(payload) {
    const chunks = [];
    if (payload.mode === 'plaintext') {
        const header = new Uint8Array(3);
        header[0] = RETRY_PAYLOAD_CODEC_MAGIC;
        header[1] = RETRY_PAYLOAD_CODEC_VERSION;
        header[2] = RETRY_PAYLOAD_MODE.plaintext;
        chunks.push(header);
        pushStringField(chunks, payload.to, 'to');
        pushStringField(chunks, payload.type, 'type');
        pushBytesField(chunks, payload.plaintext, 'plaintext');
        return concatBytes(chunks);
    }
    if (payload.mode === 'encrypted') {
        const header = new Uint8Array(3);
        header[0] = RETRY_PAYLOAD_CODEC_MAGIC;
        header[1] = RETRY_PAYLOAD_CODEC_VERSION;
        header[2] = RETRY_PAYLOAD_MODE.encrypted;
        chunks.push(header);
        pushStringField(chunks, payload.to, 'to');
        pushStringField(chunks, payload.type, 'type');
        const hasParticipant = payload.participant !== undefined;
        const modeDetails = new Uint8Array(2);
        modeDetails[0] = RETRY_PAYLOAD_ENC_TYPE[payload.encType];
        modeDetails[1] = hasParticipant ? 1 : 0;
        chunks.push(modeDetails);
        if (hasParticipant) {
            pushStringField(chunks, payload.participant, 'participant');
        }
        pushBytesField(chunks, payload.ciphertext, 'ciphertext');
        return concatBytes(chunks);
    }
    const header = new Uint8Array(3);
    header[0] = RETRY_PAYLOAD_CODEC_MAGIC;
    header[1] = RETRY_PAYLOAD_CODEC_VERSION;
    header[2] = RETRY_PAYLOAD_MODE.opaque_node;
    chunks.push(header);
    pushBytesField(chunks, payload.node, 'node');
    return concatBytes(chunks);
}
/** Inverse of {@link encodeRetryReplayPayload}. Throws on bad magic/version. */
export function decodeRetryReplayPayload(raw) {
    if (raw.byteLength < 3) {
        throw new Error('invalid retry replay payload: unsupported codec version');
    }
    if (raw[0] !== RETRY_PAYLOAD_CODEC_MAGIC || raw[1] !== RETRY_PAYLOAD_CODEC_VERSION) {
        throw new Error('invalid retry replay payload: unsupported codec version');
    }
    return decodeCompactRetryReplayPayload(raw);
}
function decodeEncryptedType(value) {
    const result = RETRY_PAYLOAD_ENC_TYPE_REVERSE[value];
    if (!result) {
        throw new Error(`invalid retry encrypted encType code: ${value}`);
    }
    return result;
}
function pushUint16(chunks, value, field) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
        throw new Error(`invalid retry replay payload ${field} length`);
    }
    const out = new Uint8Array(2);
    out[0] = value >>> 8;
    out[1] = value & 0xff;
    chunks.push(out);
}
function pushUint32(chunks, value, field) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
        throw new Error(`invalid retry replay payload ${field} length`);
    }
    const out = new Uint8Array(4);
    out[0] = (value >>> 24) & 0xff;
    out[1] = (value >>> 16) & 0xff;
    out[2] = (value >>> 8) & 0xff;
    out[3] = value & 0xff;
    chunks.push(out);
}
function pushStringField(chunks, value, field) {
    const encoded = TEXT_ENCODER.encode(value);
    pushUint16(chunks, encoded.byteLength, field);
    chunks.push(encoded);
}
function pushBytesField(chunks, value, field) {
    pushUint32(chunks, value.byteLength, field);
    chunks.push(value);
}
function readUint8(raw, offset, field) {
    if (offset >= raw.byteLength) {
        throw new Error(`invalid retry replay payload field: ${field}`);
    }
    return [raw[offset], offset + 1];
}
function readUint16(raw, offset, field) {
    if (offset + 2 > raw.byteLength) {
        throw new Error(`invalid retry replay payload field: ${field}`);
    }
    return [((raw[offset] << 8) | raw[offset + 1]) >>> 0, offset + 2];
}
function readUint32(raw, offset, field) {
    if (offset + 4 > raw.byteLength) {
        throw new Error(`invalid retry replay payload field: ${field}`);
    }
    return [
        ((raw[offset] << 24) |
            (raw[offset + 1] << 16) |
            (raw[offset + 2] << 8) |
            raw[offset + 3]) >>>
            0,
        offset + 4
    ];
}
function readString(raw, offset, field) {
    const [byteLength, nextOffset] = readUint16(raw, offset, `${field}.length`);
    const endOffset = nextOffset + byteLength;
    if (endOffset > raw.byteLength) {
        throw new Error(`invalid retry replay payload field: ${field}`);
    }
    return [TEXT_DECODER.decode(raw.subarray(nextOffset, endOffset)), endOffset];
}
function readBytes(raw, offset, field) {
    const [byteLength, nextOffset] = readUint32(raw, offset, `${field}.length`);
    const endOffset = nextOffset + byteLength;
    if (endOffset > raw.byteLength) {
        throw new Error(`invalid retry replay payload field: ${field}`);
    }
    return [raw.subarray(nextOffset, endOffset), endOffset];
}
function assertNoTrailingData(raw, offset) {
    if (offset !== raw.byteLength) {
        throw new Error('invalid retry replay payload: trailing data');
    }
}
function decodeCompactRetryReplayPayload(raw) {
    let offset = 0;
    let magic = 0;
    let version = 0;
    let mode = 0;
    [magic, offset] = readUint8(raw, offset, 'magic');
    [version, offset] = readUint8(raw, offset, 'version');
    [mode, offset] = readUint8(raw, offset, 'mode');
    if (magic !== RETRY_PAYLOAD_CODEC_MAGIC || version !== RETRY_PAYLOAD_CODEC_VERSION) {
        throw new Error('invalid retry replay payload: unsupported codec version');
    }
    if (mode === RETRY_PAYLOAD_MODE.plaintext) {
        let to = '';
        let type = '';
        let plaintext = raw;
        [to, offset] = readString(raw, offset, 'to');
        [type, offset] = readString(raw, offset, 'type');
        [plaintext, offset] = readBytes(raw, offset, 'plaintext');
        assertNoTrailingData(raw, offset);
        return {
            mode: 'plaintext',
            to,
            type,
            plaintext
        };
    }
    if (mode === RETRY_PAYLOAD_MODE.encrypted) {
        let to = '';
        let type = '';
        let encTypeCode = 0;
        let hasParticipant = 0;
        let participant;
        let ciphertext = raw;
        [to, offset] = readString(raw, offset, 'to');
        [type, offset] = readString(raw, offset, 'type');
        [encTypeCode, offset] = readUint8(raw, offset, 'encType');
        [hasParticipant, offset] = readUint8(raw, offset, 'hasParticipant');
        if (hasParticipant !== 0 && hasParticipant !== 1) {
            throw new Error('invalid retry replay payload field: hasParticipant');
        }
        if (hasParticipant === 1) {
            ;
            [participant, offset] = readString(raw, offset, 'participant');
        }
        ;
        [ciphertext, offset] = readBytes(raw, offset, 'ciphertext');
        assertNoTrailingData(raw, offset);
        return {
            mode: 'encrypted',
            to,
            type,
            encType: decodeEncryptedType(encTypeCode),
            participant,
            ciphertext
        };
    }
    if (mode === RETRY_PAYLOAD_MODE.opaque_node) {
        let node = raw;
        [node, offset] = readBytes(raw, offset, 'node');
        assertNoTrailingData(raw, offset);
        return {
            mode: 'opaque_node',
            node
        };
    }
    throw new Error(`invalid retry replay payload mode: ${mode}`);
}
