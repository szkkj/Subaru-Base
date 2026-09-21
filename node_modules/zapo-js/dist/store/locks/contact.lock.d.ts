import type { WaContactStore } from '../contracts/contact.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withContactLock(store: WaContactStore): WithDestroyLifecycle<WaContactStore>;
