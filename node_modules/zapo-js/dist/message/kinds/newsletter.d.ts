import type { WaIncomingMessageEvent, WaIncomingNewsletterMessageUpdateEvent, WaIncomingUnhandledStanzaEvent } from '../../client/types';
import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../../transport/types';
interface ProcessNewsletterMessageOptions {
    readonly logger: Logger;
    readonly emitIncomingMessage?: (event: WaIncomingMessageEvent) => void;
    readonly emitNewsletterMessageUpdate?: (event: WaIncomingNewsletterMessageUpdateEvent) => void;
    readonly emitUnhandledStanza?: (event: WaIncomingUnhandledStanzaEvent) => void;
}
export declare function processNewsletterLiveUpdates(notification: BinaryNode, options: ProcessNewsletterMessageOptions): void;
export declare function processIncomingNewsletterMessage(node: BinaryNode, options: ProcessNewsletterMessageOptions): void;
export {};
