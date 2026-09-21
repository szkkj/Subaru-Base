import { type WaNewsletterMexDeps } from '../newsletter/mex';
import type { WaNewsletterAdminInfo, WaNewsletterAdminInviteInput, WaNewsletterAdminInviteResult, WaNewsletterCapability, WaNewsletterCapabilityExposure, WaNewsletterCreateInput, WaNewsletterFollowersOptions, WaNewsletterFollowersPage, WaNewsletterInsightMetricRequest, WaNewsletterMetadata, WaNewsletterPollVoter, WaNewsletterReactionSenders, WaNewsletterUpdateInput } from '../newsletter/types';
import type { WaMexOperationResponses } from '../../mex';
import { type WaTosQueryResult } from '../../transport/node/builders/tos';
/** Admin-side newsletter operations (create/update/delete + insights). */
export interface WaNewsletterAdminOps {
    /**
     * Creates a new newsletter the current account will own. **Auto-accepts
     * the newsletter-creation TOS** before issuing the create IQ (no manual
     * {@link acceptTos} call needed). `input.picture` is uploaded as JPEG
     * bytes inline (not via the media transfer path) - keep it small.
     */
    readonly create: (input: WaNewsletterCreateInput) => Promise<WaNewsletterMetadata>;
    /** Updates the newsletter's editable fields (name/description/picture). */
    readonly update: (newsletterJid: string, input: WaNewsletterUpdateInput) => Promise<WaNewsletterMetadata>;
    /**
     * Permanently deletes the newsletter. **Irreversible** - followers are
     * detached, message history is dropped server-side, and the JID is
     * burned (you can't re-create with the same name and recover anything).
     */
    readonly delete: (newsletterJid: string) => Promise<void>;
    /** Returns the admin-only metadata view for the newsletter. */
    readonly fetchAdminInfo: (newsletterJid: string) => Promise<WaNewsletterAdminInfo>;
    /** Returns the set of admin capabilities currently granted to the account. */
    readonly fetchAdminCapabilities: (newsletterJid: string) => Promise<ReadonlySet<WaNewsletterCapability>>;
    /** Lists newsletter followers (paged). */
    readonly fetchFollowers: (newsletterJid: string, options?: WaNewsletterFollowersOptions) => Promise<WaNewsletterFollowersPage>;
    /** Fetches admin analytics for the requested metric set. */
    readonly fetchInsights: (newsletterJid: string, metrics: readonly WaNewsletterInsightMetricRequest[]) => Promise<WaMexOperationResponses['FetchNewsletterInsights'] | null>;
    /** Fetches the moderation reports raised against owned newsletters. */
    readonly fetchReports: () => Promise<WaMexOperationResponses['FetchNewsletterReports'] | null>;
    /** Returns JIDs of pending admin invites for the newsletter. */
    readonly fetchPendingInvites: (newsletterJid: string) => Promise<readonly string[]>;
    /** Fetches any moderation enforcement state applied to the newsletter. */
    readonly fetchEnforcements: (newsletterJid: string) => Promise<WaMexOperationResponses['FetchNewsletterEnforcements'] | null>;
    /** Lists voters of a newsletter poll, grouped by selected option. */
    readonly fetchPollVoters: (input: {
        readonly newsletterJid: string;
        readonly messageServerId: number;
        readonly voteHash: string;
        readonly limit?: number;
    }) => Promise<ReadonlyMap<string, readonly WaNewsletterPollVoter[]>>;
    /** Lists reaction senders for a newsletter message, grouped by emoji. */
    readonly fetchMessageReactionSenders: (input: {
        readonly newsletterJid: string;
        readonly messageServerId: number;
    }) => Promise<readonly WaNewsletterReactionSenders[]>;
    /** Reports newsletter capability exposures back to the server for telemetry. */
    readonly logExposures: (exposures: readonly WaNewsletterCapabilityExposure[]) => Promise<void>;
    /** Transfers newsletter ownership to a previously-invited admin. */
    readonly changeOwner: (input: WaNewsletterAdminInviteInput) => Promise<void>;
    /** Demotes an admin back to a regular follower. */
    readonly demoteAdmin: (input: WaNewsletterAdminInviteInput) => Promise<void>;
    /** Sends an admin invite to a user; returns the invite envelope/expiry. */
    readonly createAdminInvite: (input: WaNewsletterAdminInviteInput) => Promise<WaNewsletterAdminInviteResult>;
    /**
     * Accepts a pending admin invite on the current account.
     * **Auto-accepts the admin-invite TOS** before the accept IQ.
     * Throws when no invite exists or it has been revoked / expired -
     * check {@link fetchPendingInvites} from the inviter side first.
     */
    readonly acceptAdminInvite: (newsletterJid: string) => Promise<void>;
    /** Revokes a previously-sent admin invite. */
    readonly revokeAdminInvite: (input: WaNewsletterAdminInviteInput) => Promise<void>;
    /** Returns the TOS acceptance state for the given notice ids. */
    readonly queryTosState: (noticeIds: readonly string[]) => Promise<WaTosQueryResult>;
    /** Accepts the given TOS notice ids on behalf of the current account. */
    readonly acceptTos: (noticeIds: readonly string[]) => Promise<void>;
}
/** Builds the admin operation set. */
export declare function createAdminOps(deps: WaNewsletterMexDeps): WaNewsletterAdminOps;
