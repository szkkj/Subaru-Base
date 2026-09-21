import type { WaSenderKeyStore } from '../contracts/sender-key.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withSenderKeyLock(store: WaSenderKeyStore): WithDestroyLifecycle<WaSenderKeyStore>;
