import { type Proto } from '../../proto';
import type { BinaryNode } from '../../transport/types';
export declare const WA_REPORTING_TOKEN_VERSION = 2;
export interface BuildReportingTokenNodeInput {
    readonly message: Proto.IMessage;
    /** Unpadded `proto.Message.encode(message)` bytes, when the caller already has them. */
    readonly messageBytes?: Uint8Array;
    readonly stanzaId: string;
    readonly senderUserJid: string;
    readonly remoteJid: string;
    readonly version?: number;
}
export interface BuildReportingTokenArtifactsResult {
    readonly node: BinaryNode;
    readonly version: number;
    readonly reportingToken: Uint8Array;
    readonly reportingTokenContent: Uint8Array;
    readonly reportingTokenKey: Uint8Array;
}
export declare function buildReportingTokenArtifacts(input: BuildReportingTokenNodeInput): BuildReportingTokenArtifactsResult | null;
