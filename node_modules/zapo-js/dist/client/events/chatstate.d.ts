import type { ChatstateMedia, ChatstateState } from '../../transport/node/builders/chatstate';
import type { BinaryNode } from '../../transport/types';
interface ParsedChatstate {
    readonly state: ChatstateState;
    readonly media?: ChatstateMedia;
    readonly participantJid?: string;
}
export declare function parseChatstateNode(node: BinaryNode): ParsedChatstate | null;
export {};
