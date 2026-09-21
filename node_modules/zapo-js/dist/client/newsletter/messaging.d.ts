import { type BuildNewsletterContentOptions } from '../newsletter/content';
import { type WaNewsletterMexDeps } from '../newsletter/mex';
import type { WaNewsletterMuteInput, WaNewsletterReactInput, WaNewsletterRevokeInput, WaNewsletterSendOptions, WaNewsletterSendResult, WaNewsletterViewReceiptInput, WaNewsletterVotePollInput } from '../newsletter/types';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import type { WaMediaConn } from '../../media/types';
import type { WaMessagePublishOptions, WaMessagePublishResult, WaSendMessageContent } from '../../message/types';
import type { BinaryNode } from '../../transport/types';
export interface WaNewsletterMessagingDeps extends WaNewsletterMexDeps {
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    readonly publishMessageNode: (node: BinaryNode, options?: WaMessagePublishOptions) => Promise<WaMessagePublishResult>;
    readonly generateStanzaId: () => Promise<string>;
    readonly mediaTransfer?: WaMediaTransferClient;
    readonly getMediaConn?: () => Promise<WaMediaConn>;
    readonly linkPreviewResolver?: BuildNewsletterContentOptions['linkPreviewResolver'];
}
/** Newsletter messaging operations (send, react, fetch, follow). */
export interface WaNewsletterMessagingOps {
    /** Publishes a message to the newsletter. */
    readonly send: (newsletterJid: string, content: WaSendMessageContent, options?: WaNewsletterSendOptions) => Promise<WaNewsletterSendResult>;
    /** Edits a previously-published newsletter message. */
    readonly editMessage: (newsletterJid: string, parentMessageId: string, content: WaSendMessageContent) => Promise<WaNewsletterSendResult>;
    /** Reacts (or clears the reaction) on a newsletter message. */
    readonly react: (input: WaNewsletterReactInput) => Promise<{
        readonly stanzaId: string;
    }>;
    /** Revokes a previously-published newsletter message. */
    readonly revoke: (input: WaNewsletterRevokeInput) => Promise<{
        readonly stanzaId: string;
    }>;
    /** Casts a vote on a newsletter poll. */
    readonly votePoll: (input: WaNewsletterVotePollInput) => Promise<{
        readonly stanzaId: string;
    }>;
    /** Sends a view-receipt notification for a newsletter message. */
    readonly sendViewReceipt: (input: WaNewsletterViewReceiptInput) => Promise<{
        readonly stanzaId: string;
    }>;
    /** Fetches a page of newsletter messages. */
    readonly fetchMessages: (input: {
        readonly newsletterJid: string;
        readonly count: number;
        readonly before?: number;
        readonly after?: number;
        readonly viewRole?: string;
    }) => Promise<BinaryNode>;
    /** Fetches edits/reactions/poll updates for newsletter messages in a range. */
    readonly fetchMessageUpdates: (input: {
        readonly newsletterJid: string;
        readonly count: number;
        readonly since?: number;
        readonly before?: number;
        readonly after?: number;
    }) => Promise<BinaryNode>;
    /**
     * Subscribes to live updates for the newsletter and returns the
     * server-granted subscription duration.
     */
    readonly subscribeLiveUpdates: (newsletterJid: string) => Promise<{
        readonly durationSeconds: number;
    }>;
    /** Follows the newsletter on the current account. */
    readonly follow: (newsletterJid: string) => Promise<void>;
    /** Unfollows the newsletter on the current account. */
    readonly unfollow: (newsletterJid: string) => Promise<void>;
    /** Mutes or unmutes the newsletter (per {@link WaNewsletterMuteInput}). */
    readonly mute: (input: WaNewsletterMuteInput) => Promise<void>;
}
export declare function createMessagingOps(deps: WaNewsletterMessagingDeps): WaNewsletterMessagingOps;
