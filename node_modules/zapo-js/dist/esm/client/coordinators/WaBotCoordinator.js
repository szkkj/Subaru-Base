import { randomUUID } from 'node:crypto';
import { applyContextInfo } from '../../message/context-info.js';
import { resolveParentMessageSecret } from '../../message/crypto/addon-crypto.js';
import { unwrapMessage } from '../../message/encode/content.js';
import { attachBotMetadata, attachBotThread, decryptBotChunk } from '../../message/kinds/bot.js';
import { proto } from '../../proto.js';
import { resolveBotFbidJid, WA_BLOKS_VERSIONING_ID, WA_BOT_DEFAULT_CAPABILITIES, WA_BOT_RENDERING_PIXEL_DENSITY } from '../../protocol/bot.js';
import { WA_BOT_MSG_EDIT_TYPES, WA_BOT_NODE_ATTRS, WA_DEFAULTS, WA_META_NODE_ATTRS_BOT, WA_NODE_TAGS } from '../../protocol/constants.js';
import { isBotJid, toUserJid } from '../../protocol/jid.js';
import { buildBotListIq, buildBotProfileUsyncUserNodeContent, buildGetBotProfileUsyncQueryNode } from '../../transport/node/builders/bot.js';
import { buildUsyncIq, iterateUsyncUsers, parseUsyncResultEnvelope } from '../../transport/node/builders/usync.js';
import { findNodeChild, getNodeChildrenByTag, getNodeTextContent } from '../../transport/node/helpers.js';
import { assertIqResult } from '../../transport/node/query.js';
import { logUsyncProtocolErrors } from '../../transport/node/usync.js';
import { parseOptionalInt, toError } from '../../util/primitives.js';
function deriveFbidJid(jid, personaId) {
    const mapped = resolveBotFbidJid(jid);
    if (mapped)
        return mapped;
    const fbidUser = personaId.split('$', 1)[0];
    return `${fbidUser}@${WA_DEFAULTS.BOT_SERVER}`;
}
function parseBotListResult(result) {
    const botRoot = findNodeChild(result, WA_NODE_TAGS.BOT);
    if (!botRoot)
        return [];
    const defaultJid = findNodeChild(botRoot, 'default')?.attrs.jid;
    const sections = getNodeChildrenByTag(botRoot, 'section');
    const out = [];
    for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const sectionName = typeof section.attrs.name === 'string' ? section.attrs.name : undefined;
        const bots = getNodeChildrenByTag(section, WA_NODE_TAGS.BOT);
        for (let j = 0; j < bots.length; j += 1) {
            const node = bots[j];
            const jid = node.attrs.jid;
            const personaId = node.attrs.persona_id;
            if (typeof jid !== 'string' || typeof personaId !== 'string')
                continue;
            out.push({
                jid,
                fbidJid: deriveFbidJid(jid, personaId),
                personaId,
                isDefault: defaultJid !== undefined && jid === defaultJid,
                section: sectionName,
                count: parseOptionalInt(node.attrs.count)
            });
        }
    }
    return out;
}
function parseBotProfilePrompts(promptsNode) {
    if (!promptsNode)
        return [];
    const children = getNodeChildrenByTag(promptsNode, 'prompt');
    const out = new Array(children.length);
    let count = 0;
    for (let i = 0; i < children.length; i += 1) {
        const promptNode = children[i];
        const emoji = getNodeTextContent(findNodeChild(promptNode, 'emoji')) ?? '';
        const text = getNodeTextContent(findNodeChild(promptNode, 'text')) ?? '';
        out[count] = { emoji, text };
        count += 1;
    }
    out.length = count;
    return out;
}
function parseBotProfileCommands(commandsNode) {
    if (!commandsNode)
        return { commands: [], commandsDescription: null };
    const commandsDescription = getNodeTextContent(findNodeChild(commandsNode, 'description')) || null;
    const commandNodes = getNodeChildrenByTag(commandsNode, 'command');
    const commands = new Array(commandNodes.length);
    let count = 0;
    for (let i = 0; i < commandNodes.length; i += 1) {
        const cmdNode = commandNodes[i];
        const name = getNodeTextContent(findNodeChild(cmdNode, 'name')) ?? '';
        const description = getNodeTextContent(findNodeChild(cmdNode, 'description')) ?? '';
        commands[count] = { name, description };
        count += 1;
    }
    commands.length = count;
    return { commands, commandsDescription };
}
function parsePosingAsProfessional(node) {
    if (!node)
        return null;
    const type = node.attrs.type;
    if (type === 'unknown' || type === 'yes' || type === 'no') {
        return type;
    }
    return null;
}
function parseBotProfileUsync(result) {
    const userNodes = iterateUsyncUsers(result) ?? [];
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const userContent = userNode.content;
        if (!Array.isArray(userContent))
            continue;
        for (let j = 0; j < userContent.length; j += 1) {
            const botNode = userContent[j];
            if (botNode.tag !== WA_NODE_TAGS.BOT)
                continue;
            const errorNode = findNodeChild(botNode, WA_NODE_TAGS.ERROR);
            if (errorNode)
                return null;
            const profileNode = findNodeChild(botNode, 'profile');
            if (!profileNode)
                return null;
            const isMetaCreatedRaw = getNodeTextContent(findNodeChild(profileNode, 'is_meta_created'));
            const creatorNode = findNodeChild(profileNode, 'creator');
            const { commands, commandsDescription } = parseBotProfileCommands(findNodeChild(profileNode, 'commands'));
            return {
                name: getNodeTextContent(findNodeChild(profileNode, 'name')) || null,
                attributes: getNodeTextContent(findNodeChild(profileNode, 'attributes')) || null,
                description: getNodeTextContent(findNodeChild(profileNode, 'description')) || null,
                category: getNodeTextContent(findNodeChild(profileNode, 'category')) || null,
                isDefault: getNodeTextContent(findNodeChild(profileNode, 'default')) === 'true',
                prompts: parseBotProfilePrompts(findNodeChild(profileNode, 'prompts')),
                personaId: profileNode.attrs.persona_id ?? null,
                commands,
                commandsDescription,
                isMetaCreated: isMetaCreatedRaw === undefined ? null : isMetaCreatedRaw === 'true',
                creatorName: creatorNode
                    ? getNodeTextContent(findNodeChild(creatorNode, 'name')) || null
                    : null,
                creatorProfileUrl: creatorNode
                    ? getNodeTextContent(findNodeChild(creatorNode, 'profile_url')) || null
                    : null,
                posingAsProfessional: parsePosingAsProfessional(findNodeChild(profileNode, 'posing_as_professional'))
            };
        }
    }
    return null;
}
function normalizeBotJidToFbid(botJid) {
    const mapped = resolveBotFbidJid(botJid);
    if (mapped)
        return mapped;
    throw new Error(`cannot resolve FBID for bot jid "${botJid}" – pass a @bot jid or use the fbidJid from listBots`);
}
/** Builds a {@link WaBotCoordinator} from its IQ/message/store dependencies. */
export function createBotCoordinator(options) {
    const { logger, queryWithContext, buildMessageContent, sendMessage, messageStore, messageSecretStore, getCurrentCredentials, emitBotChunk, generateSid } = options;
    return {
        listBots: async () => {
            const node = buildBotListIq();
            const result = await queryWithContext('bot.listBots', node);
            assertIqResult(result, 'bot.listBots');
            return parseBotListResult(result);
        },
        getBotProfile: async (jid, opts) => {
            const sid = await generateSid();
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes: [buildGetBotProfileUsyncQueryNode()],
                users: [
                    {
                        jid,
                        content: buildBotProfileUsyncUserNodeContent(opts?.personaId)
                    }
                ]
            });
            const result = await queryWithContext('bot.getBotProfile', usyncNode, undefined, {
                jid
            });
            assertIqResult(result, 'bot.getBotProfile');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'bot.getBotProfile');
            return parseBotProfileUsync(result);
        },
        sendPrompt: async (to, content, opts = {}) => {
            // `to` wins when it is a @bot jid – caller chose a specific bot; ignore
            // opts.botJid so it cannot misroute the prompt to a different bot.
            const isDirect = isBotJid(to);
            const botJid = isDirect ? to : opts.botJid;
            if (!botJid) {
                throw new Error('bot.sendPrompt: opts.botJid is required when `to` is not a @bot jid');
            }
            const fbidBotJid = normalizeBotJidToFbid(botJid);
            const { message: baseMessage } = await buildMessageContent(content);
            if (isDirect) {
                const aiThreadId = opts.aiThreadId ?? randomUUID();
                const withMetadata = attachBotMetadata(baseMessage, {
                    personaId: opts.personaId,
                    capabilities: opts.capabilities ?? WA_BOT_DEFAULT_CAPABILITIES
                });
                const enriched = attachBotThread(withMetadata, {
                    aiThreadId,
                    remoteJid: fbidBotJid,
                    threadType: opts.aiThreadType
                });
                return sendMessage(fbidBotJid, enriched, opts);
            }
            // Mention envelope must NOT carry personaId/invokerJid/capabilities/
            // botThreadInfo – Meta AI silently drops the request otherwise.
            const mentionedJids = [fbidBotJid];
            if (opts.extraMentionedJids) {
                for (const jid of opts.extraMentionedJids) {
                    if (jid !== fbidBotJid)
                        mentionedJids.push(jid);
                }
            }
            const inner = applyContextInfo(baseMessage, {
                mentionedJids,
                raw: {
                    botMessageSharingInfo: {
                        botEntryPointOrigin: proto.BotMetricsEntryPoint.INVOKE_META_AI_GROUP,
                        forwardScore: 0
                    }
                }
            });
            const wrapped = {
                messageContextInfo: {
                    threadId: [],
                    botMetadata: {
                        botRenderingConfigMetadata: {
                            bloksVersioningId: WA_BLOKS_VERSIONING_ID,
                            pixelDensity: WA_BOT_RENDERING_PIXEL_DENSITY
                        }
                    }
                },
                botInvokeMessage: { message: inner }
            };
            return sendMessage(to, wrapped, opts);
        },
        tryDecryptChunk: async (event) => {
            const message = event.message;
            if (!message)
                return;
            const inner = unwrapMessage(message);
            const sec = inner.secretEncryptedMessage;
            if (!sec || !sec.encIv || !sec.encPayload)
                return;
            const botNode = findNodeChild(event.rawNode, WA_NODE_TAGS.BOT);
            if (!botNode)
                return;
            const metaNode = findNodeChild(event.rawNode, WA_NODE_TAGS.META);
            // msmsg chunks omit targetMessageKey; the prompt id lives in <meta target_id>
            const targetMessageId = sec.targetMessageKey?.id ?? metaNode?.attrs[WA_META_NODE_ATTRS_BOT.TARGET_ID];
            if (!targetMessageId)
                return;
            const editAttr = botNode.attrs[WA_BOT_NODE_ATTRS.EDIT];
            const editType = editAttr === WA_BOT_MSG_EDIT_TYPES.FIRST ||
                editAttr === WA_BOT_MSG_EDIT_TYPES.INNER ||
                editAttr === WA_BOT_MSG_EDIT_TYPES.LAST ||
                editAttr === WA_BOT_MSG_EDIT_TYPES.FULL
                ? editAttr
                : WA_BOT_MSG_EDIT_TYPES.FULL;
            const editTargetId = botNode.attrs[WA_BOT_NODE_ATTRS.EDIT_TARGET_ID] || undefined;
            const useEditTargetSalt = editType === WA_BOT_MSG_EDIT_TYPES.INNER || editType === WA_BOT_MSG_EDIT_TYPES.LAST;
            const saltId = useEditTargetSalt ? editTargetId : event.key.id;
            if (!saltId) {
                logger.debug('bot chunk missing salt id', {
                    id: event.key.id,
                    editType,
                    hasEditTargetId: !!editTargetId
                });
                return;
            }
            const senderJid = event.key.participant ?? event.key.remoteJid;
            if (!senderJid) {
                logger.debug('bot chunk missing sender jid', { id: event.key.id });
                return;
            }
            const metaTargetSenderJid = metaNode?.attrs[WA_META_NODE_ATTRS_BOT.TARGET_SENDER_JID];
            const credentials = getCurrentCredentials();
            const isFbidBotChat = event.key.remoteJid ? isBotJid(event.key.remoteJid) : false;
            // FBID bot (`*@bot`) keys on user LID; legacy PN bot keys on user PN
            const meFallbackJid = isFbidBotChat
                ? (credentials?.meLid ?? credentials?.meJid)
                : credentials?.meJid;
            const targetSenderJid = metaTargetSenderJid
                ? toUserJid(metaTargetSenderJid)
                : meFallbackJid
                    ? toUserJid(meFallbackJid)
                    : undefined;
            if (!targetSenderJid) {
                logger.debug('bot chunk missing target sender jid (no me jid)', {
                    id: event.key.id,
                    isFbidBotChat
                });
                return;
            }
            const parentEntry = await resolveParentMessageSecret(targetMessageId, messageSecretStore, messageStore);
            if (!parentEntry) {
                logger.debug('bot chunk parent message secret not found', {
                    id: event.key.id,
                    targetId: targetMessageId
                });
                return;
            }
            let plaintext;
            try {
                plaintext = decryptBotChunk({
                    parentMessageSecret: parentEntry.secret,
                    saltId,
                    targetSenderJid,
                    authorJid: toUserJid(senderJid),
                    encIv: sec.encIv,
                    encPayload: sec.encPayload
                });
            }
            catch (error) {
                logger.warn('failed to decrypt bot chunk', {
                    id: event.key.id,
                    targetId: targetMessageId,
                    editType,
                    message: toError(error).message
                });
                return;
            }
            let decoded;
            try {
                // msmsg payloads are not PKCS7-padded (unlike Signal messages);
                // wa-web decodes the gcm plaintext directly as a proto Message.
                decoded = proto.Message.decode(plaintext);
            }
            catch (error) {
                logger.warn('failed to decode decrypted bot chunk', {
                    id: event.key.id,
                    targetId: targetMessageId,
                    message: toError(error).message
                });
                return;
            }
            emitBotChunk({
                rawNode: event.rawNode,
                key: event.key,
                stanzaType: event.stanzaType,
                offline: event.offline,
                targetMessageId,
                editType,
                editTargetId,
                saltId,
                plaintext,
                message: decoded,
                raw: message
            });
        }
    };
}
