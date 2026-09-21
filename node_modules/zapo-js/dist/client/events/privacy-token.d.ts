import type { BinaryNode } from '../../transport/types';
export interface ParsedPrivacyToken {
    readonly type: string;
    readonly tokenBytes: Uint8Array;
    readonly timestampS: number;
}
export declare function parsePrivacyTokenNotification(node: BinaryNode): readonly ParsedPrivacyToken[];
