"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshotToRecord = snapshotToRecord;
exports.findMatchingSession = findMatchingSession;
exports.requireLocalIdentity = requireLocalIdentity;
exports.initiateSessionOutgoing = initiateSessionOutgoing;
exports.initiateSessionIncoming = initiateSessionIncoming;
exports.calculateRatchet = calculateRatchet;
exports.generateSerializedKeyPair = generateSerializedKeyPair;
exports.toSerializedKeyPair = toSerializedKeyPair;
exports.ecdh = ecdh;
const _crypto_1 = require("../../crypto");
const constants_1 = require("../constants");
const encoding_1 = require("../session/encoding");
const bytes_1 = require("../../util/bytes");
function snapshotToRecord(snapshot) {
    return {
        ...snapshot,
        prevSessions: []
    };
}
function findMatchingSession(session, sessionBaseKey) {
    if (!session) {
        return null;
    }
    const serializedBaseKey = (0, _crypto_1.toSerializedPubKey)(sessionBaseKey);
    if (session.aliceBaseKey && (0, bytes_1.uint8Equal)(session.aliceBaseKey, serializedBaseKey)) {
        return session;
    }
    for (let index = 0; index < session.prevSessions.length; index += 1) {
        const rawPrev = session.prevSessions[index];
        if (!rawPrev.aliceBaseKey || !(0, bytes_1.uint8Equal)(rawPrev.aliceBaseKey, serializedBaseKey)) {
            continue;
        }
        const decoded = (0, encoding_1.decodeSignalSessionSnapshot)(rawPrev, `prevSessions[${index}]`);
        const prevSessions = [(0, encoding_1.encodeSignalSessionSnapshot)(session)];
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
async function requireLocalIdentity(store) {
    const registration = await store.getRegistrationInfo();
    if (!registration) {
        throw new Error('registration info not found');
    }
    return {
        regId: registration.registrationId,
        staticKeyPair: toSerializedKeyPair(registration.identityKeyPair)
    };
}
async function initiateSessionOutgoing(local, remoteBundle, localOneTimeBase) {
    const remoteIdentity = (0, _crypto_1.toSerializedPubKey)(remoteBundle.identity);
    const remoteSignedKey = (0, _crypto_1.toSerializedPubKey)(remoteBundle.signedKey.publicKey);
    const remoteOneTimeKey = remoteBundle.oneTimeKey
        ? (0, _crypto_1.toSerializedPubKey)(remoteBundle.oneTimeKey.publicKey)
        : null;
    const remoteRatchetKey = (0, _crypto_1.toSerializedPubKey)(remoteBundle.ratchetKey ?? remoteBundle.signedKey.publicKey);
    const [signedDh, identityDh, baseDh, oneTimeDh] = await Promise.all([
        ecdh(local.staticKeyPair.privKey, remoteSignedKey),
        ecdh(localOneTimeBase.privKey, remoteIdentity),
        ecdh(localOneTimeBase.privKey, remoteSignedKey),
        remoteOneTimeKey
            ? ecdh(localOneTimeBase.privKey, remoteOneTimeKey)
            : Promise.resolve(null)
    ]);
    const secret = (0, bytes_1.concatBytes)([
        constants_1.SIGNAL_PREFIX,
        signedDh,
        identityDh,
        baseDh,
        ...(oneTimeDh ? [oneTimeDh] : [])
    ]);
    const [rootKey, chainKey] = (0, _crypto_1.hkdfSplit)(secret, null, constants_1.WHISPER_TEXT_INFO);
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
async function initiateSessionIncoming(local, remote, sessionBaseKey, localKeys) {
    const baseKey = (0, _crypto_1.toSerializedPubKey)(sessionBaseKey);
    const remotePub = (0, _crypto_1.toSerializedPubKey)(remote.pubKey);
    const [identityDh, staticDh, signedDh, oneTimeDh] = await Promise.all([
        ecdh(localKeys.signed.privKey, remotePub),
        ecdh(local.staticKeyPair.privKey, baseKey),
        ecdh(localKeys.signed.privKey, baseKey),
        localKeys.oneTime
            ? ecdh(localKeys.oneTime.privKey, baseKey)
            : Promise.resolve(null)
    ]);
    const secret = (0, bytes_1.concatBytes)([
        constants_1.SIGNAL_PREFIX,
        identityDh,
        staticDh,
        signedDh,
        ...(oneTimeDh ? [oneTimeDh] : [])
    ]);
    const [rootKey, chainKey] = (0, _crypto_1.hkdfSplit)(secret, null, constants_1.WHISPER_TEXT_INFO);
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
async function calculateRatchet(rootKey, localRatchet, remoteRatchetPubKey) {
    const sharedSecret = await ecdh(localRatchet.privKey, remoteRatchetPubKey);
    const [nextRootKey, chainKey] = (0, _crypto_1.hkdfSplit)(sharedSecret, rootKey, constants_1.WHISPER_RATCHET_INFO);
    return {
        rootKey: nextRootKey,
        chainKey
    };
}
async function generateSerializedKeyPair() {
    const pair = await _crypto_1.X25519.generateKeyPair();
    return toSerializedKeyPair(pair);
}
function toSerializedKeyPair(pair) {
    return {
        pubKey: (0, _crypto_1.toSerializedPubKey)(pair.pubKey),
        privKey: pair.privKey
    };
}
async function ecdh(privateKey, publicKey) {
    return await _crypto_1.X25519.scalarMult(privateKey, (0, _crypto_1.toRawPubKey)(publicKey));
}
