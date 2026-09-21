import type { WaAppStateStore } from '../contracts/appstate.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withAppStateLock(store: WaAppStateStore): WithDestroyLifecycle<WaAppStateStore>;
