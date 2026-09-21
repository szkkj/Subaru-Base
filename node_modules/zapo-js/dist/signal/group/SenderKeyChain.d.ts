import type { SenderKeyRecord, SenderMessageKey } from '../types';
export interface SenderKeyMessageKeyDerivation {
    readonly nextChainKey: Uint8Array;
    readonly messageKey: SenderMessageKey;
}
export interface SenderKeyMessageKeySelection {
    readonly messageKey: SenderMessageKey;
    readonly updatedRecord: SenderKeyRecord;
}
export declare function selectMessageKey(senderKey: SenderKeyRecord, targetIteration: number, futureMessagesMax?: number): SenderKeyMessageKeySelection;
export declare function deriveSenderKeyMsgKey(iteration: number, chainKey: Uint8Array): SenderKeyMessageKeyDerivation;
