import type { PreKeyRecord } from '../../signal/types';
import type { WaPreKeyStore as WaPreKeyStoreContract } from '../contracts/pre-key.store';
export interface WaPreKeyMemoryStoreOptions {
    readonly maxPreKeys?: number;
}
export declare class WaPreKeyMemoryStore implements WaPreKeyStoreContract {
    private readonly preKeys;
    private readonly uploadedPreKeys;
    private serverHasPreKeys;
    private nextPreKeyId;
    private readonly maxPreKeys;
    constructor(options?: WaPreKeyMemoryStoreOptions);
    putPreKey(record: PreKeyRecord): Promise<void>;
    getOrGenPreKeys(count: number, generator: (keyId: number) => PreKeyRecord | Promise<PreKeyRecord>): Promise<readonly PreKeyRecord[]>;
    getPreKeyById(keyId: number): Promise<PreKeyRecord | null>;
    getPreKeysById(keyIds: readonly number[]): Promise<readonly (PreKeyRecord | null)[]>;
    consumePreKeyById(keyId: number): Promise<PreKeyRecord | null>;
    getOrGenSinglePreKey(generator: (keyId: number) => PreKeyRecord | Promise<PreKeyRecord>): Promise<PreKeyRecord>;
    markKeyAsUploaded(keyId: number): Promise<void>;
    setServerHasPreKeys(value: boolean): Promise<void>;
    getServerHasPreKeys(): Promise<boolean>;
    clear(): Promise<void>;
}
