import type { BinaryNode } from '../types';
export interface NodeIdGenerator {
    readonly prefix: string;
    next(): string;
    nextSystem?(): string;
}
export declare function getNodeChildren(node: BinaryNode): readonly BinaryNode[];
export declare function findNodeChild(node: BinaryNode, tag: string): BinaryNode | undefined;
export declare function getFirstNodeChild(node: BinaryNode): BinaryNode | undefined;
export declare function getNodeChildrenByTag(node: BinaryNode, tag: string): readonly BinaryNode[];
export declare function getNodeChildrenByTagFromChildren(node: BinaryNode, tag: string): readonly BinaryNode[];
export declare function getNodeChildrenTags(node: BinaryNode): readonly string[];
export declare function getNodeChildrenNonEmptyAttrValuesByTag(node: BinaryNode, tag: string, attr: string): readonly string[];
export declare function getNodeChildrenNonEmptyUtf8ByTag(node: BinaryNode, tag: string, field: string): readonly string[];
export declare function findNodeChildrenByTags<const TTags extends readonly string[]>(node: BinaryNode, tags: TTags): {
    readonly [Index in keyof TTags]: BinaryNode | undefined;
};
export declare function hasNodeChild(node: BinaryNode, tag: string): boolean;
export declare function decodeNodeContentUtf8OrBytes(value: BinaryNode['content'], field: string): Uint8Array;
export declare function getNodeTextContent(node: BinaryNode | null | undefined): string | undefined;
/**
 * Binary counterpart of {@link getNodeTextContent}: the node's raw bytes, or
 * `undefined` when it is missing or carries children/text instead. Empty
 * content comes back as a zero-length view, mirroring the empty string
 * {@link getNodeTextContent} returns - check `byteLength` when that matters.
 */
export declare function getNodeBytesContent(node: BinaryNode | null | undefined): Uint8Array | undefined;
export declare function decodeNodeContentBase64OrBytes(value: BinaryNode['content'], field: string): Uint8Array;
export declare function createNodeIdGenerator(): Promise<NodeIdGenerator>;
export declare function createMobileNodeIdGenerator(): NodeIdGenerator;
