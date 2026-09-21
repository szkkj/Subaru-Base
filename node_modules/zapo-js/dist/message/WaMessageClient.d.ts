import type { Logger } from '../infra/log/types';
import type { WaEncryptedMessageInput, WaMessagePublishOptions, WaMessagePublishResult, WaSendReceiptInput } from './types';
import type { BinaryNode } from '../transport/types';
interface WaMessageClientOptions {
    readonly logger: Logger;
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly defaultAckTimeoutMs?: number;
    readonly defaultMaxAttempts?: number;
    readonly defaultRetryDelayMs?: number;
}
/**
 * Low-level message-publishing client. Sends pre-built message/receipt nodes,
 * handles ack timeouts and retry on negative-ack failures, and is the
 * transport hook used by {@link WaMessageCoordinator}.
 */
export declare class WaMessageClient {
    private readonly logger;
    private readonly sendNode;
    private readonly query;
    private readonly defaultAckTimeoutMs;
    private readonly defaultMaxAttempts;
    private readonly defaultRetryDelayMs;
    constructor(options: WaMessageClientOptions);
    /**
     * Publishes a `<message>` stanza and awaits its ack/receipt, retrying on
     * retryable negative-ack errors up to `maxAttempts`. Returns the ack
     * metadata extracted from the server response.
     */
    publishNode(node: BinaryNode, options?: WaMessagePublishOptions): Promise<WaMessagePublishResult>;
    /** Builds the encrypted message envelope from `input` and publishes it via {@link publishNode}. */
    publishEncrypted(input: WaEncryptedMessageInput, options?: WaMessagePublishOptions): Promise<WaMessagePublishResult>;
    /** Fire-and-forget variant: sends a `<message>` stanza without awaiting an ack. */
    sendMessageNode(node: BinaryNode): Promise<void>;
    /** Builds and sends an encrypted message envelope without awaiting an ack. */
    sendEncrypted(input: WaEncryptedMessageInput): Promise<void>;
    private buildEncryptedMessageNode;
    /** Builds and sends a `<receipt>` stanza (delivery/read/played/etc.). */
    sendReceipt(input: WaSendReceiptInput): Promise<void>;
    private isRetryablePublishError;
    private extractAckMetadata;
}
export {};
