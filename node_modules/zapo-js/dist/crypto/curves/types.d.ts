export interface SignalKeyPair {
    readonly pubKey: Uint8Array;
    readonly privKey: Uint8Array;
}
export declare function pkcs8FromRawPrivate(prefix: Uint8Array, raw: Uint8Array): Uint8Array;
