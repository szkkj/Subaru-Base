import type { Logger } from '../../infra/log/types';
import type { SignalPreKeyBundle } from '../types';
import type { BinaryNode } from '../../transport/types';
interface SignalSessionSyncApiOptions {
    readonly logger: Logger;
    readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly defaultTimeoutMs?: number;
    readonly hostDomain?: string;
}
export type SignalSessionKeyBundleResult = {
    readonly jid: string;
    readonly bundle: SignalPreKeyBundle;
    readonly deviceIdentity?: Uint8Array;
} | {
    readonly jid: string;
    readonly errorCode?: string;
    readonly errorText: string;
};
/**
 * Fetches per-device prekey bundles required to start a Signal session.
 * Use {@link fetchKeyBundle} for single-JID calls or {@link fetchKeyBundles}
 * for batched encryption.
 */
export declare class SignalSessionSyncApi {
    private readonly logger;
    private readonly query;
    private readonly defaultTimeoutMs;
    private readonly hostDomain;
    constructor(options: SignalSessionSyncApiOptions);
    /**
     * Convenience wrapper for {@link fetchKeyBundles} that fetches a single
     * bundle and throws on server error envelopes.
     */
    fetchKeyBundle(target: {
        readonly jid: string;
        readonly reasonIdentity?: boolean;
    }, timeoutMs?: number): Promise<{
        readonly jid: string;
        readonly bundle: SignalPreKeyBundle;
        readonly deviceIdentity?: Uint8Array;
    }>;
    /**
     * Batched key-bundle fetch. Returns one entry per JID – either a bundle
     * (success) or an error envelope. Duplicate JIDs are coalesced.
     */
    fetchKeyBundles(targets: readonly {
        readonly jid: string;
        readonly reasonIdentity?: boolean;
    }[], timeoutMs?: number): Promise<readonly SignalSessionKeyBundleResult[]>;
    private parseFetchKeyBundleResponse;
    private parseUserKeyBundle;
}
export {};
