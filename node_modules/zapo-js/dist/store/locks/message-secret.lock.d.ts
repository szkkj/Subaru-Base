import type { WaMessageSecretStore } from '../contracts/message-secret.store';
import type { WithDestroyLifecycle } from '../types';
export declare function withMessageSecretLock(store: WaMessageSecretStore): WithDestroyLifecycle<WaMessageSecretStore>;
