import type { Logger } from '../../infra/log/types';
import type { SignalIdentitySyncApi } from '../api/SignalIdentitySyncApi';
import type { SignalSessionSyncApi } from '../api/SignalSessionSyncApi';
import type { SignalProtocol } from '../session/SignalProtocol';
import type { SignalAddress, SignalSessionRecord } from '../types';
import type { WaIdentityStore } from '../../store/contracts/identity.store';
import type { WaSessionStore } from '../../store/contracts/session.store';
export interface SignalResolvedSessionTarget {
    readonly jid: string;
    readonly address: SignalAddress;
    readonly session: SignalSessionRecord;
}
/**
 * Resolves Signal sessions for one or more JIDs, fetching missing prekey
 * bundles, enforcing identity continuity, and deduplicating concurrent
 * fetches for the same address.
 */
export type SignalSessionResolver = {
    /**
     * Ensures a session exists for `address` (fetching the prekey bundle if
     * needed). `reasonIdentity` triggers a remote identity refresh first.
     */
    ensureSession(address: SignalAddress, jid: string, expectedIdentity?: Uint8Array, reasonIdentity?: boolean): Promise<void>;
    /**
     * Batched session resolver – issues a single key-bundle fetch for all
     * missing JIDs. Returns the resolved targets that now have a session.
     */
    ensureSessionsBatch(targetJids: readonly string[], expectedIdentityByJid?: ReadonlyMap<string, Uint8Array>): Promise<readonly SignalResolvedSessionTarget[]>;
};
/** Builds a {@link SignalSessionResolver} backed by the given Signal APIs and stores. */
export declare function createSignalSessionResolver(options: {
    readonly signalProtocol: SignalProtocol;
    readonly sessionStore: WaSessionStore;
    readonly identityStore: WaIdentityStore;
    readonly signalIdentitySync: SignalIdentitySyncApi;
    readonly signalSessionSync: SignalSessionSyncApi;
    readonly logger: Logger;
}): SignalSessionResolver;
