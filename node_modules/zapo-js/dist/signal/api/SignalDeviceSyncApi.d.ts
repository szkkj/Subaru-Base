import type { Logger } from '../../infra/log/types';
import type { WaDeviceListStore } from '../../store/contracts/device-list.store';
import { type WaUsyncSidGenerator } from '../../transport/node/usync';
import type { BinaryNode } from '../../transport/types';
interface SignalDeviceSyncApiOptions {
    readonly logger: Logger;
    readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly deviceListStore?: WaDeviceListStore;
    readonly defaultTimeoutMs?: number;
    readonly hostDomain?: string;
    readonly generateSid?: WaUsyncSidGenerator;
}
export interface SignalLidSyncResult {
    /**
     * The phone jid the caller queried (normalized), so results can be correlated
     * back to the input by value rather than by array position. Equals `phoneJid`
     * unless the server corrected the number.
     */
    readonly queriedJid: string;
    /** The server's canonical/corrected phone jid (e.g. BR 9th digit added). */
    readonly phoneJid: string;
    readonly lidJid: string | null;
    readonly exists: boolean;
    /**
     * `true` when the server rejected the number as malformed (`<user
     * jid='undefined'>` with `<contact type='invalid'>`) - distinct from a
     * well-formed number that simply has no WhatsApp account (`exists: false`,
     * `invalid: false`).
     */
    readonly invalid: boolean;
}
/** Both addressing forms of a 1:1 user, as far as they could be resolved. */
export interface SignalUserJidPair {
    /** LID user jid, or `null` when no LID mapping is known. */
    readonly lidJid: string | null;
    /**
     * Phone-number user jid, or `null` when unknown. When resolved through
     * the usync fallback this is the server-canonical form, which may differ
     * from the queried number (e.g. BR 9th digit added).
     */
    readonly pnJid: string | null;
}
/**
 * Resolves the device list and LID mapping for a set of users via the `usync`
 * protocol. Concurrent calls for the same JIDs are deduplicated.
 */
export declare class SignalDeviceSyncApi {
    private readonly logger;
    private readonly query;
    private readonly deviceListStore?;
    private readonly defaultTimeoutMs;
    private readonly hostDomain;
    private readonly generateSid;
    private readonly syncDedup;
    constructor(options: SignalDeviceSyncApiOptions);
    /**
     * Refreshes the device list for every JID in `userJids`. Returns the
     * resolved per-user device JIDs (matches the on-store snapshot).
     */
    syncDeviceList(userJids: readonly string[], timeoutMs?: number): Promise<readonly {
        readonly jid: string;
        readonly deviceJids: readonly string[];
    }[]>;
    private syncDeviceListInternal;
    /**
     * Looks up LIDs for a list of phone JIDs via a `lid` usync query. Returns
     * one entry per input JID with `exists` indicating server-side presence.
     */
    queryLidsByPhoneJids(phoneJids: readonly string[], timeoutMs?: number): Promise<readonly SignalLidSyncResult[]>;
    /**
     * Resolves both addressing forms for a 1:1 user jid (PN or LID input),
     * cache-first via the device-list store (`userJid`/`altUserJid`) with a
     * one-shot {@link queryLidsByPhoneJids} fallback for PN inputs. LID
     * inputs have no reverse lookup - their PN side stays `null` on a cache
     * miss. Store/usync failures are logged at debug and degrade to the
     * forms already known. Inputs that are neither PN nor LID user jids
     * resolve to `{ lidJid: null, pnJid: null }`.
     */
    resolveUserJidPair(userJid: string, timeoutMs?: number): Promise<SignalUserJidPair>;
    /**
     * Returns the device-list snapshot form of `userJid` that satisfies
     * `matches` (checked against `userJid` then `altUserJid`), or `null` when
     * the store is absent, misses, or fails.
     */
    private findCachedAltForm;
    /**
     * Enriches existing device-list snapshots with the resolved LID equivalents
     * so {@link WaDeviceListStore.findByAnyUserJid} can later match a retry
     * receipt arriving in LID form against an eligible list stored in PN form
     * (and vice versa). Skips users with no cached snapshot — the alt gets
     * recorded on the next {@link syncDeviceList} sweep.
     */
    private propagateAltUserJids;
    private collectUsersToQuery;
    private makeDeviceSyncRequest;
    private makeLidSyncRequest;
    private parseDeviceSyncResponse;
    private parseLidSyncResponse;
    /**
     * Recovers the queried phone JID from a `<contact>` echo. Each `<contact>` in a
     * usync response echoes the `+<number>` we sent (base64 text content), so it maps
     * a response node back to the exact input - even when the server corrected the
     * `<user jid>` or rejected it as `jid='undefined'`. Returns `null` when there is
     * no decodable phone echo.
     */
    private recoverContactJid;
    private parseLidSyncContactExists;
    private parseUserDeviceJids;
    private normalizeUsers;
    /**
     * Canonicalizes a user jid, returning `null` instead of throwing when the input
     * is not a valid jid (for example the literal `'undefined'` the server returns
     * for an invalid contact). Lets a single malformed response node be skipped
     * without discarding the rest of the batch.
     */
    private tryNormalizeUserJid;
}
export {};
