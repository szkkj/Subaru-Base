import type { BinaryNode } from '../../transport/types';
export declare function isAckOrReceiptNode(node: BinaryNode): boolean;
export declare function isNegativeAckNode(node: BinaryNode): boolean;
export declare function isRetryableNegativeAck(node: BinaryNode): boolean;
export declare function describeAckNode(node: BinaryNode): string;
