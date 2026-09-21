import { proto, type Proto } from '../../proto';
export declare function genBotMsgSecret(messageSecret: Uint8Array | ArrayBufferView): Uint8Array;
export declare function deriveBotChunkKey(input: {
    readonly botMsgSecret: Uint8Array | ArrayBufferView;
    readonly saltId: string;
    readonly targetSenderJid: string;
    readonly authorJid: string;
}): Uint8Array;
export interface DecryptBotChunkInput {
    readonly parentMessageSecret: Uint8Array | ArrayBufferView;
    readonly saltId: string;
    readonly targetSenderJid: string;
    readonly authorJid: string;
    readonly encIv: Uint8Array | ArrayBufferView;
    readonly encPayload: Uint8Array | ArrayBufferView;
}
export declare function decryptBotChunk(input: DecryptBotChunkInput): Uint8Array;
export interface WaBotMetadataInput {
    readonly personaId?: string;
    readonly invokerJid?: string;
    readonly capabilities?: readonly proto.BotCapabilityMetadata.BotCapabilityType[];
}
export declare function attachBotMetadata(message: Proto.IMessage, input: WaBotMetadataInput): Proto.IMessage;
export interface WaBotThreadInput {
    readonly aiThreadId: string;
    readonly remoteJid: string;
    readonly threadType?: proto.AIThreadInfo.AIThreadClientInfo.AIThreadType;
}
export declare function attachBotThread(message: Proto.IMessage, input: WaBotThreadInput): Proto.IMessage;
export declare function extractInvokedBotJid(message: Proto.IMessage): string | null;
export declare function buildBotInvokeProtoCopy(message: Proto.IMessage, botMessageSecret?: Uint8Array): Proto.IMessage;
