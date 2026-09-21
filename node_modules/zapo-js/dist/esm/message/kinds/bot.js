import { aesGcmDecrypt, hkdf } from '../../crypto/index.js';
import { buildAddonAdditionalData } from '../crypto/addon-crypto.js';
import { assertMessageSecret } from '../crypto/use-case-secret.js';
import { proto } from '../../proto.js';
import { WA_BOT_HKDF_INFO, WA_BOT_MSG_SECRET_BYTES } from '../../protocol/bot.js';
import { isBotJid } from '../../protocol/jid.js';
import { TEXT_ENCODER, toBytesView } from '../../util/bytes.js';
export function genBotMsgSecret(messageSecret) {
    const ikm = assertMessageSecret(messageSecret, 'bot parent message secret');
    return hkdf(ikm, null, WA_BOT_HKDF_INFO, WA_BOT_MSG_SECRET_BYTES);
}
export function deriveBotChunkKey(input) {
    if (!input.saltId)
        throw new Error('bot chunk salt id must be a non-empty string');
    if (!input.targetSenderJid)
        throw new Error('bot chunk target sender jid must be a non-empty string');
    if (!input.authorJid)
        throw new Error('bot chunk author jid must be a non-empty string');
    const info = TEXT_ENCODER.encode(input.saltId + input.targetSenderJid + input.authorJid);
    return hkdf(toBytesView(input.botMsgSecret), null, info, WA_BOT_MSG_SECRET_BYTES);
}
export function decryptBotChunk(input) {
    const botMsgSecret = genBotMsgSecret(input.parentMessageSecret);
    const key = deriveBotChunkKey({
        botMsgSecret,
        saltId: input.saltId,
        targetSenderJid: input.targetSenderJid,
        authorJid: input.authorJid
    });
    return aesGcmDecrypt(key, toBytesView(input.encIv), toBytesView(input.encPayload), buildAddonAdditionalData(input.saltId, input.authorJid));
}
export function attachBotMetadata(message, input) {
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
export function attachBotThread(message, input) {
    const ctx = message.messageContextInfo ?? {};
    const existingBotMetadata = ctx.botMetadata ?? {};
    const threadType = input.threadType ?? proto.AIThreadInfo.AIThreadClientInfo.AIThreadType.DEFAULT;
    return {
        ...message,
        messageContextInfo: {
            ...ctx,
            threadId: [
                {
                    threadType: proto.ThreadID.ThreadType.AI_THREAD,
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
export function extractInvokedBotJid(message) {
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
        if (isBotJid(jid))
            return jid;
    }
    return null;
}
// Mirrors `WAWebE2EProtoGenerator.updateBotInvokeMsgProtoCopyForCapi`, minus
// the pushname rewrite (raw mentions are accepted by Meta AI).
export function buildBotInvokeProtoCopy(message, botMessageSecret) {
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
