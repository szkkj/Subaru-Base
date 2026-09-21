"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeMsg = deserializeMsg;
exports.deserializePkMsg = deserializePkMsg;
exports.requireSignedPreKey = requireSignedPreKey;
exports.requirePreKey = requirePreKey;
const _crypto_1 = require("../../crypto");
const _proto_1 = require("../../proto");
const constants_1 = require("../constants");
function deserializeMsg(versionContentMac) {
    const content = (0, _crypto_1.readVersionedContent)(versionContentMac, constants_1.SIGNAL_VERSION, constants_1.SIGNAL_MAC_SIZE);
    const parsed = _proto_1.proto.SignalMessage.decode(content);
    if (parsed.ratchetKey === null ||
        parsed.ratchetKey === undefined ||
        parsed.counter === null ||
        parsed.counter === undefined ||
        parsed.ciphertext === null ||
        parsed.ciphertext === undefined) {
        throw new Error('invalid signal message');
    }
    return {
        ratchetPubKey: (0, _crypto_1.toSerializedPubKey)(parsed.ratchetKey),
        counter: parsed.counter,
        ciphertext: parsed.ciphertext,
        versionContentMac
    };
}
function deserializePkMsg(versionContent) {
    const content = (0, _crypto_1.readVersionedContent)(versionContent, constants_1.SIGNAL_VERSION, 0);
    const parsed = _proto_1.proto.PreKeySignalMessage.decode(content);
    if (parsed.registrationId === null ||
        parsed.registrationId === undefined ||
        parsed.signedPreKeyId === null ||
        parsed.signedPreKeyId === undefined ||
        parsed.baseKey === null ||
        parsed.baseKey === undefined ||
        parsed.identityKey === null ||
        parsed.identityKey === undefined ||
        parsed.message === null ||
        parsed.message === undefined) {
        throw new Error('invalid prekey signal message');
    }
    const signal = deserializeMsg(parsed.message);
    return {
        ...signal,
        remote: {
            regId: parsed.registrationId,
            pubKey: (0, _crypto_1.toSerializedPubKey)(parsed.identityKey)
        },
        sessionBaseKey: (0, _crypto_1.toSerializedPubKey)(parsed.baseKey),
        localSignedPreKeyId: parsed.signedPreKeyId,
        localOneTimeKeyId: parsed.preKeyId ?? null
    };
}
async function requireSignedPreKey(store, id) {
    const signedPreKey = await store.getSignedPreKeyById(id);
    if (!signedPreKey) {
        throw new Error(`signed prekey ${id} not found`);
    }
    return signedPreKey;
}
async function requirePreKey(store, id) {
    const preKey = await store.getPreKeyById(id);
    if (!preKey) {
        throw new Error(`prekey ${id} not found`);
    }
    return preKey;
}
