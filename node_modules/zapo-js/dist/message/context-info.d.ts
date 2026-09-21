import type { Proto } from '../proto';
export interface WaSendContextInfo {
    readonly quotedMessageId?: string;
    readonly quotedParticipant?: string;
    readonly quotedRemoteJid?: string;
    readonly quotedMessage?: Proto.IMessage;
    readonly isForwarded?: boolean;
    readonly forwardingScore?: number;
    readonly mentionedJids?: readonly string[];
    readonly isSpoiler?: boolean;
    readonly expirationSeconds?: number;
    readonly ephemeralSettingTimestamp?: number;
    readonly disappearingModeInitiator?: Proto.DisappearingMode.Initiator;
    readonly disappearingModeTrigger?: Proto.DisappearingMode.Trigger;
    readonly groupSubject?: string;
    readonly parentGroupJid?: string;
    readonly raw?: Proto.IContextInfo;
}
export interface WaQuoteRef {
    readonly id: string;
    readonly participant?: string;
    readonly remoteJid?: string;
    readonly message?: Proto.IMessage;
}
export declare function buildContextInfoProto(input: WaSendContextInfo): Proto.IContextInfo;
export declare function applyContextInfo(message: Proto.IMessage, ctx: WaSendContextInfo | null | undefined): Proto.IMessage;
/**
 * Reads the disappearing-message TTL (`contextInfo.expiration`) from the first
 * submessage that carries it. Unwraps `ephemeralMessage` if present. Returns
 * `undefined` when no submessage has an `expiration` set.
 */
export declare function pickIncomingExpirationSeconds(message: Proto.IMessage | undefined): number | undefined;
/**
 * Reads `contextInfo.ephemeralSettingTimestamp` (Unix seconds) from the first
 * submessage that carries it. Peers stamp it on every message in a disappearing
 * chat, which makes it the only continuously-refreshed source for the setting -
 * history sync and `EPHEMERAL_SETTING` are point-in-time.
 */
export declare function pickIncomingEphemeralSettingTimestamp(message: Proto.IMessage | undefined): number | undefined;
/** Reads the `contextInfo` off a message's first content submessage (null when absent). */
export declare function getContextInfo(message: Proto.IMessage): Proto.IContextInfo | null;
/**
 * Anything that identifies a quoted message. Accepts a {@link WaQuoteRef}, a
 * {@link WaMessageKey} (bare proto key), or a full incoming message event (its
 * `key` + `message` are read). All fields are optional structurally — the
 * public `quote` option type enforces the concrete shape.
 */
type WaQuoteSource = {
    readonly key?: {
        readonly id?: string;
        readonly remoteJid?: string;
        readonly participant?: string;
        readonly fromMe?: boolean;
    };
    readonly id?: string;
    readonly remoteJid?: string;
    readonly participant?: string;
    readonly fromMe?: boolean;
    readonly message?: Proto.IMessage;
};
type WaForwardSource = boolean | {
    readonly score?: number;
};
export interface WaSendContextResolveInput {
    readonly contentLevel?: WaSendContextInfo;
    readonly optionsLevel?: WaSendContextInfo;
    readonly quote?: WaQuoteSource;
    readonly forward?: WaForwardSource;
    readonly mentions?: readonly string[];
    /**
     * Chat the message is being sent to. When provided, the quote's
     * `remoteJid` is emitted only for a cross-chat quote (the quoted message
     * lives in a different chat), mirroring wa-web's `msgContextInfo`, which
     * sets `remoteJid` only when `quotedMsg.remote !== targetChat`. Omit it to
     * keep emitting `remoteJid` unconditionally.
     */
    readonly targetJid?: string;
    /**
     * LID-form self user JID. Used as the DM-quote `participant` fallback when
     * the quoted message is `fromMe` and no explicit participant was provided.
     * Mirrors wa-web's `getSender(msg)` (returns `msg.from`, which for 1:1 is
     * `fromMe ? me : peer`).
     */
    readonly meLid?: string;
}
export declare function resolveSendContextInfo(input: WaSendContextResolveInput): WaSendContextInfo | null;
export {};
