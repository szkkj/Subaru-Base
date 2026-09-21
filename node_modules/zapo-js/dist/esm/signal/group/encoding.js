import { proto } from '../../proto.js';
import { asBytes, asNumber, asString } from '../../util/coercion.js';
/** Serializes a {@link SenderKeyRecord} into the Signal `SenderKeyRecordStructure` protobuf. */
export function encodeSenderKeyRecord(record) {
    return proto.SenderKeyRecordStructure.encode({
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
        keyId: asNumber(state.senderKeyId, `${field}.senderKeyId`),
        iteration: asNumber(state.senderChainKey.iteration, `${field}.senderChainKey.iteration`),
        chainKey: asBytes(state.senderChainKey.seed, `${field}.senderChainKey.seed`),
        signingPublicKey: asBytes(state.senderSigningKey.public, `${field}.senderSigningKey.public`),
        signingPrivateKey: state.senderSigningKey.private !== null && state.senderSigningKey.private !== undefined
            ? asBytes(state.senderSigningKey.private, `${field}.senderSigningKey.private`)
            : undefined,
        unusedMessageKeys: (() => {
            const src = state.senderMessageKeys ?? [];
            const arr = new Array(src.length);
            for (let i = 0; i < src.length; i += 1) {
                const messageKey = src[i];
                arr[i] = {
                    iteration: asNumber(messageKey.iteration, `${field}.senderMessageKeys[${i}].iteration`),
                    seed: asBytes(messageKey.seed, `${field}.senderMessageKeys[${i}].seed`)
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
export function decodeSenderKeyRecord(raw, groupId, sender) {
    const decoded = proto.SenderKeyRecordStructure.decode(asBytes(raw, 'sender_keys.record'));
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
export function decodeSenderKeyDistributionRow(row) {
    return {
        groupId: asString(row.group_id, 'sender_key_distribution.group_id'),
        sender: {
            user: asString(row.sender_user, 'sender_key_distribution.sender_user'),
            server: asString(row.sender_server, 'sender_key_distribution.sender_server'),
            device: asNumber(row.sender_device, 'sender_key_distribution.sender_device')
        },
        keyId: asNumber(row.key_id, 'sender_key_distribution.key_id'),
        timestampMs: asNumber(row.timestamp_ms, 'sender_key_distribution.timestamp_ms')
    };
}
