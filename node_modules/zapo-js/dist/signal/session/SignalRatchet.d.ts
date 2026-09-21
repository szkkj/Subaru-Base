import type { ParsedPreKeySignalMessage, ParsedSignalMessage, SignalMessageKey, SignalRecvChain, SignalSessionRecord } from '../types';
export interface DecryptOutcome {
    readonly updatedSession: SignalSessionRecord;
    readonly plaintext: Uint8Array;
    readonly newSessionInfo: {
        readonly newIdentity: Uint8Array | null;
        readonly baseSession: SignalSessionRecord;
        readonly usedPreKey: number | null;
    } | null;
}
export declare function deriveMsgKey(index: number, chainKey: Uint8Array): {
    readonly nextChainKey: Uint8Array;
    readonly messageKey: SignalMessageKey;
};
export declare function selectMessageKey(chain: SignalRecvChain, targetCounter: number): {
    readonly messageKey: SignalMessageKey;
    readonly updatedChain: SignalRecvChain;
};
export declare function encryptMsg(session: SignalSessionRecord, plaintext: Uint8Array): readonly [SignalSessionRecord, {
    type: 'msg' | 'pkmsg';
    ciphertext: Uint8Array;
}];
export declare function decryptMsg(session: SignalSessionRecord | null, parsed: ParsedSignalMessage, onPrevSessionDecryptError?: (error: Error, previousSessionIndex: number) => void): Promise<DecryptOutcome>;
export declare function decryptMsgFromSession(session: SignalSessionRecord, message: ParsedSignalMessage | ParsedPreKeySignalMessage): Promise<readonly [SignalSessionRecord, Uint8Array]>;
