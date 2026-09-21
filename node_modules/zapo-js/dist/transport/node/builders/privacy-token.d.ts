import type { BinaryNode } from '../../types';
export interface BuildPrivacyTokenIqInput {
    readonly jid: string;
    readonly timestampS: number;
    readonly type?: string;
}
export declare function buildPrivacyTokenIqNode(input: BuildPrivacyTokenIqInput): BinaryNode;
export declare function buildTcTokenMessageNode(token: Uint8Array): BinaryNode;
export declare function buildCsTokenMessageNode(hash: Uint8Array): BinaryNode;
