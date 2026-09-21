"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBotCoordinator = createBotCoordinator;
const node_crypto_1 = require("node:crypto");
const context_info_1 = require("../../message/context-info");
const addon_crypto_1 = require("../../message/crypto/addon-crypto");
const content_1 = require("../../message/encode/content");
const bot_1 = require("../../message/kinds/bot");
const _proto_1 = require("../../proto");
const bot_2 = require("../../protocol/bot");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const bot_3 = require("../../transport/node/builders/bot");
const usync_1 = require("../../transport/node/builders/usync");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
const usync_2 = require("../../transport/node/usync");
const primitives_1 = require("../../util/primitives");
function deriveFbidJid(jid, personaId) {
    const mapped = (0, bot_2.resolveBotFbidJid)(jid);
    if (mapped)
        return mapped;
    const fbidUser = personaId.split('$', 1)[0];
    return `${fbidUser}@${constants_1.WA_DEFAULTS.BOT_SERVER}`;
}
function parseBotListResult(result) {
    const botRoot = (0, helpers_1.findNodeChild)(result, constants_1.WA_NODE_TAGS.BOT);
    if (!botRoot)
        return [];
    const defaultJid = (0, helpers_1.findNodeChild)(botRoot, 'default')?.attrs.jid;
    const sections = (0, helpers_1.getNodeChildrenByTag)(botRoot, 'section');
    const out = [];
    for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const sectionName = typeof section.attrs.name === 'string' ? section.attrs.name : undefined;
        const bots = (0, helpers_1.getNodeChildrenByTag)(section, constants_1.WA_NODE_TAGS.BOT);
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
                count: (0, primitives_1.parseOptionalInt)(node.attrs.count)
            });
        }
    }
    return out;
}
function parseBotProfilePrompts(promptsNode) {
    if (!promptsNode)
        return [];
    const children = (0, helpers_1.getNodeChildrenByTag)(promptsNode, 'prompt');
    const out = new Array(children.length);
    let count = 0;
    for (let i = 0; i < children.length; i += 1) {
        const promptNode = children[i];
        const emoji = (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(promptNode, 'emoji')) ?? '';
        const text = (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(promptNode, 'text')) ?? '';
        out[count] = { emoji, text };
        count += 1;
    }
    out.length = count;
    return out;
}
function parseBotProfileCommands(commandsNode) {
    if (!commandsNode)
        return { commands: [], commandsDescription: null };
    const commandsDescription = (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(commandsNode, 'description')) || null;
    const commandNodes = (0, helpers_1.getNodeChildrenByTag)(commandsNode, 'command');
    const commands = new Array(commandNodes.length);
    let count = 0;
    for (let i = 0; i < commandNodes.length; i += 1) {
        const cmdNode = commandNodes[i];
        const name = (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(cmdNode, 'name')) ?? '';
        const description = (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(cmdNode, 'description')) ?? '';
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
    const userNodes = (0, usync_1.iterateUsyncUsers)(result) ?? [];
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const userContent = userNode.content;
        if (!Array.isArray(userContent))
            continue;
        for (let j = 0; j < userContent.length; j += 1) {
            const botNode = userContent[j];
            if (botNode.tag !== constants_1.WA_NODE_TAGS.BOT)
                continue;
            const errorNode = (0, helpers_1.findNodeChild)(botNode, constants_1.WA_NODE_TAGS.ERROR);
            if (errorNode)
                return null;
            const profileNode = (0, helpers_1.findNodeChild)(botNode, 'profile');
            if (!profileNode)
                return null;
            const isMetaCreatedRaw = (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(profileNode, 'is_meta_created'));
            const creatorNode = (0, helpers_1.findNodeChild)(profileNode, 'creator');
            const { commands, commandsDescription } = parseBotProfileCommands((0, helpers_1.findNodeChild)(profileNode, 'commands'));
            return {
                name: (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(profileNode, 'name')) || null,
                attributes: (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(profileNode, 'attributes')) || null,
                description: (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(profileNode, 'description')) || null,
                category: (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(profileNode, 'category')) || null,
                isDefault: (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(profileNode, 'default')) === 'true',
                prompts: parseBotProfilePrompts((0, helpers_1.findNodeChild)(profileNode, 'prompts')),
                personaId: profileNode.attrs.persona_id ?? null,
                commands,
                commandsDescription,
                isMetaCreated: isMetaCreatedRaw === undefined ? null : isMetaCreatedRaw === 'true',
                creatorName: creatorNode
                    ? (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(creatorNode, 'name')) || null
                    : null,
                creatorProfileUrl: creatorNode
                    ? (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(creatorNode, 'profile_url')) || null
                    : null,
                posingAsProfessional: parsePosingAsProfessional((0, helpers_1.findNodeChild)(profileNode, 'posing_as_professional'))
            };
        }
    }
    return null;
}
function normalizeBotJidToFbid(botJid) {
    const mapped = (0, bot_2.resolveBotFbidJid)(botJid);
    if (mapped)
        return mapped;
    throw new Error(`cannot resolve FBID for bot jid "${botJid}" – pass a @bot jid or use the fbidJid from listBots`);
}
/** Builds a {@link WaBotCoordinator} from its IQ/message/store dependencies. */
function createBotCoordinator(options) {
    const { logger, queryWithContext, buildMessageContent, sendMessage, messageStore, messageSecretStore, getCurrentCredentials, emitBotChunk, generateSid } = options;
    return {
        listBots: async () => {
            const node = (0, bot_3.buildBotListIq)();
            const result = await queryWithContext('bot.listBots', node);
            (0, query_1.assertIqResult)(result, 'bot.listBots');
            return parseBotListResult(result);
        },
        getBotProfile: async (jid, opts) => {
            const sid = await generateSid();
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes: [(0, bot_3.buildGetBotProfileUsyncQueryNode)()],
                users: [
                    {
                        jid,
                        content: (0, bot_3.buildBotProfileUsyncUserNodeContent)(opts?.personaId)
                    }
                ]
            });
            const result = await queryWithContext('bot.getBotProfile', usyncNode, undefined, {
                jid
            });
            (0, query_1.assertIqResult)(result, 'bot.getBotProfile');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'bot.getBotProfile');
            return parseBotProfileUsync(result);
        },
        sendPrompt: async (to, content, opts = {}) => {
            // `to` wins when it is a @bot jid – caller chose a specific bot; ignore
            // opts.botJid so it cannot misroute the prompt to a different bot.
            const isDirect = (0, jid_1.isBotJid)(to);
            const botJid = isDirect ? to : opts.botJid;
            if (!botJid) {
                throw new Error('bot.sendPrompt: opts.botJid is required when `to` is not a @bot jid');
            }
            const fbidBotJid = normalizeBotJidToFbid(botJid);
            const { message: baseMessage } = await buildMessageContent(content);
            if (isDirect) {
                const aiThreadId = opts.aiThreadId ?? (0, node_crypto_1.randomUUID)();
                const withMetadata = (0, bot_1.attachBotMetadata)(baseMessage, {
                    personaId: opts.personaId,
                    capabilities: opts.capabilities ?? bot_2.WA_BOT_DEFAULT_CAPABILITIES
                });
                const enriched = (0, bot_1.attachBotThread)(withMetadata, {
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
            const inner = (0, context_info_1.applyContextInfo)(baseMessage, {
                mentionedJids,
                raw: {
                    botMessageSharingInfo: {
                        botEntryPointOrigin: _proto_1.proto.BotMetricsEntryPoint.INVOKE_META_AI_GROUP,
                        forwardScore: 0
                    }
                }
            });
            const wrapped = {
                messageContextInfo: {
                    threadId: [],
                    botMetadata: {
                        botRenderingConfigMetadata: {
                            bloksVersioningId: bot_2.WA_BLOKS_VERSIONING_ID,
                            pixelDensity: bot_2.WA_BOT_RENDERING_PIXEL_DENSITY
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
            const inner = (0, content_1.unwrapMessage)(message);
            const sec = inner.secretEncryptedMessage;
            if (!sec || !sec.encIv || !sec.encPayload)
                return;
            const botNode = (0, helpers_1.findNodeChild)(event.rawNode, constants_1.WA_NODE_TAGS.BOT);
            if (!botNode)
                return;
            const metaNode = (0, helpers_1.findNodeChild)(event.rawNode, constants_1.WA_NODE_TAGS.META);
            // msmsg chunks omit targetMessageKey; the prompt id lives in <meta target_id>
            const targetMessageId = sec.targetMessageKey?.id ?? metaNode?.attrs[constants_1.WA_META_NODE_ATTRS_BOT.TARGET_ID];
            if (!targetMessageId)
                return;
            const editAttr = botNode.attrs[constants_1.WA_BOT_NODE_ATTRS.EDIT];
            const editType = editAttr === constants_1.WA_BOT_MSG_EDIT_TYPES.FIRST ||
                editAttr === constants_1.WA_BOT_MSG_EDIT_TYPES.INNER ||
                editAttr === constants_1.WA_BOT_MSG_EDIT_TYPES.LAST ||
                editAttr === constants_1.WA_BOT_MSG_EDIT_TYPES.FULL
                ? editAttr
                : constants_1.WA_BOT_MSG_EDIT_TYPES.FULL;
            const editTargetId = botNode.attrs[constants_1.WA_BOT_NODE_ATTRS.EDIT_TARGET_ID] || undefined;
            const useEditTargetSalt = editType === constants_1.WA_BOT_MSG_EDIT_TYPES.INNER || editType === constants_1.WA_BOT_MSG_EDIT_TYPES.LAST;
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
            const metaTargetSenderJid = metaNode?.attrs[constants_1.WA_META_NODE_ATTRS_BOT.TARGET_SENDER_JID];
            const credentials = getCurrentCredentials();
            const isFbidBotChat = event.key.remoteJid ? (0, jid_1.isBotJid)(event.key.remoteJid) : false;
            // FBID bot (`*@bot`) keys on user LID; legacy PN bot keys on user PN
            const meFallbackJid = isFbidBotChat
                ? (credentials?.meLid ?? credentials?.meJid)
                : credentials?.meJid;
            const targetSenderJid = metaTargetSenderJid
                ? (0, jid_1.toUserJid)(metaTargetSenderJid)
                : meFallbackJid
                    ? (0, jid_1.toUserJid)(meFallbackJid)
                    : undefined;
            if (!targetSenderJid) {
                logger.debug('bot chunk missing target sender jid (no me jid)', {
                    id: event.key.id,
                    isFbidBotChat
                });
                return;
            }
            const parentEntry = await (0, addon_crypto_1.resolveParentMessageSecret)(targetMessageId, messageSecretStore, messageStore);
            if (!parentEntry) {
                logger.debug('bot chunk parent message secret not found', {
                    id: event.key.id,
                    targetId: targetMessageId
                });
                return;
            }
            let plaintext;
            try {
                plaintext = (0, bot_1.decryptBotChunk)({
                    parentMessageSecret: parentEntry.secret,
                    saltId,
                    targetSenderJid,
                    authorJid: (0, jid_1.toUserJid)(senderJid),
                    encIv: sec.encIv,
                    encPayload: sec.encPayload
                });
            }
            catch (error) {
                logger.warn('failed to decrypt bot chunk', {
                    id: event.key.id,
                    targetId: targetMessageId,
                    editType,
                    message: (0, primitives_1.toError)(error).message
                });
                return;
            }
            let decoded;
            try {
                // msmsg payloads are not PKCS7-padded (unlike Signal messages);
                // wa-web decodes the gcm plaintext directly as a proto Message.
                decoded = _proto_1.proto.Message.decode(plaintext);
            }
            catch (error) {
                logger.warn('failed to decode decrypted bot chunk', {
                    id: event.key.id,
                    targetId: targetMessageId,
                    message: (0, primitives_1.toError)(error).message
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
