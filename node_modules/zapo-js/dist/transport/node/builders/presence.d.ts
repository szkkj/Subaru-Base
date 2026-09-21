import { WA_PRESENCE_TYPES } from '../../../protocol/presence';
import type { BinaryNode } from '../../types';
export interface BuildPresenceNodeInput {
    readonly type?: typeof WA_PRESENCE_TYPES.AVAILABLE | typeof WA_PRESENCE_TYPES.UNAVAILABLE;
    readonly name?: string;
}
export declare function buildPresenceNode(input?: BuildPresenceNodeInput): BinaryNode;
export interface BuildPresenceSubscribeNodeInput {
    readonly jid: string;
    readonly name?: string;
    readonly context?: string;
    /**
     * Receiver-mode `<tctoken>` node echoed back to prove this account is a
     * trusted contact, gating the target's presence/last-seen visibility.
     * Attached as a child of the `<presence>` stanza when present.
     */
    readonly privacyTokenNode?: BinaryNode;
}
export declare function buildPresenceSubscribeNode(input: BuildPresenceSubscribeNodeInput): BinaryNode;
