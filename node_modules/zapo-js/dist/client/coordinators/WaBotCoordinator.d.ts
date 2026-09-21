import type { WaAuthCredentials } from '../../auth/types';
import type { WaIncomingBotChunkEvent, WaIncomingMessageEvent, WaSendMessageOptions } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaMessageBuildResult, WaMessagePublishResult, WaSendMessageContent } from '../../message/types';
import { proto } from '../../proto';
import type { WaMessageSecretStore } from '../../store/contracts/message-secret.store';
import type { WaMessageStore } from '../../store/contracts/message.store';
import type { BinaryNode } from '../../transport/types';
export interface WaBotInfo {
    readonly jid: string;
    readonly fbidJid: string;
    readonly personaId: string;
    readonly isDefault: boolean;
    readonly section?: string;
    readonly count?: number;
}
export interface WaBotProfilePrompt {
    readonly emoji: string;
    readonly text: string;
}
export interface WaBotProfileCommand {
    readonly name: string;
    readonly description: string;
}
export type WaBotPosingAsProfessional = 'unknown' | 'yes' | 'no';
export interface WaBotProfileResult {
    readonly name: string | null;
    readonly attributes: string | null;
    readonly description: string | null;
    readonly category: string | null;
    readonly isDefault: boolean;
    readonly prompts: readonly WaBotProfilePrompt[];
    readonly personaId: string | null;
    readonly commands: readonly WaBotProfileCommand[];
    readonly commandsDescription: string | null;
    readonly isMetaCreated: boolean | null;
    readonly creatorName: string | null;
    readonly creatorProfileUrl: string | null;
    readonly posingAsProfessional: WaBotPosingAsProfessional | null;
}
export interface WaGetBotProfileOptions {
    readonly personaId?: string;
}
export interface WaBotPromptOptions extends WaSendMessageOptions {
    readonly botJid?: string;
    readonly personaId?: string;
    readonly capabilities?: readonly proto.BotCapabilityMetadata.BotCapabilityType[];
    readonly extraMentionedJids?: readonly string[];
    readonly aiThreadId?: string;
    readonly aiThreadType?: proto.AIThreadInfo.AIThreadClientInfo.AIThreadType;
}
/**
 * Coordinates Meta-AI bot discovery, profile lookup, prompt send, and
 * streaming chunk decryption. Accessed via {@link WaClient.bot}.
 */
export interface WaBotCoordinator {
    /** Lists the bots available to the current account, grouped by section. */
    readonly listBots: () => Promise<readonly WaBotInfo[]>;
    /** Fetches a single bot's profile (commands, prompts, creator metadata). */
    readonly getBotProfile: (jid: string, options?: WaGetBotProfileOptions) => Promise<WaBotProfileResult | null>;
    /**
     * Sends a prompt to a bot. When `to` is a `@bot` JID this uses the
     * direct path; for a group/chat JID, set `options.botJid` to invoke
     * the bot via mention.
     *
     * **Where do I get a bot JID?**
     * - Call {@link listBots} - returns one entry per available bot with
     *   both `jid` (the `@bot` JID for direct sends) and `fbidJid` (the
     *   form for `options.botJid` on the mention path).
     * - Use the `WA_BOT_KNOWN_JIDS` constants from `zapo-js/protocol`
     *   when you know the target (`META_AI_PN`, `META_AI_FBID`,
     *   `MANUS_FBID`, `HATCH_FBID`, ...). No IQ required.
     * - Read it off an incoming `message` event whose sender is a bot
     *   (reply scenario).
     *
     * **Direct path** (`to` is a `@bot` JID): generates a fresh
     * `aiThreadId` unless one is reused via `options.aiThreadId`,
     * attaches the bot metadata + thread proto, and sends to the bot's
     * FBID JID. Subsequent prompts using the same `aiThreadId` keep the
     * conversation context.
     *
     * **Mention path** (`to` is a group/chat JID): `options.botJid`
     * **must** be set. The bot is invoked indirectly; the lib strips
     * persona/invoker/capabilities/threadInfo from the inner message
     * because Meta AI silently drops the request when those are present
     * on the mention path. `options.aiThreadId` and `options.aiThreadType`
     * are ignored here.
     */
    readonly sendPrompt: (to: string, content: WaSendMessageContent, options?: WaBotPromptOptions) => Promise<WaMessagePublishResult>;
    /**
     * Attempts to decrypt a streaming bot chunk attached to `event` and,
     * on success, emits a typed `WaIncomingBotChunkEvent`. Silently
     * returns when the chunk is not addressed to the current account or
     * the parent prompt secret is not available.
     *
     * **Called automatically by {@link WaClient} on every incoming
     * message** - you rarely need to invoke it directly. Multiple chunks
     * arrive per response; concatenate them in arrival order using the
     * `editType` field (`first` → `inner` → `last`, or a single `full`)
     * to reconstruct the full reply.
     */
    readonly tryDecryptChunk: (event: WaIncomingMessageEvent) => Promise<void>;
}
interface WaBotCoordinatorOptions {
    readonly logger: Logger;
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
    readonly buildMessageContent: (content: WaSendMessageContent) => Promise<WaMessageBuildResult>;
    readonly sendMessage: (to: string, content: WaSendMessageContent, options?: WaSendMessageOptions) => Promise<WaMessagePublishResult>;
    readonly messageStore: WaMessageStore;
    readonly messageSecretStore: WaMessageSecretStore;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    readonly emitBotChunk: (event: WaIncomingBotChunkEvent) => void;
    readonly generateSid: () => Promise<string>;
}
/** Builds a {@link WaBotCoordinator} from its IQ/message/store dependencies. */
export declare function createBotCoordinator(options: WaBotCoordinatorOptions): WaBotCoordinator;
export {};
