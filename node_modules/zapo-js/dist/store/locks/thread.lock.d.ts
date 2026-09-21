import type { WaThreadStore } from '../contracts/thread.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withThreadLock(store: WaThreadStore): WithDestroyLifecycle<WaThreadStore>;
