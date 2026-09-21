import type { WaButtonAddonKind } from '../../../message/encode/content';
import type { BinaryNode } from '../../types';
interface EncryptedParticipant {
    readonly jid: string;
    readonly encType?: 'msg' | 'pkmsg';
    readonly ciphertext?: Uint8Array;
}
type DirectMessageFanoutInput = {
    readonly to: string;
    readonly type: string;
    readonly id?: string;
    readonly edit?: string;
    readonly participants: readonly EncryptedParticipant[];
    readonly deviceIdentity?: Uint8Array;
    readonly customNodes?: readonly BinaryNode[];
    readonly mediatype?: string;
    readonly decryptFail?: string;
    readonly peerRecipientPn?: string;
    readonly additionalAttributes?: Readonly<Record<string, string>>;
};
type GroupMessageFanoutInput = DirectMessageFanoutInput & {
    readonly phash?: string;
    readonly addressingMode?: 'pn' | 'lid';
    readonly botParticipants?: readonly EncryptedParticipant[];
};
type GroupSenderKeyMessageInput = GroupMessageFanoutInput & {
    readonly groupCiphertext: Uint8Array;
};
type GroupRetryMessageInput = {
    readonly to: string;
    readonly type: string;
    readonly id: string;
    readonly requesterJid: string;
    readonly addressingMode?: 'pn' | 'lid';
    readonly encType: 'msg' | 'pkmsg';
    readonly ciphertext: Uint8Array;
    readonly retryCount: number;
    readonly deviceIdentity?: Uint8Array;
    readonly mediatype?: string;
    readonly decryptFail?: string;
    readonly metaNode?: BinaryNode;
};
export declare function buildButtonAddonNode(kind: WaButtonAddonKind): BinaryNode;
export declare function buildDirectMessageFanoutNode(input: GroupMessageFanoutInput): BinaryNode;
export declare function buildGroupSenderKeyMessageNode(input: GroupSenderKeyMessageInput): BinaryNode;
export declare function buildGroupRetryMessageNode(input: GroupRetryMessageInput): BinaryNode;
export declare function buildMetaNode(attrs: Record<string, string>): BinaryNode;
export {};
