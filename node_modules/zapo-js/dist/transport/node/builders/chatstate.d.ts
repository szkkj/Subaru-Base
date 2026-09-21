import { WA_NODE_TAGS } from '../../../protocol/nodes';
import { type WaChatstateMedia } from '../../../protocol/presence';
import type { BinaryNode } from '../../types';
export type ChatstateState = typeof WA_NODE_TAGS.COMPOSING | typeof WA_NODE_TAGS.PAUSED;
export type ChatstateMedia = WaChatstateMedia;
export interface BuildChatstateNodeInput {
    readonly jid: string;
    readonly state: ChatstateState;
    readonly media?: ChatstateMedia;
}
export declare function buildChatstateNode(input: BuildChatstateNodeInput): BinaryNode;
