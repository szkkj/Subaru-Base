import type { Logger } from '../../infra/log/types';
import type { WaIdentityStore } from '../../store/contracts/identity.store';
import type { BinaryNode } from '../../transport/types';
export interface SignalIdentitySyncEntry {
    readonly jid: string;
    readonly identity: Uint8Array;
    readonly type?: number;
}
interface SignalIdentitySyncApiOptions {
    readonly logger: Logger;
    readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly identityStore?: WaIdentityStore;
    readonly defaultTimeoutMs?: number;
    readonly hostDomain?: string;
}
/**
 * Fetches identity keys for a list of JIDs from the server and persists them
 * into the identity store. Concurrent calls for the same JID set are
 * deduplicated.
 */
export declare class SignalIdentitySyncApi {
    private readonly logger;
    private readonly query;
    private readonly identityStore?;
    private readonly defaultTimeoutMs;
    private readonly hostDomain;
    private readonly syncDedup;
    constructor(options: SignalIdentitySyncApiOptions);
    /**
     * Fetches and persists identity keys for `targetJids`. Returns one entry
     * per JID the server resolved; missing/erroring users are skipped.
     */
    syncIdentityKeys(targetJids: readonly string[], timeoutMs?: number): Promise<readonly SignalIdentitySyncEntry[]>;
    private syncIdentityKeysInternal;
    private parseIdentitySyncResponse;
}
export {};
