"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveMsgKey = deriveMsgKey;
exports.selectMessageKey = selectMessageKey;
exports.encryptMsg = encryptMsg;
exports.decryptMsg = decryptMsg;
exports.decryptMsgFromSession = decryptMsgFromSession;
const _crypto_1 = require("../../crypto");
const _proto_1 = require("../../proto");
const constants_1 = require("../constants");
const encoding_1 = require("../session/encoding");
const SignalSession_1 = require("../session/SignalSession");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
const MAX_TRACKED_RECV_CHAINS = 4;
function splitMsgKey(index, bytes) {
    if (bytes.length < 80) {
        throw new Error('invalid message key length');
    }
    return {
        index,
        cipherKey: bytes.subarray(0, 32),
        macKey: bytes.subarray(32, 64),
        iv: bytes.subarray(64, 80)
    };
}
function deriveMsgKey(index, chainKey) {
    return deriveMsgKeyFromChainKey(index, chainKey);
}
function selectMessageKey(chain, targetCounter) {
    const delta = targetCounter - chain.nextMsgIndex;
    if (delta > constants_1.FUTURE_MESSAGES_MAX) {
        throw new Error('message too far in future');
    }
    const unused = chain.unusedMsgKeys;
    if (delta < 0) {
        const idx = unused.findIndex((entry) => entry.index === targetCounter);
        if (idx === -1) {
            throw new Error('duplicate message');
        }
        const messageKey = (0, encoding_1.decodeSignalMessageKey)(unused[idx], `unusedMsgKeys[${idx}]`);
        const nextUnused = (0, bytes_1.removeAt)(unused, idx);
        return {
            messageKey,
            updatedChain: {
                ratchetPubKey: chain.ratchetPubKey,
                nextMsgIndex: chain.nextMsgIndex,
                chainKey: chain.chainKey,
                unusedMsgKeys: nextUnused
            }
        };
    }
    let chainKey = chain.chainKey;
    const first = deriveMsgKeyFromChainKey(chain.nextMsgIndex, chainKey);
    let currentMessageKey = first.messageKey;
    chainKey = first.nextChainKey;
    if (delta === 0) {
        return {
            messageKey: currentMessageKey,
            updatedChain: {
                ratchetPubKey: chain.ratchetPubKey,
                nextMsgIndex: targetCounter + 1,
                chainKey,
                unusedMsgKeys: unused
            }
        };
    }
    const nextUnused = unused.slice();
    let overflow = delta + unused.length - constants_1.MAX_UNUSED_KEYS;
    if (overflow > 0) {
        nextUnused.splice(0, overflow);
        overflow -= unused.length;
    }
    for (let counter = chain.nextMsgIndex + 1; counter <= targetCounter; counter += 1) {
        if (overflow > 0) {
            overflow -= 1;
        }
        else {
            nextUnused.push({
                index: currentMessageKey.index,
                cipherKey: currentMessageKey.cipherKey,
                macKey: currentMessageKey.macKey,
                iv: currentMessageKey.iv
            });
        }
        const derived = deriveMsgKeyFromChainKey(counter, chainKey);
        currentMessageKey = derived.messageKey;
        chainKey = derived.nextChainKey;
    }
    return {
        messageKey: currentMessageKey,
        updatedChain: {
            ratchetPubKey: chain.ratchetPubKey,
            nextMsgIndex: targetCounter + 1,
            chainKey,
            unusedMsgKeys: nextUnused
        }
    };
}
function deriveMsgKeyFromChainKey(index, chainKey) {
    const nextChainRaw = (0, _crypto_1.hmacSha256Sign)(chainKey, constants_1.CHAIN_KEY_LABEL);
    const messageInputKey = (0, _crypto_1.hmacSha256Sign)(chainKey, constants_1.MESSAGE_KEY_LABEL);
    const nextChainKey = nextChainRaw.subarray(0, 32);
    const expanded = (0, _crypto_1.hkdf)(messageInputKey, null, constants_1.WHISPER_MESSAGE_KEYS_INFO, 80);
    return {
        nextChainKey,
        messageKey: splitMsgKey(index, expanded)
    };
}
function encryptMsg(session, plaintext) {
    const { nextChainKey, messageKey } = deriveMsgKey(session.sendChain.nextMsgIndex, session.sendChain.chainKey);
    const ciphertext = (0, _crypto_1.aesCbcEncrypt)(messageKey.cipherKey, messageKey.iv, plaintext);
    const signalPayload = _proto_1.proto.SignalMessage.encode({
        ratchetKey: session.sendChain.ratchetKey.pubKey,
        counter: messageKey.index,
        previousCounter: session.prevSendChainHighestIndex,
        ciphertext
    }).finish();
    const versionedLength = 1 + signalPayload.length;
    const signalMessage = new Uint8Array(versionedLength + constants_1.SIGNAL_MAC_SIZE);
    signalMessage[0] = ((constants_1.SIGNAL_VERSION << 4) | constants_1.SIGNAL_VERSION) & 0xff;
    signalMessage.set(signalPayload, 1);
    const mac = (0, _crypto_1.hmacSha256Sign)(messageKey.macKey, [
        session.local.pubKey,
        session.remote.pubKey,
        signalMessage.subarray(0, versionedLength)
    ]);
    signalMessage.set(mac.subarray(0, constants_1.SIGNAL_MAC_SIZE), versionedLength);
    let type = 'msg';
    let output = signalMessage;
    if (session.initialExchangeInfo) {
        const preKeyPayload = _proto_1.proto.PreKeySignalMessage.encode({
            registrationId: session.local.regId,
            preKeyId: session.initialExchangeInfo.remoteOneTimeId ?? undefined,
            signedPreKeyId: session.initialExchangeInfo.remoteSignedId,
            baseKey: session.initialExchangeInfo.localOneTimePubKey,
            identityKey: session.local.pubKey,
            message: signalMessage
        }).finish();
        type = 'pkmsg';
        output = (0, _crypto_1.prependVersion)(preKeyPayload, constants_1.SIGNAL_VERSION);
    }
    const updated = {
        ...session,
        sendChain: {
            ratchetKey: session.sendChain.ratchetKey,
            nextMsgIndex: messageKey.index + 1,
            chainKey: nextChainKey
        }
    };
    return [updated, { type, ciphertext: output }];
}
async function decryptMsg(session, parsed, onPrevSessionDecryptError) {
    if (!session) {
        throw new Error('signal session not found');
    }
    try {
        const [updatedSession, plaintext] = await decryptMsgFromSession(session, parsed);
        return {
            updatedSession,
            plaintext,
            newSessionInfo: null
        };
    }
    catch (error) {
        for (let i = 0; i < session.prevSessions.length; i += 1) {
            try {
                const decodedPrev = (0, encoding_1.decodeSignalSessionSnapshot)(session.prevSessions[i], `prevSessions[${i}]`);
                const prevSession = (0, SignalSession_1.snapshotToRecord)(decodedPrev);
                const [updatedPrev, plaintext] = await decryptMsgFromSession(prevSession, parsed);
                const updatedSession = {
                    ...updatedPrev,
                    prevSessions: [
                        (0, encoding_1.encodeSignalSessionSnapshot)(session),
                        ...session.prevSessions.slice(0, i),
                        ...session.prevSessions.slice(i + 1)
                    ]
                };
                return {
                    updatedSession,
                    plaintext,
                    newSessionInfo: {
                        newIdentity: (0, bytes_1.uint8Equal)(updatedSession.remote.pubKey, session.remote.pubKey)
                            ? null
                            : updatedSession.remote.pubKey,
                        baseSession: prevSession,
                        usedPreKey: null
                    }
                };
            }
            catch (prevError) {
                onPrevSessionDecryptError?.((0, primitives_1.toError)(prevError), i);
                continue;
            }
        }
        throw error;
    }
}
async function decryptMsgFromSession(session, message) {
    const ratchetPubKey = (0, _crypto_1.toSerializedPubKey)(message.ratchetPubKey);
    let recvChainIndex = -1;
    for (let index = 0; index < session.recvChains.length; index += 1) {
        const key = session.recvChains[index].senderRatchetKey;
        if (key !== null && key !== undefined && (0, bytes_1.uint8Equal)(key, ratchetPubKey)) {
            recvChainIndex = index;
            break;
        }
    }
    let selectedMessageKey;
    let updatedSession;
    if (recvChainIndex === -1) {
        const recvRatchet = await (0, SignalSession_1.calculateRatchet)(session.rootKey, session.sendChain.ratchetKey, ratchetPubKey);
        const freshRecvChain = {
            ratchetPubKey,
            nextMsgIndex: 0,
            chainKey: recvRatchet.chainKey,
            unusedMsgKeys: []
        };
        const selected = selectMessageKey(freshRecvChain, message.counter);
        const newSendRatchet = await (0, SignalSession_1.generateSerializedKeyPair)();
        selectedMessageKey = selected.messageKey;
        const sendRatchet = await (0, SignalSession_1.calculateRatchet)(recvRatchet.rootKey, newSendRatchet, ratchetPubKey);
        const nextRecvChains = session.recvChains.slice(-MAX_TRACKED_RECV_CHAINS);
        nextRecvChains.push((0, encoding_1.encodeSignalRecvChain)(selected.updatedChain));
        updatedSession = {
            ...session,
            rootKey: sendRatchet.rootKey,
            recvChains: nextRecvChains,
            sendChain: {
                ratchetKey: newSendRatchet,
                nextMsgIndex: 0,
                chainKey: sendRatchet.chainKey
            },
            initialExchangeInfo: null,
            prevSendChainHighestIndex: Math.max(session.sendChain.nextMsgIndex - 1, 0)
        };
    }
    else {
        const decoded = (0, encoding_1.decodeSignalRecvChain)(session.recvChains[recvChainIndex], `recvChains[${recvChainIndex}]`);
        const selected = selectMessageKey(decoded, message.counter);
        selectedMessageKey = selected.messageKey;
        const nextRecvChains = session.recvChains.slice();
        nextRecvChains[recvChainIndex] = (0, encoding_1.encodeSignalRecvChain)(selected.updatedChain);
        updatedSession = {
            ...session,
            recvChains: nextRecvChains
        };
    }
    const payloadWithoutMac = message.versionContentMac.subarray(0, message.versionContentMac.length - constants_1.SIGNAL_MAC_SIZE);
    const expectedMac = (0, _crypto_1.hmacSha256Sign)(selectedMessageKey.macKey, [
        session.remote.pubKey,
        session.local.pubKey,
        payloadWithoutMac
    ]);
    const receivedMac = message.versionContentMac.subarray(message.versionContentMac.length - constants_1.SIGNAL_MAC_SIZE);
    if (!(0, bytes_1.uint8TimingSafeEqual)(expectedMac.subarray(0, constants_1.SIGNAL_MAC_SIZE), receivedMac)) {
        throw new Error('invalid message mac');
    }
    const plaintext = (0, _crypto_1.aesCbcDecrypt)(selectedMessageKey.cipherKey, selectedMessageKey.iv, message.ciphertext);
    return [updatedSession, plaintext];
}
