import type { WaPreKeyStore } from '../contracts/pre-key.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withPreKeyLock(store: WaPreKeyStore): WithDestroyLifecycle<WaPreKeyStore>;
