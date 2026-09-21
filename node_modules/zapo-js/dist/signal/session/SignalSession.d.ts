import type { SignalSerializedKeyPair, SignalSessionRecord, SignalSessionSnapshot } from '../types';
import type { WaSignalStore } from '../../store/contracts/signal.store';
/**
 * Local registration identity used to initiate outgoing Signal sessions.
 *
 * @sensitive `staticKeyPair.privKey` is the account's Signal identity
 * private key. Do not `JSON.stringify`, log, or persist instances; the
 * store layer is responsible for encryption at rest.
 */
export interface LocalIdentityContext {
    readonly regId: number;
    readonly staticKeyPair: SignalSerializedKeyPair;
}
interface IncomingRatchetKeys {
    readonly signed: SignalSerializedKeyPair;
    readonly oneTime?: SignalSerializedKeyPair;
    readonly ratchet: SignalSerializedKeyPair;
}
export declare function snapshotToRecord(snapshot: SignalSessionSnapshot): SignalSessionRecord;
export declare function findMatchingSession(session: SignalSessionRecord | null, sessionBaseKey: Uint8Array): SignalSessionRecord | null;
export declare function requireLocalIdentity(store: WaSignalStore): Promise<LocalIdentityContext>;
export declare function initiateSessionOutgoing(local: LocalIdentityContext, remoteBundle: {
    identity: Uint8Array;
    signedKey: {
        id: number;
        publicKey: Uint8Array;
    };
    oneTimeKey?: {
        id: number;
        publicKey: Uint8Array;
    };
    ratchetKey?: Uint8Array;
    regId: number;
}, localOneTimeBase: SignalSerializedKeyPair): Promise<SignalSessionRecord>;
export declare function initiateSessionIncoming(local: LocalIdentityContext, remote: {
    regId: number;
    pubKey: Uint8Array;
}, sessionBaseKey: Uint8Array, localKeys: IncomingRatchetKeys): Promise<SignalSessionRecord>;
export declare function calculateRatchet(rootKey: Uint8Array, localRatchet: SignalSerializedKeyPair, remoteRatchetPubKey: Uint8Array): Promise<{
    readonly rootKey: Uint8Array;
    readonly chainKey: Uint8Array;
}>;
export declare function generateSerializedKeyPair(): Promise<SignalSerializedKeyPair>;
export declare function toSerializedKeyPair(pair: {
    readonly pubKey: Uint8Array;
    readonly privKey: Uint8Array;
}): SignalSerializedKeyPair;
export declare function ecdh(privateKey: Uint8Array, publicKey: Uint8Array): Promise<Uint8Array>;
export {};
