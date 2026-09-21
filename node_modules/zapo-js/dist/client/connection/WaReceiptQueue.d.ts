import type { BinaryNode } from '../../transport/types';
export declare class WaReceiptQueue {
    private readonly maxSize;
    private readonly danglingReceipts;
    private danglingHead;
    constructor(options?: {
        readonly maxSize?: number;
    });
    shouldQueue(node: BinaryNode, error: Error): boolean;
    enqueue(node: BinaryNode): void;
    take(): readonly BinaryNode[];
    size(): number;
}
