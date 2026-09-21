import type { SignalKeyPair } from '../../crypto/curves/types';
export declare const PBKDF2_ITERATIONS: number;
export declare function encodeBytesToCrockford(bytes: Uint8Array): string;
export declare function normalizeCustomPairingCode(input: string): string;
export declare function createCompanionHello(options?: {
    readonly customCode?: string;
}): Promise<{
    readonly pairingCode: string;
    readonly companionEphemeralKeyPair: SignalKeyPair;
    readonly wrappedCompanionEphemeralPub: Uint8Array;
}>;
export declare function completeCompanionFinish(args: {
    readonly pairingCode: string;
    readonly wrappedPrimaryEphemeralPub: Uint8Array;
    readonly primaryIdentityPub: Uint8Array;
    readonly companionEphemeralPrivKey: Uint8Array;
    readonly registrationIdentityKeyPair: SignalKeyPair;
}): Promise<{
    readonly wrappedKeyBundle: Uint8Array;
    readonly companionIdentityPublic: Uint8Array;
    readonly advSecret: Uint8Array;
}>;
