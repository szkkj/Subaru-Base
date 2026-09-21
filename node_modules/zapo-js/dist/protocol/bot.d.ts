import { proto } from '../proto';
export declare const WA_BOT_MSG_EDIT_TYPES: Readonly<{
    readonly FIRST: "first";
    readonly INNER: "inner";
    readonly LAST: "last";
    readonly FULL: "full";
}>;
export type WaBotMsgEditType = (typeof WA_BOT_MSG_EDIT_TYPES)[keyof typeof WA_BOT_MSG_EDIT_TYPES];
export declare const WA_BOT_MSG_BODY_TYPES: Readonly<{
    readonly PROMPT: "prompt";
    readonly COMMAND: "command";
    readonly VOICE: "voice";
}>;
export type WaBotMsgBodyType = (typeof WA_BOT_MSG_BODY_TYPES)[keyof typeof WA_BOT_MSG_BODY_TYPES];
export declare const WA_BIZ_BOT_TYPES: Readonly<{
    readonly ONE_P: "1";
    readonly THREE_P: "3";
}>;
export type WaBizBotType = (typeof WA_BIZ_BOT_TYPES)[keyof typeof WA_BIZ_BOT_TYPES];
export declare const WA_BOT_KNOWN_JIDS: Readonly<{
    readonly META_AI_PN: "13135550002@s.whatsapp.net";
    readonly META_AI_FBID: "867051314767696@bot";
    readonly META_AI_TEE_FBID: "1273596044787272@bot";
    readonly META_AI_SIDECHAT_FBID: "867051314767696555@bot";
    readonly MANUS_FBID: "1807055946647696@bot";
    readonly HATCH_FBID: "1807055946647697@bot";
}>;
export declare function resolveBotFbidJid(jid: string): string | null;
export declare const WA_BOT_NODE_ATTRS: Readonly<{
    readonly EDIT: "edit";
    readonly EDIT_TARGET_ID: "edit_target_id";
    readonly SENDER_TIMESTAMP_MS: "sender_timestamp_ms";
    readonly BIZ_BOT: "biz_bot";
    readonly TYPE: "type";
}>;
export declare const WA_META_NODE_ATTRS_BOT: Readonly<{
    readonly TARGET_ID: "target_id";
    readonly TARGET_SENDER_JID: "target_sender_jid";
    readonly TARGET_CHAT_JID: "target_chat_jid";
}>;
export declare const WA_BOT_HKDF_INFO: NodeJS.NonSharedUint8Array;
export declare const WA_BOT_MSG_SECRET_BYTES = 32;
export declare const WA_BLOKS_VERSIONING_ID = "98153664e5d904059a94ea08a59fc7eeaf977544cec64ab3ab793c0ce001eb92";
export declare const WA_BOT_RENDERING_PIXEL_DENSITY = 2.8125;
export declare const WA_BOT_DEFAULT_CAPABILITIES: readonly proto.BotCapabilityMetadata.BotCapabilityType[];
