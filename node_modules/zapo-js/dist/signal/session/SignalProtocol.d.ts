import type { Logger } from '../../infra/log/types';
import { type LocalIdentityContext } from '../session/SignalSession';
import type { SignalAddress, SignalPreKeyBundle, SignalSessionRecord } from '../types';
import type { WaIdentityStore } from '../../store/contracts/identity.store';
import type { WaPreKeyStore } from '../../store/contracts/pre-key.store';
import type { WaSessionStore } from '../../store/contracts/session.store';
import type { WaSignalStore } from '../../store/contracts/signal.store';
interface EstablishOutgoingSessionOptions {
    readonly reuseExisting?: boolean;
    readonly knownAbsent?: boolean;
    /**
     * Preloaded local identity for batch session setup. Must come from
     * {@link SignalProtocol.loadLocalIdentity} on the same store; when
     * absent the identity is read from the store per call.
     */
    readonly localIdentity?: LocalIdentityContext;
}
export interface SignalProtocolStores {
    readonly signal: WaSignalStore;
    readonly preKey: WaPreKeyStore;
    readonly session: WaSessionStore;
    readonly identity: WaIdentityStore;
}
/**
 * High-level Signal protocol session orchestrator: establishes outgoing
 * sessions from prekey bundles, encrypts/decrypts ratchet messages, and owns
 * the per-address session mutation lock.
 */
export declare class SignalProtocol {
    private readonly stores;
    private readonly logger;
    private readonly sessionMutationLock;
    constructor(stores: SignalProtocolStores, logger?: Logger);
    /**
     * Loads the local registration identity once so batch callers can share
     * it across many `prepareOutgoingSession` calls via
     * `options.localIdentity` instead of re-reading the store per address.
     */
    loadLocalIdentity(): Promise<LocalIdentityContext>;
    /**
     * Builds an outgoing Signal session against a remote prekey bundle. Set
     * `options.reuseExisting` to skip the handshake when a session already
     * exists for the same remote identity. Set `options.knownAbsent` only
     * when the caller already proved (within the same logical step) that no
     * session exists; it skips the in-lock recheck and forces a new handshake.
     */
    establishOutgoingSession(address: SignalAddress, remoteBundle: SignalPreKeyBundle, options?: EstablishOutgoingSessionOptions): Promise<SignalSessionRecord>;
    /**
     * Compute an outgoing session under the per-address lock without
     * persisting. Caller batches results and persists via
     * {@link persistOutgoingSessionsBatch} to collapse N `setRemoteIdentity`
     * + `setSession` round-trips into one bulk write per store.
     */
    prepareOutgoingSession(address: SignalAddress, remoteBundle: SignalPreKeyBundle, options?: EstablishOutgoingSessionOptions): Promise<{
        readonly session: SignalSessionRecord;
        readonly remoteIdentity: Uint8Array;
        readonly reusedExisting: boolean;
    }>;
    /**
     * Persist prepared outgoing sessions while holding every per-address
     * lock (same discipline as {@link encryptMessagesBatch}). Re-reads
     * sessions inside the lock; defers to a concurrent writer's session
     * when identities agree to avoid clobbering a fresher ratchet advance,
     * and reports identity conflicts via `skipped`.
     */
    persistOutgoingSessionsBatch(entries: ReadonlyArray<{
        readonly address: SignalAddress;
        readonly session: SignalSessionRecord;
        readonly remoteIdentity: Uint8Array;
    }>): Promise<{
        readonly resolved: ReadonlyArray<{
            readonly address: SignalAddress;
            readonly session: SignalSessionRecord;
        }>;
        readonly skipped: ReadonlyArray<{
            readonly address: SignalAddress;
            readonly reason: 'identity-mismatch';
        }>;
    }>;
    /**
     * Encrypts `plaintext` for `address`. Returns `pkmsg` when this is the
     * first message of the session, `msg` otherwise. `expectedIdentity`
     * enforces identity continuity.
     */
    encryptMessage(address: SignalAddress, plaintext: Uint8Array, expectedIdentity?: Uint8Array): Promise<{
        readonly type: 'msg' | 'pkmsg';
        readonly ciphertext: Uint8Array;
        readonly baseKey: Uint8Array | null;
    }>;
    /** Batch variant of {@link encryptMessage} that shares per-address locks. */
    encryptMessagesBatch(requests: readonly {
        readonly address: SignalAddress;
        readonly plaintext: Uint8Array;
        readonly expectedIdentity?: Uint8Array;
    }[], prefetchedSessions?: readonly {
        readonly address: SignalAddress;
        readonly session: SignalSessionRecord;
    }[]): Promise<readonly {
        readonly type: 'msg' | 'pkmsg';
        readonly ciphertext: Uint8Array;
        readonly baseKey: Uint8Array | null;
    }[]>;
    /**
     * Decrypts a Signal message (`msg` or `pkmsg`) from `address`. For
     * `pkmsg`, instantiates the session from the embedded bundle when needed.
     */
    decryptMessage(address: SignalAddress, envelope: {
        readonly type: 'msg' | 'pkmsg';
        readonly ciphertext: Uint8Array;
    }): Promise<Uint8Array>;
    private runWithAddressLock;
    private decryptPkMsg;
}
export {};
