import { WA_PRESENCE_TYPES } from '../../protocol/presence';
import type { BinaryNode } from '../../transport/types';
export type IncomingPresenceType = typeof WA_PRESENCE_TYPES.AVAILABLE | typeof WA_PRESENCE_TYPES.UNAVAILABLE;
export type PresenceLastSeen = 
/** Numeric `last` attr the peer disclosed. */
{
    readonly kind: 'timestamp';
    readonly unixSeconds: number;
}
/** Peer's privacy settings hide last-seen from this account (WA `deny` sentinel). */
 | {
    readonly kind: 'privacy_denied';
}
/** Peer has never been online since the contact was added (WA `none` sentinel). */
 | {
    readonly kind: 'never_online';
}
/** WA `error` sentinel or an unparseable `last` value. */
 | {
    readonly kind: 'unknown';
};
interface ParsedPresence {
    readonly type: IncomingPresenceType;
    readonly lastSeen?: PresenceLastSeen;
    readonly groupOnlineCount?: number;
}
export declare function parsePresenceNode(node: BinaryNode): ParsedPresence;
export {};
