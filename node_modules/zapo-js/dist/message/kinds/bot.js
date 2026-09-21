"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genBotMsgSecret = genBotMsgSecret;
exports.deriveBotChunkKey = deriveBotChunkKey;
exports.decryptBotChunk = decryptBotChunk;
exports.attachBotMetadata = attachBotMetadata;
exports.attachBotThread = attachBotThread;
exports.extractInvokedBotJid = extractInvokedBotJid;
exports.buildBotInvokeProtoCopy = buildBotInvokeProtoCopy;
const _crypto_1 = require("../../crypto");
const addon_crypto_1 = require("../crypto/addon-crypto");
const use_case_secret_1 = require("../crypto/use-case-secret");
const _proto_1 = require("../../proto");
const bot_1 = require("../../protocol/bot");
const jid_1 = require("../../protocol/jid");
const bytes_1 = require("../../util/bytes");
function genBotMsgSecret(messageSecret) {
    const ikm = (0, use_case_secret_1.assertMessageSecret)(messageSecret, 'bot parent message secret');
    return (0, _crypto_1.hkdf)(ikm, null, bot_1.WA_BOT_HKDF_INFO, bot_1.WA_BOT_MSG_SECRET_BYTES);
}
function deriveBotChunkKey(input) {
    if (!input.saltId)
        throw new Error('bot chunk salt id must be a non-empty string');
    if (!input.targetSenderJid)
        throw new Error('bot chunk target sender jid must be a non-empty string');
    if (!input.authorJid)
        throw new Error('bot chunk author jid must be a non-empty string');
    const info = bytes_1.TEXT_ENCODER.encode(input.saltId + input.targetSenderJid + input.authorJid);
    return (0, _crypto_1.hkdf)((0, bytes_1.toBytesView)(input.botMsgSecret), null, info, bot_1.WA_BOT_MSG_SECRET_BYTES);
}
function decryptBotChunk(input) {
    const botMsgSecret = genBotMsgSecret(input.parentMessageSecret);
    const key = deriveBotChunkKey({
        botMsgSecret,
        saltId: input.saltId,
        targetSenderJid: input.targetSenderJid,
        authorJid: input.authorJid
    });
    return (0, _crypto_1.aesGcmDecrypt)(key, (0, bytes_1.toBytesView)(input.encIv), (0, bytes_1.toBytesView)(input.encPayload), (0, addon_crypto_1.buildAddonAdditionalData)(input.saltId, input.authorJid));
}
function attachBotMetadata(message, input) {
    if (!input.personaId && !input.invokerJid && !input.capabilities) {
        return message;
    }
    const botMetadata = {};
    if (input.personaId)
        botMetadata.personaId = input.personaId;
    if (input.invokerJid)
        botMetadata.invokerJid = input.invokerJid;
    if (input.capabilities && input.capabilities.length > 0) {
        botMetadata.capabilityMetadata = {
            capabilities: input.capabilities
        };
    }
    return {
        ...message,
        messageContextInfo: {
            ...(message.messageContextInfo ?? {}),
            botMetadata
        }
    };
}
function attachBotThread(message, input) {
    const ctx = message.messageContextInfo ?? {};
    const existingBotMetadata = ctx.botMetadata ?? {};
    const threadType = input.threadType ?? _proto_1.proto.AIThreadInfo.AIThreadClientInfo.AIThreadType.DEFAULT;
    return {
        ...message,
        messageContextInfo: {
            ...ctx,
            threadId: [
                {
                    threadType: _proto_1.proto.ThreadID.ThreadType.AI_THREAD,
                    threadKey: {
                        remoteJid: input.remoteJid,
                        fromMe: true,
                        id: input.aiThreadId
                    }
                }
            ],
            botMetadata: {
                ...existingBotMetadata,
                botThreadInfo: { clientInfo: { type: threadType } }
            }
        }
    };
}
function extractInvokedBotJid(message) {
    const inner = message.botInvokeMessage?.message;
    if (!inner)
        return null;
    // Mention metadata lives on whichever submessage carries the body – text
    // prompts on extendedTextMessage, media prompts on the caption-bearing body.
    const mentioned = inner.extendedTextMessage?.contextInfo?.mentionedJid ??
        inner.imageMessage?.contextInfo?.mentionedJid ??
        inner.videoMessage?.contextInfo?.mentionedJid ??
        inner.documentMessage?.contextInfo?.mentionedJid;
    if (!mentioned)
        return null;
    for (const jid of mentioned) {
        if ((0, jid_1.isBotJid)(jid))
            return jid;
    }
    return null;
}
// Mirrors `WAWebE2EProtoGenerator.updateBotInvokeMsgProtoCopyForCapi`, minus
// the pushname rewrite (raw mentions are accepted by Meta AI).
function buildBotInvokeProtoCopy(message, botMessageSecret) {
    const { messageContextInfo, ...rest } = message;
    if (!messageContextInfo && !botMessageSecret)
        return rest;
    const nextContextInfo = {
        ...(messageContextInfo ?? {}),
        messageSecret: undefined
    };
    if (botMessageSecret) {
        nextContextInfo.botMessageSecret = botMessageSecret;
    }
    return { ...rest, messageContextInfo: nextContextInfo };
}
