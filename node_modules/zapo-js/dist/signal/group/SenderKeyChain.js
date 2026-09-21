"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectMessageKey = selectMessageKey;
exports.deriveSenderKeyMsgKey = deriveSenderKeyMsgKey;
const _crypto_1 = require("../../crypto");
const constants_1 = require("../constants");
const bytes_1 = require("../../util/bytes");
function selectMessageKey(senderKey, targetIteration, futureMessagesMax) {
    const delta = targetIteration - senderKey.iteration;
    if (delta > (futureMessagesMax ?? constants_1.SENDER_KEY_FUTURE_MESSAGES_MAX)) {
        throw new Error('sender key message is too far in future');
    }
    const currentUnused = senderKey.unusedMessageKeys ?? [];
    if (delta < 0) {
        const foundIndex = currentUnused.findIndex((entry) => entry.iteration === targetIteration);
        if (foundIndex === -1) {
            throw new Error('sender key message iteration is stale');
        }
        const messageKey = currentUnused[foundIndex];
        const nextUnused = (0, bytes_1.removeAt)(currentUnused, foundIndex);
        return {
            messageKey,
            updatedRecord: {
                ...senderKey,
                unusedMessageKeys: nextUnused
            }
        };
    }
    let chainKey = ensureChainKey(senderKey.chainKey);
    const firstDerived = deriveSenderKeyMsgKeyFromChainKey(senderKey.iteration, chainKey);
    chainKey = firstDerived.nextChainKey;
    let messageKey = firstDerived.messageKey;
    if (delta === 0) {
        return {
            messageKey,
            updatedRecord: {
                ...senderKey,
                iteration: targetIteration + 1,
                chainKey,
                unusedMessageKeys: currentUnused
            }
        };
    }
    const nextUnused = currentUnused.slice();
    let overflow = delta + currentUnused.length - constants_1.MAX_UNUSED_KEYS;
    if (overflow > 0) {
        nextUnused.splice(0, overflow);
        overflow -= currentUnused.length;
    }
    for (let iteration = senderKey.iteration + 1; iteration <= targetIteration; iteration += 1) {
        if (overflow > 0) {
            overflow -= 1;
        }
        else {
            nextUnused.push(messageKey);
        }
        const derived = deriveSenderKeyMsgKeyFromChainKey(iteration, chainKey);
        chainKey = derived.nextChainKey;
        messageKey = derived.messageKey;
    }
    return {
        messageKey,
        updatedRecord: {
            ...senderKey,
            iteration: targetIteration + 1,
            chainKey,
            unusedMessageKeys: nextUnused
        }
    };
}
function deriveSenderKeyMsgKey(iteration, chainKey) {
    return deriveSenderKeyMsgKeyFromChainKey(iteration, ensureChainKey(chainKey));
}
function ensureChainKey(chainKey) {
    (0, bytes_1.assertByteLength)(chainKey, 32, 'sender key chainKey must be 32 bytes');
    return chainKey;
}
function deriveSenderKeyMsgKeyFromChainKey(iteration, chainKey) {
    const nextChainRaw = (0, _crypto_1.hmacSha256Sign)(chainKey, constants_1.CHAIN_KEY_LABEL);
    const messageInputKey = (0, _crypto_1.hmacSha256Sign)(chainKey, constants_1.MESSAGE_KEY_LABEL);
    const nextChainKey = nextChainRaw.subarray(0, 32);
    const messageSeed = (0, _crypto_1.hkdf)(messageInputKey, null, constants_1.WHISPER_GROUP_INFO, 50);
    return {
        nextChainKey,
        messageKey: {
            iteration,
            seed: messageSeed
        }
    };
}
