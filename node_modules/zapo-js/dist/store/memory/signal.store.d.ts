import type { RegistrationInfo, SignedPreKeyRecord } from '../../signal/types';
import type { WaSignalStore as WaSignalStoreContract } from '../contracts/signal.store';
export declare class WaSignalMemoryStore implements WaSignalStoreContract {
    private registrationInfo;
    private signedPreKey;
    private signedPreKeyRotationTs;
    constructor();
    getRegistrationInfo(): Promise<RegistrationInfo | null>;
    setRegistrationInfo(info: RegistrationInfo): Promise<void>;
    getSignedPreKey(): Promise<SignedPreKeyRecord | null>;
    setSignedPreKey(record: SignedPreKeyRecord): Promise<void>;
    getSignedPreKeyById(keyId: number): Promise<SignedPreKeyRecord | null>;
    setSignedPreKeyRotationTs(value: number | null): Promise<void>;
    getSignedPreKeyRotationTs(): Promise<number | null>;
    clear(): Promise<void>;
}
