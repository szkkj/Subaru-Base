import type { WaSessionStore } from '../contracts/session.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withSessionLock(store: WaSessionStore): WithDestroyLifecycle<WaSessionStore>;
