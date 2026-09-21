import type { BinaryNode } from '../../types';
export type BuildAckNodeInput = {
    readonly kind: 'notification';
    readonly node: BinaryNode;
    readonly typeOverride?: string;
    readonly includeParticipant?: boolean;
    readonly includeType?: boolean;
    readonly content?: BinaryNode[];
} | {
    readonly kind: 'message';
    readonly node: BinaryNode;
    readonly id: string;
    readonly to: string;
    readonly from?: string | null;
    readonly typeOverride?: string;
    readonly participant?: string;
    readonly recipient?: string;
    readonly error?: number | string;
} | {
    readonly kind: 'receipt';
    readonly node: BinaryNode;
    readonly retryType?: boolean;
    readonly typeOverride?: string;
    readonly includeParticipant?: boolean;
    readonly includeRecipient?: boolean;
} | {
    readonly kind: 'aggregate_message';
    readonly to: string;
    readonly ids: readonly string[];
    readonly recipient?: string;
    readonly participant?: string;
    readonly type?: string;
} | {
    readonly kind: 'nack';
    readonly stanzaTag: string;
    readonly id: string;
    readonly to: string;
    readonly type?: string;
    readonly participant?: string;
    readonly error: number | string;
    readonly failureReason?: number;
} | {
    readonly kind: 'custom';
    readonly ackClass: string;
    readonly to: string;
    readonly id?: string;
    readonly type?: string;
    readonly participant?: string;
    readonly recipient?: string;
    readonly from?: string;
    readonly error?: number | string;
    readonly content?: BinaryNode[];
};
export declare function buildAckNode(input: BuildAckNodeInput): BinaryNode;
export type BuildReceiptNodeInput = {
    readonly kind: 'delivery';
    readonly node: BinaryNode;
    readonly id: string;
    readonly to: string;
} | {
    readonly kind: 'retry_custom';
    readonly id: string;
    readonly to: string;
    readonly participant?: string;
    readonly recipient?: string;
    readonly categoryPeer?: boolean;
    readonly content: BinaryNode[];
} | {
    readonly kind: 'retry';
    readonly node: BinaryNode;
    readonly id: string;
    readonly to: string;
    readonly retryCount?: number;
} | {
    readonly kind: 'outbound';
    readonly id: string;
    readonly to: string;
    readonly type?: string;
    readonly participant?: string;
    readonly recipient?: string;
    readonly category?: string;
    readonly from?: string;
    readonly t?: string;
    readonly peerParticipantPn?: string;
    readonly listIds?: readonly string[];
    readonly content?: BinaryNode[];
} | {
    readonly kind: 'server_error';
    readonly id: string;
    readonly to: string;
    readonly categoryPeer?: boolean;
    readonly encryptCiphertext: Uint8Array;
    readonly encryptIv: Uint8Array;
    readonly rmrJid?: string;
    readonly rmrFromMe?: boolean | string;
    readonly rmrParticipant?: string;
} | {
    readonly kind: 'custom';
    readonly attrs: Readonly<Record<string, string>>;
    readonly content?: BinaryNode[];
};
export declare function buildReceiptNode(input: BuildReceiptNodeInput): BinaryNode;
export declare function buildIqResultNode(iqNode: BinaryNode): BinaryNode;
/**
 * Error counterpart of {@link buildIqResultNode}: answers a server IQ with
 * `<iq type="error"><error code text/></iq>`, echoing the request id.
 */
export declare function buildIqErrorNode(iqNode: BinaryNode, error: {
    readonly code: number;
    readonly text: string;
}): BinaryNode;
