import type { WaMessageKey, WaMessageTargetInput, WaSendEventMessage, WaSendEventResponseMessage, WaSendKeepMessage, WaSendMediaMessage, WaSendPinMessage, WaSendPollMessage, WaSendPollVoteMessage, WaSendReactionMessage, WaSendRevokeMessage, WaSendTextMessage } from '../types';
import { type Proto } from '../../proto';
/**
 * Returns the content-type key of a message - `'conversation'`,
 * `'imageMessage'`, `'extendedTextMessage'`, `'messageHistoryBundle'`, etc. -
 * or `undefined` for an empty message. `senderKeyDistributionMessage` is
 * skipped so group messages report their real payload type rather than the
 * piggy-backed sender-key.
 *
 * A key that is present but holds `null`/`undefined` carries no payload and is
 * skipped, so an explicitly-cleared field cannot mask the real content.
 */
export declare function getContentType(content: Proto.IMessage | undefined): keyof Proto.IMessage | undefined;
/**
 * Normalizes a reply/edit/reaction/revoke/pin target into a {@link WaMessageKey}:
 * an explicit key is returned as-is, while a received `message` event
 * ({@link WaMessageRef}, identified by its `rawNode`) yields its pre-computed
 * `key`.
 */
export declare function resolveMessageTarget(ref: WaMessageTargetInput): WaMessageKey;
export declare function isSendMediaMessage(content: unknown): content is WaSendMediaMessage;
export declare function isSendTextMessage(content: unknown): content is WaSendTextMessage;
export declare function isSendReactionMessage(content: unknown): content is WaSendReactionMessage;
export declare function isSendRevokeMessage(content: unknown): content is WaSendRevokeMessage;
export declare function isSendPinMessage(content: unknown): content is WaSendPinMessage;
export declare function isSendKeepMessage(content: unknown): content is WaSendKeepMessage;
export declare function isSendPollMessage(content: unknown): content is WaSendPollMessage;
export declare function isSendPollVoteMessage(content: unknown): content is WaSendPollVoteMessage;
export declare function isSendEventMessage(content: unknown): content is WaSendEventMessage;
export declare function isSendEventResponseMessage(content: unknown): content is WaSendEventResponseMessage;
export declare function isSendAddonCryptoMessage(content: unknown): content is WaSendPollVoteMessage | WaSendEventResponseMessage;
export declare function supportsViewOnce(message: Proto.IMessage): boolean;
export declare function wrapAsViewOnce(message: Proto.IMessage): Proto.IMessage;
export declare function unwrapMessage(message: Proto.IMessage): Proto.IMessage;
export declare function resolveMessageTypeAttr(message: Proto.IMessage): string;
export declare function resolveDecryptFailAttr(message: Proto.IMessage): 'hide' | undefined;
export declare function needsSecretPersistence(message: Proto.IMessage): boolean;
export declare function resolveEditAttr(message: Proto.IMessage): string | null;
export declare function resolveEncMediaType(message: Proto.IMessage): string | null;
/** Companion business node kind for list and native-flow messages. */
export type WaButtonAddonKind = 'list' | 'interactive' | 'payment_info' | 'order_details';
export declare function resolveButtonAddonKind(message: Proto.IMessage): WaButtonAddonKind | null;
export interface MessageMetaAttrs {
    readonly polltype?: string;
    readonly event_type?: string;
    readonly view_once?: string;
}
export interface WaOutboundMessageAttrs {
    readonly buttonAddonKind: WaButtonAddonKind | null;
    readonly typeAttr: string;
    readonly edit: string | null;
    readonly mediatype: string | null;
    readonly metaAttrs: MessageMetaAttrs | null;
    readonly decryptFail: 'hide' | undefined;
}
/**
 * Resolves every outbound stanza attribute derived from the message body in
 * one pass, unwrapping the envelope (`ephemeralMessage`, `viewOnceMessage`,
 * `deviceSentMessage`, ...) a single time instead of once per resolver.
 * Equivalent to calling the individual `resolve*` helpers on `message`.
 */
export declare function resolveOutboundMessageAttrs(message: Proto.IMessage): WaOutboundMessageAttrs;
export declare function resolveMetaAttrs(message: Proto.IMessage): MessageMetaAttrs | null;
