import type { WaMessageStore } from '../contracts/message.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withMessageLock(store: WaMessageStore): WithDestroyLifecycle<WaMessageStore>;
