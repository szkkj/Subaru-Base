import type { PreKeyRecord, RegistrationInfo, SignedPreKeyRecord } from '../types';
import type { WaPreKeyStore } from '../../store/contracts/pre-key.store';
import type { WaSignalStore } from '../../store/contracts/signal.store';
interface RegistrationBundle {
    readonly registrationInfo: RegistrationInfo;
    readonly signedPreKey: SignedPreKeyRecord;
    readonly firstPreKey: PreKeyRecord;
}
/**
 * Bootstraps a fresh Signal identity: generates registration info, the first
 * signed prekey, and the first one-time prekey, then persists them in order
 * so a partial commit can never split bootstrap state.
 */
export declare function createAndStoreInitialKeys(store: WaSignalStore, preKeyStore: WaPreKeyStore): Promise<RegistrationBundle>;
export {};
