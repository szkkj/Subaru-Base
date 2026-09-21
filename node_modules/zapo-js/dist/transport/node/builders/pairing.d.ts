import type { BinaryNode } from '../../types';
export declare function buildCompanionHelloRequestNode(args: {
    readonly phoneJid: string;
    readonly shouldShowPushNotification: boolean;
    readonly wrappedCompanionEphemeralPub: Uint8Array;
    readonly companionServerAuthKeyPub: Uint8Array;
    readonly companionPlatformId: string;
    readonly companionPlatformDisplay: string;
}): BinaryNode;
export declare function buildGetCountryCodeRequestNode(): BinaryNode;
export declare function buildCompanionFinishRequestNode(args: {
    readonly phoneJid: string;
    readonly wrappedKeyBundle: Uint8Array;
    readonly companionIdentityPublic: Uint8Array;
    readonly ref: Uint8Array;
}): BinaryNode;
