export declare function parseDistributionPayload(payload: Uint8Array): {
    readonly keyId: number;
    readonly iteration: number;
    readonly chainKey: Uint8Array;
    readonly signingPublicKey: Uint8Array;
};
export declare function parseSenderKeyMessage(versionContentMac: Uint8Array): {
    readonly keyId: number;
    readonly iteration: number;
    readonly ciphertext: Uint8Array;
    readonly versionContentMac: Uint8Array;
};
