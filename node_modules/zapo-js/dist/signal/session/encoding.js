"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeSignalSessionSnapshot = encodeSignalSessionSnapshot;
exports.encodeSignalRecvChain = encodeSignalRecvChain;
exports.decodeSignalMessageKey = decodeSignalMessageKey;
exports.decodeSignalRecvChain = decodeSignalRecvChain;
exports.decodeSignalSessionSnapshot = decodeSignalSessionSnapshot;
exports.encodeSignalSessionRecord = encodeSignalSessionRecord;
exports.decodeSignalSessionRecord = decodeSignalSessionRecord;
exports.decodeSignalRemoteIdentity = decodeSignalRemoteIdentity;
const _proto_1 = require("../../proto");
const bytes_1 = require("../../util/bytes");
const coercion_1 = require("../../util/coercion");
function encodeSignalSessionSnapshot(session) {
    return {
        sessionVersion: 3,
        localRegistrationId: session.local.regId,
        localIdentityPublic: session.local.pubKey,
        remoteRegistrationId: session.remote.regId,
        remoteIdentityPublic: session.remote.pubKey,
        rootKey: session.rootKey,
        previousCounter: session.prevSendChainHighestIndex,
        senderChain: encodeSignalSendChain(session.sendChain),
        receiverChains: session.recvChains,
        pendingPreKey: session.initialExchangeInfo
            ? {
                preKeyId: session.initialExchangeInfo.remoteOneTimeId ?? undefined,
                signedPreKeyId: session.initialExchangeInfo.remoteSignedId,
                baseKey: session.initialExchangeInfo.localOneTimePubKey
            }
            : undefined,
        aliceBaseKey: session.aliceBaseKey ?? undefined
    };
}
function encodeSignalSendChain(chain) {
    return {
        senderRatchetKey: chain.ratchetKey.pubKey,
        senderRatchetKeyPrivate: chain.ratchetKey.privKey,
        chainKey: {
            index: chain.nextMsgIndex,
            key: chain.chainKey
        },
        messageKeys: []
    };
}
function encodeSignalRecvChain(chain) {
    return {
        senderRatchetKey: chain.ratchetPubKey,
        chainKey: {
            index: chain.nextMsgIndex,
            key: chain.chainKey
        },
        messageKeys: chain.unusedMsgKeys
    };
}
function decodeSignalMessageKey(messageKey, field) {
    const cipherKey = (0, coercion_1.asBytes)(messageKey.cipherKey, `${field}.cipherKey`);
    (0, bytes_1.assertByteLength)(cipherKey, 32, `invalid ${field}.cipherKey length ${cipherKey.byteLength}`);
    const macKey = (0, coercion_1.asBytes)(messageKey.macKey, `${field}.macKey`);
    (0, bytes_1.assertByteLength)(macKey, 32, `invalid ${field}.macKey length ${macKey.byteLength}`);
    const iv = (0, coercion_1.asBytes)(messageKey.iv, `${field}.iv`);
    (0, bytes_1.assertByteLength)(iv, 16, `invalid ${field}.iv length ${iv.byteLength}`);
    return {
        index: (0, coercion_1.asNumber)(messageKey.index, `${field}.index`),
        cipherKey,
        macKey,
        iv
    };
}
function decodeSignalRecvChain(chain, field) {
    const chainKey = chain.chainKey;
    if (!chainKey) {
        throw new Error(`missing ${field}.chainKey`);
    }
    const ratchetPubKey = (0, coercion_1.asBytes)(chain.senderRatchetKey, `${field}.senderRatchetKey`);
    (0, bytes_1.assertByteLength)(ratchetPubKey, 33, `invalid ${field}.senderRatchetKey length ${ratchetPubKey.byteLength}`);
    const chainKeyBytes = (0, coercion_1.asBytes)(chainKey.key, `${field}.chainKey.key`);
    (0, bytes_1.assertByteLength)(chainKeyBytes, 32, `invalid ${field}.chainKey.key length ${chainKeyBytes.byteLength}`);
    return {
        ratchetPubKey,
        nextMsgIndex: (0, coercion_1.asNumber)(chainKey.index, `${field}.chainKey.index`),
        chainKey: chainKeyBytes,
        unusedMsgKeys: chain.messageKeys ?? []
    };
}
function decodeSignalSendChain(chain, field) {
    const chainKey = chain.chainKey;
    if (!chainKey) {
        throw new Error(`missing ${field}.chainKey`);
    }
    const privateKey = (0, coercion_1.asOptionalBytes)(chain.senderRatchetKeyPrivate, `${field}.senderRatchetKeyPrivate`);
    if (!privateKey) {
        throw new Error(`missing ${field}.senderRatchetKeyPrivate`);
    }
    (0, bytes_1.assertByteLength)(privateKey, 32, `invalid ${field}.senderRatchetKeyPrivate length ${privateKey.byteLength}`);
    const ratchetPubKey = (0, coercion_1.asBytes)(chain.senderRatchetKey, `${field}.senderRatchetKey`);
    (0, bytes_1.assertByteLength)(ratchetPubKey, 33, `invalid ${field}.senderRatchetKey length ${ratchetPubKey.byteLength}`);
    const chainKeyBytes = (0, coercion_1.asBytes)(chainKey.key, `${field}.chainKey.key`);
    (0, bytes_1.assertByteLength)(chainKeyBytes, 32, `invalid ${field}.chainKey.key length ${chainKeyBytes.byteLength}`);
    return {
        ratchetKey: {
            pubKey: ratchetPubKey,
            privKey: privateKey
        },
        nextMsgIndex: (0, coercion_1.asNumber)(chainKey.index, `${field}.chainKey.index`),
        chainKey: chainKeyBytes
    };
}
function decodeSignalSessionSnapshot(session, field) {
    const senderChain = session.senderChain;
    if (!senderChain) {
        throw new Error(`missing ${field}.senderChain`);
    }
    const pendingPreKey = session.pendingPreKey;
    const localPubKey = (0, coercion_1.asBytes)(session.localIdentityPublic, `${field}.localIdentityPublic`);
    (0, bytes_1.assertByteLength)(localPubKey, 33, `invalid ${field}.localIdentityPublic length ${localPubKey.byteLength}`);
    const remotePubKey = (0, coercion_1.asBytes)(session.remoteIdentityPublic, `${field}.remoteIdentityPublic`);
    (0, bytes_1.assertByteLength)(remotePubKey, 33, `invalid ${field}.remoteIdentityPublic length ${remotePubKey.byteLength}`);
    const rootKey = (0, coercion_1.asBytes)(session.rootKey, `${field}.rootKey`);
    (0, bytes_1.assertByteLength)(rootKey, 32, `invalid ${field}.rootKey length ${rootKey.byteLength}`);
    const localOneTimePubKey = pendingPreKey
        ? (0, coercion_1.asBytes)(pendingPreKey.baseKey, `${field}.pendingPreKey.baseKey`)
        : null;
    if (localOneTimePubKey) {
        (0, bytes_1.assertByteLength)(localOneTimePubKey, 33, `invalid ${field}.pendingPreKey.baseKey length ${localOneTimePubKey.byteLength}`);
    }
    const aliceBaseKey = (0, coercion_1.asOptionalBytes)(session.aliceBaseKey, `${field}.aliceBaseKey`) ?? null;
    if (aliceBaseKey) {
        (0, bytes_1.assertByteLength)(aliceBaseKey, 33, `invalid ${field}.aliceBaseKey length ${aliceBaseKey.byteLength}`);
    }
    return {
        local: {
            regId: (0, coercion_1.asNumber)(session.localRegistrationId, `${field}.localRegistrationId`),
            pubKey: localPubKey
        },
        remote: {
            regId: (0, coercion_1.asNumber)(session.remoteRegistrationId, `${field}.remoteRegistrationId`),
            pubKey: remotePubKey
        },
        rootKey,
        sendChain: decodeSignalSendChain(senderChain, `${field}.senderChain`),
        recvChains: session.receiverChains ?? [],
        initialExchangeInfo: pendingPreKey
            ? {
                remoteOneTimeId: (0, coercion_1.asOptionalNumber)(pendingPreKey.preKeyId, `${field}.pendingPreKey.preKeyId`) ??
                    null,
                remoteSignedId: (0, coercion_1.asNumber)(pendingPreKey.signedPreKeyId, `${field}.pendingPreKey.signedPreKeyId`),
                localOneTimePubKey: localOneTimePubKey
            }
            : null,
        prevSendChainHighestIndex: (0, coercion_1.asOptionalNumber)(session.previousCounter, `${field}.previousCounter`) ?? 0,
        aliceBaseKey
    };
}
const prevSessionsSuffixCache = new WeakMap();
/**
 * Serializes a {@link SignalSessionRecord} (current + previous sessions) into
 * the Signal `RecordStructure` protobuf encoding used by the session stores.
 *
 * The `previousSessions` segment only depends on the `prevSessions` array,
 * which every mutation path replaces wholesale (never edits in place), so its
 * encoded bytes are cached per array instance and only the current session is
 * re-encoded on the per-message write path.
 */
