import { type WaNewsletterMexDeps } from '../newsletter/mex';
import type { WaNewsletterDehydratedMetadata, WaNewsletterDirectoryCategoriesPreviewOptions, WaNewsletterDirectoryCategoryPreview, WaNewsletterDirectoryListOptions, WaNewsletterDirectoryResults, WaNewsletterDirectorySearchOptions, WaNewsletterFetchOptions, WaNewsletterMetadata, WaNewsletterRecommendedOptions, WaNewsletterSimilarOptions } from '../newsletter/types';
import { WA_NEWSLETTER_VIEW_ROLES } from '../../protocol/newsletter';
/** Discovery-side newsletter operations (lookup, search, recommendations). */
export interface WaNewsletterDiscoveryOps {
    /** Fetches the full metadata for a newsletter by JID. */
    readonly fetch: (newsletterJid: string, options?: WaNewsletterFetchOptions) => Promise<WaNewsletterMetadata>;
    /** Fetches the full metadata for a newsletter by invite code. */
    readonly fetchByInvite: (inviteCode: string, options?: WaNewsletterFetchOptions) => Promise<WaNewsletterMetadata>;
    /** Lists newsletters the current account is subscribed to. */
    readonly listSubscribed: (options?: {
        readonly fetchWamoSub?: boolean;
    }) => Promise<readonly WaNewsletterMetadata[]>;
    /** Searches the public newsletter directory by text/categories. */
    readonly searchDirectory: (options?: WaNewsletterDirectorySearchOptions) => Promise<WaNewsletterDirectoryResults>;
    /** Lists newsletters recommended for the current account. */
    readonly fetchRecommended: (options?: WaNewsletterRecommendedOptions) => Promise<readonly WaNewsletterMetadata[]>;
    /** Lists newsletters similar to `newsletterJid`. */
    readonly fetchSimilar: (newsletterJid: string, options?: WaNewsletterSimilarOptions) => Promise<readonly WaNewsletterMetadata[]>;
    /** Paged directory listing scoped by country/category. */
    readonly fetchDirectoryList: (options: WaNewsletterDirectoryListOptions) => Promise<WaNewsletterDirectoryResults>;
    /** Preview cards for the directory categories carousel. */
    readonly fetchDirectoryCategoriesPreview: (options: WaNewsletterDirectoryCategoriesPreviewOptions) => Promise<readonly WaNewsletterDirectoryCategoryPreview[]>;
    /** Resolves which of the given URL domains support link previews. */
    readonly fetchIsDomainPreviewable: (domains: readonly string[]) => Promise<ReadonlyMap<string, boolean>>;
    /** Lightweight metadata fetch (no full image / followers). */
    readonly fetchDehydrated: (keyOrInvite: string, options?: {
        readonly viewRole?: keyof typeof WA_NEWSLETTER_VIEW_ROLES;
        readonly fetchWamoSub?: boolean;
    }) => Promise<WaNewsletterDehydratedMetadata>;
}
/** Builds the discovery operation set. */
export declare function createDiscoveryOps(deps: WaNewsletterMexDeps): WaNewsletterDiscoveryOps;
