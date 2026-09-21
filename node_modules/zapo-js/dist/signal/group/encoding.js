"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeSenderKeyRecord = encodeSenderKeyRecord;
exports.decodeSenderKeyRecord = decodeSenderKeyRecord;
exports.decodeSenderKeyDistributionRow = decodeSenderKeyDistributionRow;
const _proto_1 = require("../../proto");
const coercion_1 = require("../../util/coercion");
/** Serializes a {@link SenderKeyRecord} into the Signal `SenderKeyRecordStructure` protobuf. */
function encodeSenderKeyRecord(record) {
    return _proto_1.proto.SenderKeyRecordStructure.encode({
        senderKeyStates: [
            {
                senderKeyId: record.keyId,
                senderChainKey: {
                    iteration: record.iteration,
                    seed: record.chainKey
                },
                senderSigningKey: {
                    public: record.signingPublicKey,
                    private: record.signingPrivateKey
                },
                senderMessageKeys: (() => {
                    const src = record.unusedMessageKeys ?? [];
                    const arr = new Array(src.length);
                    for (let i = 0; i < src.length; i += 1) {
                        const messageKey = src[i];
                        arr[i] = {
                            iteration: messageKey.iteration,
                            seed: messageKey.seed
                        };
                    }
                    return arr;
                })()
            }
        ]
    }).finish();
}
function decodeSenderKeyState(state, field) {
    if (!state.senderChainKey) {
        throw new Error(`missing ${field}.senderChainKey`);
    }
    if (!state.senderSigningKey) {
        throw new Error(`missing ${field}.senderSigningKey`);
    }
    return {
        keyId: (0, coercion_1.asNumber)(state.senderKeyId, `${field}.senderKeyId`),
        iteration: (0, coercion_1.asNumber)(state.senderChainKey.iteration, `${field}.senderChainKey.iteration`),
        chainKey: (0, coercion_1.asBytes)(state.senderChainKey.seed, `${field}.senderChainKey.seed`),
        signingPublicKey: (0, coercion_1.asBytes)(state.senderSigningKey.public, `${field}.senderSigningKey.public`),
        signingPrivateKey: state.senderSigningKey.private !== null && state.senderSigningKey.private !== undefined
            ? (0, coercion_1.asBytes)(state.senderSigningKey.private, `${field}.senderSigningKey.private`)
            : undefined,
        unusedMessageKeys: (() => {
            const src = state.senderMessageKeys ?? [];
            const arr = new Array(src.length);
            for (let i = 0; i < src.length; i += 1) {
                const messageKey = src[i];
                arr[i] = {
                    iteration: (0, coercion_1.asNumber)(messageKey.iteration, `${field}.senderMessageKeys[${i}].iteration`),
                    seed: (0, coercion_1.asBytes)(messageKey.seed, `${field}.senderMessageKeys[${i}].seed`)
                };
            }
            return arr;
        })()
    };
}
/**
 * Decodes a stored sender-key blob into a {@link SenderKeyRecord}.
 * `groupId`/`sender` are re-attached from the row key (not in the protobuf).
 */
function decodeSenderKeyRecord(raw, groupId, sender) {
    const decoded = _proto_1.proto.SenderKeyRecordStructure.decode((0, coercion_1.asBytes)(raw, 'sender_keys.record'));
    const state = decoded.senderKeyStates?.[0];
    if (!state) {
        throw new Error('missing sender_keys.record.senderKeyStates[0]');
    }
    const parsed = decodeSenderKeyState(state, 'sender_keys.record.senderKeyStates[0]');
    return {
        groupId,
        sender,
        keyId: parsed.keyId,
        iteration: parsed.iteration,
        chainKey: parsed.chainKey,
        signingPublicKey: parsed.signingPublicKey,
        signingPrivateKey: parsed.signingPrivateKey,
        unusedMessageKeys: parsed.unusedMessageKeys
    };
}
/** Decodes a sender-key-distribution SQL row into a {@link SenderKeyDistributionRecord}. */
function decodeSenderKeyDistributionRow(row) {
    return {
        groupId: (0, coercion_1.asString)(row.group_id, 'sender_key_distribution.group_id'),
        sender: {
            user: (0, coercion_1.asString)(row.sender_user, 'sender_key_distribution.sender_user'),
            server: (0, coercion_1.asString)(row.sender_server, 'sender_key_distribution.sender_server'),
            device: (0, coercion_1.asNumber)(row.sender_device, 'sender_key_distribution.sender_device')
        },
        keyId: (0, coercion_1.asNumber)(row.key_id, 'sender_key_distribution.key_id'),
        timestampMs: (0, coercion_1.asNumber)(row.timestamp_ms, 'sender_key_distribution.timestamp_ms')
    };
}
