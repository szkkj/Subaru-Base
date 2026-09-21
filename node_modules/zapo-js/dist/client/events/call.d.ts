import { type WaCallPayloadTag } from '../../protocol/call';
import type { BinaryNode } from '../../transport/types';
export type WaCallType = WaCallPayloadTag | 'unknown';
export interface WaCallGroupParticipant {
    /** Primary participant addressing inside the call – typically a LID. */
    readonly jid: string;
    readonly userPnJid?: string;
    readonly username?: string;
    /** Display name for unregistered guests dialled into the call. */
    readonly guestName?: string;
}
export interface ParsedCall {
    readonly type: WaCallType;
    readonly payloadTag?: string;
    readonly callId?: string;
    readonly callCreatorJid?: string;
    readonly senderLidJid?: string;
    readonly callerPnJid?: string;
    readonly groupJid?: string;
    readonly isVideo: boolean;
    readonly callerUsername?: string;
    readonly callerCountryCode?: string;
    readonly callerPushName?: string;
    readonly peerPlatform?: string;
    readonly peerAppVersion?: string;
    readonly timestampSeconds?: number;
    readonly endTimestampSeconds?: number;
    readonly silenceReason?: string;
    readonly groupInfo?: readonly WaCallGroupParticipant[];
}
export declare function parseCallNode(node: BinaryNode): ParsedCall;
