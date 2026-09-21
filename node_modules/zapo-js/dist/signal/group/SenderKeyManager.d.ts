import { type Proto } from '../../proto';
import type { SenderKeyRecord, SignalAddress } from '../types';
import type { WaSenderKeyStore } from '../../store/contracts/sender-key.store';
interface GroupSenderKeyCiphertext {
    readonly groupId: string;
    readonly sender: SignalAddress;
    readonly keyId?: number;
    readonly iteration?: number;
    readonly ciphertext: Uint8Array;
}
/**
 * Implements the sender-key group encryption side of Signal: creates and
 * rotates sender keys, encrypts/decrypts group messages, and tracks which
 * participants have already received the distribution message.
 */
export declare class SenderKeyManager {
    private readonly store;
    private readonly senderLock;
    private readonly getFutureMessagesMax;
    private readonly skipSignatureVerification;
    constructor(store: WaSenderKeyStore, options?: {
        readonly getFutureMessagesMax?: () => number;
        readonly skipSignatureVerification?: boolean;
    });
    /**
     * Produces the distribution message and ciphertext for `plaintext` sent by
     * `sender` into `groupId`. Initializes a sender key when none exists yet.
     */
    prepareGroupEncryption(groupId: string, sender: SignalAddress, plaintext: Uint8Array): Promise<{
        readonly distributionMessage: Proto.Message.ISenderKeyDistributionMessage;
        readonly ciphertext: GroupSenderKeyCiphertext;
        readonly keyId: number;
    }>;
    /** Filters a participant list down to those who have not yet received the current sender key distribution. */
    filterParticipantsNeedingDistribution(groupId: string, senderKeyId: number, participants: readonly SignalAddress[]): Promise<readonly SignalAddress[]>;
    /** Records that the sender key was successfully delivered to the given participants. */
    markSenderKeyDistributed(groupId: string, senderKeyId: number, participants: readonly SignalAddress[]): Promise<void>;
    /**
     * Verifies (per `skipSignatureVerification`) and stores an incoming sender
     * key distribution so subsequent group ciphertexts from `sender` can be
     * decrypted.
     */
    processSenderKeyDistributionPayload(groupId: string, sender: SignalAddress, payload: Uint8Array): Promise<SenderKeyRecord>;
    /** Decrypts an incoming sender-key group ciphertext into plaintext. */
    decryptGroupMessage(payload: GroupSenderKeyCiphertext): Promise<Uint8Array>;
    private ensureSenderKeyInternal;
    private runWithSenderLock;
}
export {};
