import type { WriteBehindPersistence } from '../persistence/WriteBehindPersistence';
import type { WaIncomingMessageEvent } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaMessageSecretStore } from '../../store/contracts/message-secret.store';
interface WaPersistIncomingMailboxOptions {
    readonly logger: Logger;
    readonly writeBehind: WriteBehindPersistence;
    readonly messageSecretStore: WaMessageSecretStore;
    /**
     * When `true`, persist the secret of every incoming message, not only the
     * poll / event / bot prompts that `needsSecretPersistence` flags. Wired
     * from the client-level `addons.persistAllSecrets` option.
     */
    readonly persistAllSecrets?: boolean;
    readonly event: WaIncomingMessageEvent;
}
export declare function persistIncomingMailboxEntities(options: WaPersistIncomingMailboxOptions): void;
export {};
