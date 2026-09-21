import type { BinaryNode } from '../../types';
interface NewsletterMessageBaseInput {
    readonly to: string;
    readonly additionalAttributes?: Readonly<Record<string, string>>;
}
interface NewsletterMessageNewInput extends NewsletterMessageBaseInput {
    readonly id: string;
}
interface NewsletterMessageEditInput extends NewsletterMessageBaseInput {
    readonly parentMessageId: string;
}
interface NewsletterMessageReplyInput extends NewsletterMessageNewInput {
    readonly parentMessageServerId: number;
}
interface NewsletterMessageRevokeInput extends NewsletterMessageBaseInput {
    readonly originalMessageId: string;
}
export type BuildNewsletterMessageInput = (NewsletterMessageNewInput & {
    readonly kind: 'text';
    readonly plaintext: Uint8Array;
}) | (NewsletterMessageNewInput & {
    readonly kind: 'media';
    readonly plaintext: Uint8Array;
    readonly mediaType: string;
    readonly mediaHandle?: string;
}) | (NewsletterMessageEditInput & {
    readonly kind: 'edit-text';
    readonly plaintext: Uint8Array;
}) | (NewsletterMessageEditInput & {
    readonly kind: 'edit-media';
    readonly plaintext: Uint8Array;
    readonly mediaType: string;
}) | (NewsletterMessageReplyInput & {
    readonly kind: 'reaction';
    readonly reactionCode: string;
}) | (NewsletterMessageReplyInput & {
    readonly kind: 'reaction-revoke';
}) | (NewsletterMessageRevokeInput & {
    readonly kind: 'revoke';
}) | (NewsletterMessageNewInput & {
    readonly kind: 'poll-creation';
    readonly plaintext: Uint8Array;
    readonly contentType?: string;
}) | (NewsletterMessageReplyInput & {
    readonly kind: 'poll-vote';
    readonly votes: readonly Uint8Array[];
    readonly contentType?: string;
});
export declare function buildNewsletterMessageNode(input: BuildNewsletterMessageInput): BinaryNode;
export interface BuildNewsletterViewReceiptInput {
    readonly to: string;
    readonly id: string;
    readonly itemServerIds: readonly number[];
}
export declare function buildNewsletterViewReceiptNode(input: BuildNewsletterViewReceiptInput): BinaryNode;
export declare function buildNewsletterSubscribeLiveUpdatesIq(newsletterJid: string): BinaryNode;
export interface BuildNewsletterMessagesIqInput {
    readonly newsletterJid: string;
    readonly count: number;
    readonly before?: number;
    readonly after?: number;
    readonly viewRole?: string;
}
export declare function buildNewsletterMessagesIq(input: BuildNewsletterMessagesIqInput): BinaryNode;
export interface BuildNewsletterMessageUpdatesIqInput {
    readonly newsletterJid: string;
    readonly count: number;
    readonly since?: number;
    readonly before?: number;
    readonly after?: number;
}
export declare function buildNewsletterMessageUpdatesIq(input: BuildNewsletterMessageUpdatesIqInput): BinaryNode;
export {};
