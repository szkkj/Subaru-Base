"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDiscoveryOps = createDiscoveryOps;
const mex_1 = require("../newsletter/mex");
const parse_1 = require("../newsletter/parse");
const newsletter_1 = require("../../protocol/newsletter");
/** Builds the discovery operation set. */
function createDiscoveryOps(deps) {
    async function fetchMetadata(key, keyType, opts) {
        const data = await (0, mex_1.runMex)(deps, 'FetchNewsletter', {
            input: {
                key,
                type: keyType,
                view_role: opts?.viewRole ?? newsletter_1.WA_NEWSLETTER_VIEW_ROLES.SUBSCRIBER
            },
            fetch_viewer_metadata: opts?.fetchViewerMetadata ?? true,
            fetch_full_image: opts?.fetchFullImage ?? keyType !== 'INVITE',
            fetch_creation_time: opts?.fetchCreationTime ?? true,
            fetch_wamo_sub: opts?.fetchWamoSub ?? false,
            fetch_status_metadata: false,
            fetch_pinned_messages: true
        });
        if (!data?.xwa2_newsletter) {
            throw new Error('newsletter fetch returned no envelope');
        }
        return (0, parse_1.parseNewsletterMetadata)(data.xwa2_newsletter);
    }
    return {
        fetch: (jid, opts) => fetchMetadata(jid, newsletter_1.WA_NEWSLETTER_FETCH_KEY_TYPES.JID, opts),
        fetchByInvite: (invite, opts) => fetchMetadata(invite, newsletter_1.WA_NEWSLETTER_FETCH_KEY_TYPES.INVITE, opts),
        listSubscribed: async (opts) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchAllNewslettersMetadata', {
                fetch_wamo_sub: opts?.fetchWamoSub ?? false,
                fetch_status_metadata: false
            });
            return (data?.xwa2_newsletter_subscribed ?? []).map(parse_1.parseNewsletterMetadata);
        },
        searchDirectory: async (opts) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterDirectorySearchResults', {
                input: {
                    search_text: opts?.searchText ?? '',
                    categories: opts?.categories ?? [],
                    limit: opts?.limit ?? 100,
                    start_cursor: opts?.startCursor
                },
                fetch_status_metadata: false
            });
            return (0, parse_1.parseDirectorySearch)(data);
        },
        fetchRecommended: async (opts) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchRecommendedNewsletters', {
                input: {
                    limit: opts?.limit ?? 25,
                    country_codes: opts?.countryCodes ?? []
                },
                fetch_status_metadata: false
            });
            return (0, parse_1.parseRecommended)(data);
        },
        fetchSimilar: async (newsletterJid, opts) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchSimilarNewsletters', {
                input: {
                    newsletter_id: newsletterJid,
                    limit: opts?.limit ?? 10,
                    country_codes: opts?.countryCodes ?? []
                },
                fetch_status_metadata: false
            });
            return (0, parse_1.parseSimilar)(data);
        },
        fetchDirectoryList: async (opts) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterDirectoryList', {
                input: {
                    view: opts.view,
                    filters: {
                        country_codes: opts.countryCodes ?? [],
                        categories: opts.categories ?? []
                    },
                    limit: opts.limit ?? 25,
                    start_cursor: opts.startCursor
                },
                fetch_status_metadata: false
            });
            return (0, parse_1.parseDirectoryList)(data);
        },
        fetchDirectoryCategoriesPreview: async (opts) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterDirectoryCategoriesPreview', {
                input: {
                    categories: opts.categories,
                    country_code: opts.countryCode || undefined,
                    per_category_limit: opts.perCategoryLimit ?? 10
                },
                fetch_status_metadata: false
            });
            return (0, parse_1.parseDirectoryCategoriesPreview)(data);
        },
        fetchIsDomainPreviewable: async (domains) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterIsDomainPreviewable', {
                url_domains: domains
            });
            return (0, parse_1.parseDomainsPreviewable)(data);
        },
        fetchDehydrated: async (keyOrInvite, opts) => {
            const isJid = keyOrInvite.endsWith('@newsletter');
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterDehydrated', {
                input: {
                    key: keyOrInvite,
                    type: isJid ? 'JID' : 'INVITE',
                    view_role: opts?.viewRole ?? newsletter_1.WA_NEWSLETTER_VIEW_ROLES.SUBSCRIBER
                },
                fetch_wamo_sub: opts?.fetchWamoSub ?? false,
                fetch_pinned_messages: true
            });
            return (0, parse_1.parseDehydratedMetadata)(data);
        }
    };
}
