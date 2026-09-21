import type { WaSignalStore } from '../contracts/signal.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withSignalLock(store: WaSignalStore): WithDestroyLifecycle<WaSignalStore>;
