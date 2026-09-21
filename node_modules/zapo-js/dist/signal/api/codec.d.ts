import type { BinaryNode } from '../../transport/types';
export declare function decodeExactLength(value: BinaryNode['content'], field: string, expectedLength: number): Uint8Array;
export declare function parseUint(bytes: Uint8Array, field: string): number;
export interface ParsedSignalKeyBundleNode {
    readonly identity: Uint8Array;
    readonly signedKey: {
        readonly id: number;
        readonly publicKey: Uint8Array;
        readonly signature: Uint8Array;
    };
    readonly oneTimeKey?: {
        readonly id: number;
        readonly publicKey: Uint8Array;
    };
    readonly deviceIdentity?: Uint8Array;
}
/**
 * Parses the shared `<identity><skey id|value|signature><key id|value><device-identity>`
 * shape used by session pre-key bundles, missing pre-key device bundles, and retry
 * receipt key bundles. Caller is responsible for parsing the `<registration>` node
 * separately when it lives at the same level (it's omitted from retry bundles).
 */
export declare function parseSignalKeyBundleFromNode(node: BinaryNode, fieldPrefix: string): ParsedSignalKeyBundleNode;
