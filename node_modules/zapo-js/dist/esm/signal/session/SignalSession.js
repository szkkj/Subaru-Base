import { hkdfSplit, toRawPubKey, toSerializedPubKey, X25519 } from '../../crypto/index.js';
import { SIGNAL_PREFIX, WHISPER_RATCHET_INFO, WHISPER_TEXT_INFO } from '../constants.js';
import { decodeSignalSessionSnapshot, encodeSignalSessionSnapshot } from '../session/encoding.js';
import { concatBytes, uint8Equal } from '../../util/bytes.js';
export function snapshotToRecord(snapshot) {
    return {
        ...snapshot,
        prevSessions: []
    };
}
export function findMatchingSession(session, sessionBaseKey) {
    if (!session) {
        return null;
    }
    const serializedBaseKey = toSerializedPubKey(sessionBaseKey);
    if (session.aliceBaseKey && uint8Equal(session.aliceBaseKey, serializedBaseKey)) {
        return session;
    }
    for (let index = 0; index < session.prevSessions.length; index += 1) {
        const rawPrev = session.prevSessions[index];
        if (!rawPrev.aliceBaseKey || !uint8Equal(rawPrev.aliceBaseKey, serializedBaseKey)) {
            continue;
        }
        const decoded = decodeSignalSessionSnapshot(rawPrev, `prevSessions[${index}]`);
        const prevSessions = [encodeSignalSessionSnapshot(session)];
        for (let i = 0; i < session.prevSessions.length; i += 1) {
            if (i !== index) {
                prevSessions.push(session.prevSessions[i]);
            }
        }
        return {
            ...decoded,
            prevSessions
        };
    }
    return null;
}
export async function requireLocalIdentity(store) {
    const registration = await store.getRegistrationInfo();
    if (!registration) {
        throw new Error('registration info not found');
    }
    return {
        regId: registration.registrationId,
        staticKeyPair: toSerializedKeyPair(registration.identityKeyPair)
    };
}
export async function initiateSessionOutgoing(local, remoteBundle, localOneTimeBase) {
    const remoteIdentity = toSerializedPubKey(remoteBundle.identity);
    const remoteSignedKey = toSerializedPubKey(remoteBundle.signedKey.publicKey);
    const remoteOneTimeKey = remoteBundle.oneTimeKey
        ? toSerializedPubKey(remoteBundle.oneTimeKey.publicKey)
        : null;
    const remoteRatchetKey = toSerializedPubKey(remoteBundle.ratchetKey ?? remoteBundle.signedKey.publicKey);
    const [signedDh, identityDh, baseDh, oneTimeDh] = await Promise.all([
        ecdh(local.staticKeyPair.privKey, remoteSignedKey),
        ecdh(localOneTimeBase.privKey, remoteIdentity),
        ecdh(localOneTimeBase.privKey, remoteSignedKey),
        remoteOneTimeKey
            ? ecdh(localOneTimeBase.privKey, remoteOneTimeKey)
            : Promise.resolve(null)
    ]);
    const secret = concatBytes([
        SIGNAL_PREFIX,
        signedDh,
        identityDh,
        baseDh,
        ...(oneTimeDh ? [oneTimeDh] : [])
    ]);
    const [rootKey, chainKey] = hkdfSplit(secret, null, WHISPER_TEXT_INFO);
    const recvChain = {
        senderRatchetKey: remoteRatchetKey,
        chainKey: { index: 0, key: chainKey },
        messageKeys: []
    };
    const sendRatchet = await generateSerializedKeyPair();
    const sendRatchetResult = await calculateRatchet(rootKey, sendRatchet, remoteRatchetKey);
    return {
        local: { regId: local.regId, pubKey: local.staticKeyPair.pubKey },
        remote: { regId: remoteBundle.regId, pubKey: remoteIdentity },
        rootKey: sendRatchetResult.rootKey,
        recvChains: [recvChain],
        sendChain: {
            ratchetKey: sendRatchet,
            nextMsgIndex: 0,
            chainKey: sendRatchetResult.chainKey
        },
        initialExchangeInfo: {
            remoteOneTimeId: remoteBundle.oneTimeKey?.id ?? null,
            remoteSignedId: remoteBundle.signedKey.id,
            localOneTimePubKey: localOneTimeBase.pubKey
        },
        prevSendChainHighestIndex: 0,
        prevSessions: [],
        aliceBaseKey: localOneTimeBase.pubKey
    };
}
export async function initiateSessionIncoming(local, remote, sessionBaseKey, localKeys) {
    const baseKey = toSerializedPubKey(sessionBaseKey);
    const remotePub = toSerializedPubKey(remote.pubKey);
    const [identityDh, staticDh, signedDh, oneTimeDh] = await Promise.all([
        ecdh(localKeys.signed.privKey, remotePub),
        ecdh(local.staticKeyPair.privKey, baseKey),
        ecdh(localKeys.signed.privKey, baseKey),
        localKeys.oneTime
            ? ecdh(localKeys.oneTime.privKey, baseKey)
            : Promise.resolve(null)
    ]);
    const secret = concatBytes([
        SIGNAL_PREFIX,
        identityDh,
        staticDh,
        signedDh,
        ...(oneTimeDh ? [oneTimeDh] : [])
    ]);
    const [rootKey, chainKey] = hkdfSplit(secret, null, WHISPER_TEXT_INFO);
    return {
        local: { regId: local.regId, pubKey: local.staticKeyPair.pubKey },
        remote: { regId: remote.regId, pubKey: remotePub },
        rootKey,
        recvChains: [],
        sendChain: {
            ratchetKey: localKeys.ratchet,
            nextMsgIndex: 0,
            chainKey
        },
        initialExchangeInfo: null,
        prevSendChainHighestIndex: 0,
        prevSessions: [],
        aliceBaseKey: baseKey
    };
}
export async function calculateRatchet(rootKey, localRatchet, remoteRatchetPubKey) {
    const sharedSecret = await ecdh(localRatchet.privKey, remoteRatchetPubKey);
    const [nextRootKey, chainKey] = hkdfSplit(sharedSecret, rootKey, WHISPER_RATCHET_INFO);
    return {
        rootKey: nextRootKey,
        chainKey
    };
}
export async function generateSerializedKeyPair() {
    const pair = await X25519.generateKeyPair();
    return toSerializedKeyPair(pair);
}
export function toSerializedKeyPair(pair) {
    return {
        pubKey: toSerializedPubKey(pair.pubKey),
        privKey: pair.privKey
    };
}
export async function ecdh(privateKey, publicKey) {
    return await X25519.scalarMult(privateKey, toRawPubKey(publicKey));
}
