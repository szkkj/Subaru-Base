import { readVersionedContent, toSerializedPubKey } from '../../crypto/index.js';
import { proto } from '../../proto.js';
import { SIGNAL_MAC_SIZE, SIGNAL_VERSION } from '../constants.js';
export function deserializeMsg(versionContentMac) {
    const content = readVersionedContent(versionContentMac, SIGNAL_VERSION, SIGNAL_MAC_SIZE);
    const parsed = proto.SignalMessage.decode(content);
    if (parsed.ratchetKey === null ||
        parsed.ratchetKey === undefined ||
        parsed.counter === null ||
        parsed.counter === undefined ||
        parsed.ciphertext === null ||
        parsed.ciphertext === undefined) {
        throw new Error('invalid signal message');
    }
    return {
        ratchetPubKey: toSerializedPubKey(parsed.ratchetKey),
        counter: parsed.counter,
        ciphertext: parsed.ciphertext,
        versionContentMac
    };
}
export function deserializePkMsg(versionContent) {
    const content = readVersionedContent(versionContent, SIGNAL_VERSION, 0);
    const parsed = proto.PreKeySignalMessage.decode(content);
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
            pubKey: toSerializedPubKey(parsed.identityKey)
        },
        sessionBaseKey: toSerializedPubKey(parsed.baseKey),
        localSignedPreKeyId: parsed.signedPreKeyId,
        localOneTimeKeyId: parsed.preKeyId ?? null
    };
}
export async function requireSignedPreKey(store, id) {
    const signedPreKey = await store.getSignedPreKeyById(id);
    if (!signedPreKey) {
        throw new Error(`signed prekey ${id} not found`);
    }
    return signedPreKey;
}
export async function requirePreKey(store, id) {
    const preKey = await store.getPreKeyById(id);
    if (!preKey) {
        throw new Error(`prekey ${id} not found`);
    }
    return preKey;
}
