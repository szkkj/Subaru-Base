import type { WaIncomingDecryptedPayloadEvent, WaIncomingMessageEvent, WaIncomingNewsletterMessageUpdateEvent, WaIncomingUnavailableMessageEvent, WaIncomingUnhandledStanzaEvent } from '../../client/types';
import type { Logger } from '../../infra/log/types';
import { proto } from '../../proto';
import type { WaRetryDecryptFailureContext } from '../../retry/types';
import type { SenderKeyManager } from '../../signal/group/SenderKeyManager';
import type { SignalProtocol } from '../../signal/session/SignalProtocol';
import type { BinaryNode } from '../../transport/types';
interface WaIncomingMessageAckHandlerOptions {
    readonly logger: Logger;
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    readonly getMeJid?: () => string | null | undefined;
    readonly getMeLid?: () => string | null | undefined;
    readonly signalProtocol?: SignalProtocol;
    readonly senderKeyManager?: SenderKeyManager;
    readonly onDecryptFailure?: (context: WaRetryDecryptFailureContext, error: unknown) => Promise<boolean>;
    /**
     * Asks the primary device for the plaintext of an `<unavailable/>` message.
     * Returns `true` when the request was queued.
     */
    readonly requestPlaceholderResend?: (context: WaRetryDecryptFailureContext) => boolean;
    readonly emitIncomingMessage?: (event: WaIncomingMessageEvent) => void;
    readonly emitNewsletterMessageUpdate?: (event: WaIncomingNewsletterMessageUpdateEvent) => void;
    readonly emitUnavailableMessage?: (event: WaIncomingUnavailableMessageEvent) => void;
    readonly emitUnhandledStanza?: (event: WaIncomingUnhandledStanzaEvent) => void;
    readonly emitDecryptedPayload?: (build: () => WaIncomingDecryptedPayloadEvent) => void;
}
/**
 * Resolves who authored a {@link proto.IWebMessageInfo}. The top-level
 * `participant` wins over `key.participant` - history sync carries the group
 * sender in the former and leaves the latter empty on a large share of records.
 * A self-sent group/broadcast message with neither falls back to this account,
 * preferring `originalSelfAuthorUserJidString` over `meJid` (the current account
 * user JID) so a message authored under a previous identity keeps its author.
 *
 * The participant fields are read whatever the thread type is, matching how
 * WhatsApp Web builds the author: only the self-sent fallback is gated on
 * group/broadcast. A 1:1 record normally carries neither, so this returns
 * `undefined` there and the caller supplies the thread JID instead.
 *
 * `threadJid` overrides `key.remoteJid` for carriers that know the thread out
 * of band, such as a group history bundle whose records may omit it.
 */
export declare function resolveWebMessageInfoAuthor(webMessageInfo: proto.IWebMessageInfo, meJid?: string | null, threadJid?: string): string | undefined;
/**
 * Rebuilds a `message` event from a recovered {@link proto.IWebMessageInfo}
 * (placeholder resend). `meJid` is the current account user JID, used as the
 * author fallback for self-sent group messages when the proto carries no
 * participant and no `originalSelfAuthorUserJidString`.
 */
export declare function buildRecoveredIncomingEvent(webMessageInfo: proto.IWebMessageInfo, meJid?: string | null): WaIncomingMessageEvent;
export declare function handleIncomingMessageAck(node: BinaryNode, options: WaIncomingMessageAckHandlerOptions): Promise<boolean>;
export {};
