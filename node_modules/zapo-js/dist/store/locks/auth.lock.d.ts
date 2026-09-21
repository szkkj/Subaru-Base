import type { WaAuthStore } from '../contracts/auth.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withAuthLock(store: WaAuthStore): WithDestroyLifecycle<WaAuthStore>;
