import { type Proto } from '../../proto';
interface WaAppStateDerivedKeys {
    readonly indexHmacKey: Uint8Array;
    readonly valueEncryptionAesKey: Uint8Array;
    readonly valueMacHmacKey: Uint8Array;
    readonly snapshotMacHmacKey: Uint8Array;
    readonly patchMacHmacKey: Uint8Array;
}
interface WaAppStateEncryptedMutation {
    readonly indexMac: Uint8Array;
    readonly valueBlob: Uint8Array;
    readonly valueMac: Uint8Array;
}
interface WaAppStateDecryptedMutation {
    readonly index: string;
    readonly value: Proto.ISyncActionValue | null;
    readonly version: number;
    readonly indexMac: Uint8Array;
    readonly valueMac: Uint8Array;
}
/**
 * Implements the app-state mutation cryptography: HKDF key derivation (with
 * a bounded LRU cache), per-mutation encrypt/decrypt, snapshot/patch MAC
 * generation, and the LT-hash arithmetic used to track collection state.
 */
export declare class WaAppStateCrypto {
    private readonly derivedKeysCache;
    private readonly derivedKeysCacheMaxSize;
    private readonly skipMacVerification;
    constructor(derivedKeysCacheMaxSize?: number, skipMacVerification?: boolean);
    get isMacVerificationSkipped(): boolean;
    /** Empties the derived-keys LRU cache (e.g. after a session reset). */
    clearCache(): void;
    /**
     * Derives the index/value/snapshot/patch keys from an app-state sync key.
     * Cached by base64 of `keyData` (LRU-bounded).
     */
    deriveKeys(keyData: Uint8Array): WaAppStateDerivedKeys;
    /** Computes the HMAC-SHA-256 index MAC over `indexBytes`. */
    generateIndexMac(indexHmacKey: Uint8Array, indexBytes: Uint8Array): Uint8Array;
    /** Encrypts a single mutation value with AES-CBC + HMAC value-MAC. */
    encryptMutation(args: {
        readonly operation: number;
        readonly keyId: Uint8Array;
        readonly keyData: Uint8Array;
        readonly index: string;
        readonly value: Proto.ISyncActionValue | null;
        readonly version: number;
        readonly iv?: Uint8Array;
    }): Promise<WaAppStateEncryptedMutation>;
    /** Verifies and decrypts a single app-state mutation. */
    decryptMutation(args: {
        readonly operation: number;
        readonly keyId: Uint8Array;
        readonly keyData: Uint8Array;
        readonly indexMac: Uint8Array;
        readonly valueBlob: Uint8Array;
    }): Promise<WaAppStateDecryptedMutation>;
    /** Generates the HMAC-SHA-512 snapshot MAC over the LT-hash + version + collection name. */
    generateSnapshotMac(keyData: Uint8Array, ltHash: Uint8Array, version: number, collectionName: string): Promise<Uint8Array>;
    /** Generates the HMAC-SHA-512 patch MAC binding mutations to a collection version. */
    generatePatchMac(keyData: Uint8Array, snapshotMac: Uint8Array, valueMacs: readonly Uint8Array[], version: number, collectionName: string): Promise<Uint8Array>;
    /** Adds value MACs into the running LT-hash digest for a collection. */
    ltHashAdd(base: Uint8Array, addValues: readonly Uint8Array[]): Promise<Uint8Array>;
    /** Removes value MACs from the running LT-hash digest (for `remove` operations). */
    ltHashSubtract(base: Uint8Array, removeValues: readonly Uint8Array[]): Promise<Uint8Array>;
    /** Combined subtract+add LT-hash update used when a key's value MAC changes in place. */
    ltHashSubtractThenAdd(base: Uint8Array, addValues: readonly Uint8Array[], removeValues: readonly Uint8Array[]): Promise<{
        readonly hash: Uint8Array;
        readonly subtractResult: Uint8Array;
    }>;
    private ltHashApply;
    private pointwiseWithOverflow;
    private generateAssociatedData;
    private generateValueMac;
    private touchDerivedKeysCacheEntry;
}
export {};
