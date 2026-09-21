import { type WaNewsletterAdminOps } from '../newsletter/admin';
import { type WaNewsletterDiscoveryOps } from '../newsletter/discovery';
import { type WaNewsletterMessagingDeps, type WaNewsletterMessagingOps } from '../newsletter/messaging';
export { parseNewsletterMetadata } from '../newsletter/parse';
export type { WaNewsletterAdminInfo, WaNewsletterAdminInviteInput, WaNewsletterAdminInviteResult, WaNewsletterAdminProfile, WaNewsletterCapabilityExposure, WaNewsletterCreateInput, WaNewsletterDehydratedMetadata, WaNewsletterDirectoryCategoriesPreviewOptions, WaNewsletterDirectoryCategoryPreview, WaNewsletterDirectoryListOptions, WaNewsletterDirectoryResults, WaNewsletterDirectorySearchOptions, WaNewsletterDirectoryView, WaNewsletterFetchOptions, WaNewsletterFollower, WaNewsletterFollowersOptions, WaNewsletterFollowersPage, WaNewsletterInsightMetricRequest, WaNewsletterMetadata, WaNewsletterMuteInput, WaNewsletterPicture, WaNewsletterPollVoter, WaNewsletterReactInput, WaNewsletterReactionSenders, WaNewsletterRecommendedOptions, WaNewsletterRevokeInput, WaNewsletterSendOptions, WaNewsletterSendResult, WaNewsletterSimilarOptions, WaNewsletterUpdateInput, WaNewsletterViewReceiptInput, WaNewsletterVotePollInput, WaPageInfo } from '../newsletter/types';
/**
 * Newsletter coordinator surface – combines the discovery, admin, and
 * messaging operation sets. Accessed via {@link WaClient.newsletter}.
 */
export type WaNewsletterCoordinator = WaNewsletterDiscoveryOps & WaNewsletterAdminOps & WaNewsletterMessagingOps;
export type WaNewsletterCoordinatorOptions = WaNewsletterMessagingDeps;
/** Builds a {@link WaNewsletterCoordinator} from its MEX/messaging dependencies. */
export declare function createNewsletterCoordinator(options: WaNewsletterCoordinatorOptions): WaNewsletterCoordinator;
