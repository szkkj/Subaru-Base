import type { WaIdentityStore } from '../contracts/identity.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withIdentityLock(store: WaIdentityStore): WithDestroyLifecycle<WaIdentityStore>;