function encodeSignalSessionRecord(record) {
    const prevSessions = record.prevSessions;
    if (prevSessions.length === 0) {
        return _proto_1.proto.RecordStructure.encode({
            currentSession: encodeSignalSessionSnapshot(record)
        }).finish();
    }
    let suffix = prevSessionsSuffixCache.get(prevSessions);
    if (!suffix) {
        suffix = _proto_1.proto.RecordStructure.encode({
            previousSessions: prevSessions
        }).finish();
        prevSessionsSuffixCache.set(prevSessions, suffix);
    }
    const current = _proto_1.proto.RecordStructure.encode({
        currentSession: encodeSignalSessionSnapshot(record)
    }).finish();
    const out = new Uint8Array(current.length + suffix.length);
    out.set(current, 0);
    out.set(suffix, current.length);
    return out;
}
/**
 * Decodes a Signal `RecordStructure` payload (as stored on disk) back into a
 * {@link SignalSessionRecord}. Throws when the current session is missing.
 */
function decodeSignalSessionRecord(raw) {
    const decoded = _proto_1.proto.RecordStructure.decode((0, coercion_1.asBytes)(raw, 'signal_sessions.record'));
    if (!decoded.currentSession) {
        throw new Error('missing signal_sessions.record.currentSession');
    }
    const current = decodeSignalSessionSnapshot(decoded.currentSession, 'signal_sessions.currentSession');
    return {
        ...current,
        prevSessions: decoded.previousSessions ?? []
    };
}
/** Reads a stored remote identity blob into a Uint8Array (validates byte-shape). */
function decodeSignalRemoteIdentity(raw) {
    return (0, coercion_1.asBytes)(raw, 'signal_identity.identity_key');
}
