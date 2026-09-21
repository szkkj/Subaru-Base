"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_BOT_DEFAULT_CAPABILITIES = exports.WA_BOT_RENDERING_PIXEL_DENSITY = exports.WA_BLOKS_VERSIONING_ID = exports.WA_BOT_MSG_SECRET_BYTES = exports.WA_BOT_HKDF_INFO = exports.WA_META_NODE_ATTRS_BOT = exports.WA_BOT_NODE_ATTRS = exports.WA_BOT_KNOWN_JIDS = exports.WA_BIZ_BOT_TYPES = exports.WA_BOT_MSG_BODY_TYPES = exports.WA_BOT_MSG_EDIT_TYPES = void 0;
exports.resolveBotFbidJid = resolveBotFbidJid;
const _proto_1 = require("../proto");
const defaults_1 = require("./defaults");
const jid_1 = require("./jid");
const bytes_1 = require("../util/bytes");
exports.WA_BOT_MSG_EDIT_TYPES = Object.freeze({
    FIRST: 'first',
    INNER: 'inner',
    LAST: 'last',
    FULL: 'full'
});
exports.WA_BOT_MSG_BODY_TYPES = Object.freeze({
    PROMPT: 'prompt',
    COMMAND: 'command',
    VOICE: 'voice'
});
exports.WA_BIZ_BOT_TYPES = Object.freeze({
    ONE_P: '1',
    THREE_P: '3'
});
const META_AI_PN_USER = '13135550002';
const META_AI_FBID_USER = '867051314767696';
const META_AI_TEE_FBID_USER = '1273596044787272';
const META_AI_SIDECHAT_FBID_USER = '867051314767696555';
const MANUS_FBID_USER = '1807055946647696';
const HATCH_FBID_USER = '1807055946647697';
exports.WA_BOT_KNOWN_JIDS = Object.freeze({
    META_AI_PN: `${META_AI_PN_USER}@${defaults_1.WA_DEFAULTS.HOST_DOMAIN}`,
    META_AI_FBID: `${META_AI_FBID_USER}@${defaults_1.WA_DEFAULTS.BOT_SERVER}`,
    META_AI_TEE_FBID: `${META_AI_TEE_FBID_USER}@${defaults_1.WA_DEFAULTS.BOT_SERVER}`,
    META_AI_SIDECHAT_FBID: `${META_AI_SIDECHAT_FBID_USER}@${defaults_1.WA_DEFAULTS.BOT_SERVER}`,
    MANUS_FBID: `${MANUS_FBID_USER}@${defaults_1.WA_DEFAULTS.BOT_SERVER}`,
    HATCH_FBID: `${HATCH_FBID_USER}@${defaults_1.WA_DEFAULTS.BOT_SERVER}`
});
const PN_TO_FBID_BOT = Object.freeze({
    [exports.WA_BOT_KNOWN_JIDS.META_AI_PN]: exports.WA_BOT_KNOWN_JIDS.META_AI_FBID
});
function resolveBotFbidJid(jid) {
    if ((0, jid_1.isBotJid)(jid))
        return jid;
    return PN_TO_FBID_BOT[jid] ?? null;
}
exports.WA_BOT_NODE_ATTRS = Object.freeze({
    EDIT: 'edit',
    EDIT_TARGET_ID: 'edit_target_id',
    SENDER_TIMESTAMP_MS: 'sender_timestamp_ms',
    BIZ_BOT: 'biz_bot',
    TYPE: 'type'
});
exports.WA_META_NODE_ATTRS_BOT = Object.freeze({
    TARGET_ID: 'target_id',
    TARGET_SENDER_JID: 'target_sender_jid',
    TARGET_CHAT_JID: 'target_chat_jid'
});
exports.WA_BOT_HKDF_INFO = bytes_1.TEXT_ENCODER.encode('Bot Message');
exports.WA_BOT_MSG_SECRET_BYTES = 32;
// Without a matching Bloks hash, Meta AI silently drops invoke mentions.
// Bump alongside the Bloks bundle versions shipped by WA Web.
exports.WA_BLOKS_VERSIONING_ID = '98153664e5d904059a94ea08a59fc7eeaf977544cec64ab3ab793c0ce001eb92';
exports.WA_BOT_RENDERING_PIXEL_DENSITY = 2.8125;
// Default rich-response capability set; bots may reject prompts without one.
exports.WA_BOT_DEFAULT_CAPABILITIES = Object.freeze([
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_HEADING,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_NESTED_LIST,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_TABLE,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_CODE,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_STRUCTURED_RESPONSE,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_SUB_HEADING,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_LATEX,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_INLINE_REELS,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_LATEX_INLINE,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_UNIFIED_RESPONSE,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_SOURCES_IN_MESSAGE,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_UNIFIED_TEXT_COMPONENT,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_UNIFIED_SOURCES,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_UNIFIED_DOMAIN_CITATIONS,
    _proto_1.proto.BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_UR_INLINE_REELS_ENABLED
]);
