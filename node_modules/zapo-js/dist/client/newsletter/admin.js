"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminOps = createAdminOps;
const mex_1 = require("../newsletter/mex");
const parse_1 = require("../newsletter/parse");
const tos_1 = require("../../transport/node/builders/tos");
const query_1 = require("../../transport/node/query");
const bytes_1 = require("../../util/bytes");
/** Builds the admin operation set. */
function createAdminOps(deps) {
    return {
        create: async (input) => {
            await (0, mex_1.ensureTosAccepted)(deps, 'creation');
            const data = await (0, mex_1.runMex)(deps, 'CreateNewsletter', {
                input: {
                    name: input.name,
                    description: input.description,
                    picture: input.picture ? (0, bytes_1.bytesToBase64)(input.picture) : undefined
                }
            });
            if (!data?.xwa2_newsletter_create) {
                throw new Error('newsletter create returned no envelope');
            }
            return (0, parse_1.parseNewsletterMetadata)(data.xwa2_newsletter_create);
        },
        update: async (newsletterJid, input) => {
            const updates = {};
            if (input.name !== undefined)
                updates.name = input.name;
            if (input.description !== undefined)
                updates.description = input.description;
            if (input.picture !== undefined) {
                updates.picture = input.picture === null ? null : (0, bytes_1.bytesToBase64)(input.picture);
            }
            if (input.reactionCodesSetting !== undefined) {
                updates.reaction_codes = { value: input.reactionCodesSetting };
            }
            const data = await (0, mex_1.runMex)(deps, 'UpdateNewsletter', {
                newsletter_id: newsletterJid,
                updates
            });
            if (!data?.xwa2_newsletter_update) {
                throw new Error('newsletter update returned no envelope');
            }
            return (0, parse_1.parseNewsletterMetadata)(data.xwa2_newsletter_update);
        },
        delete: async (newsletterJid) => {
            await (0, mex_1.runMex)(deps, 'DeleteNewsletter', { newsletter_id: newsletterJid });
        },
        fetchAdminInfo: async (newsletterJid) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterAdminInfo', {
                newsletter_id: newsletterJid
            });
            return (0, parse_1.parseAdminInfo)(data);
        },
        fetchAdminCapabilities: async (newsletterJid) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterAdminCapabilities', {
                newsletter_id: newsletterJid
            });
            return (0, parse_1.parseAdminCapabilities)(data);
        },
        fetchFollowers: async (newsletterJid, opts) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterFollowers', {
                input: {
                    newsletter_id: newsletterJid,
                    count: opts?.count ?? 50
                }
            });
            return (0, parse_1.parseFollowers)(data);
        },
        fetchInsights: (newsletterJid, metrics) => {
            if (metrics.length === 0) {
                throw new Error('newsletter fetchInsights requires at least one metric request');
            }
            return (0, mex_1.runMex)(deps, 'FetchNewsletterInsights', {
                input: {
                    newsletter_id: newsletterJid,
                    metrics
                }
            });
        },
        fetchReports: () => (0, mex_1.runMex)(deps, 'FetchNewsletterReports', {}),
        fetchPendingInvites: async (newsletterJid) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterPendingInvites', {
                newsletter_id: newsletterJid
            });
            return (0, parse_1.parsePendingInvites)(data);
        },
        fetchEnforcements: (newsletterJid) => (0, mex_1.runMex)(deps, 'FetchNewsletterEnforcements', { newsletter_id: newsletterJid }),
        fetchPollVoters: async (input) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterPollVoters', {
                input: {
                    newsletter_id: input.newsletterJid,
                    server_id: String(input.messageServerId),
                    vote_hash: input.voteHash,
                    limit: input.limit ?? 50
                }
            });
            return (0, parse_1.parsePollVoters)(data);
        },
        fetchMessageReactionSenders: async (input) => {
            const data = await (0, mex_1.runMex)(deps, 'FetchNewsletterMessageReactionSenderList', {
                input: {
                    id: input.newsletterJid,
                    server_id: String(input.messageServerId)
                }
            });
            return (0, parse_1.parseReactionSenders)(data);
        },
        logExposures: async (exposures) => {
            await (0, mex_1.runMex)(deps, 'LogNewsletterExposures', {
                input: {
                    exposures: exposures.map((e) => ({
                        newsletter_id: e.newsletterJid,
                        capability: e.capability
                    }))
                }
            });
        },
        changeOwner: async (input) => {
            await (0, mex_1.runMex)(deps, 'ChangeNewsletterOwner', {
                newsletter_id: input.newsletterJid,
                user_id: input.userJid
            });
        },
        demoteAdmin: async (input) => {
            await (0, mex_1.runMex)(deps, 'DemoteNewsletterAdmin', {
                newsletter_id: input.newsletterJid,
                user_id: input.userJid
            });
        },
        createAdminInvite: async (input) => {
            const data = await (0, mex_1.runMex)(deps, 'CreateNewsletterAdminInvite', {
                newsletter_id: input.newsletterJid,
                user_id: input.userJid
            });
            return (0, parse_1.parseAdminInviteResult)(data);
        },
        acceptAdminInvite: async (newsletterJid) => {
            await (0, mex_1.ensureTosAccepted)(deps, 'admin_invite');
            await (0, mex_1.runMex)(deps, 'AcceptNewsletterAdminInvite', { newsletter_id: newsletterJid });
        },
        revokeAdminInvite: async (input) => {
            await (0, mex_1.runMex)(deps, 'RevokeNewsletterAdminInvite', {
                newsletter_id: input.newsletterJid,
                user_id: input.userJid
            });
        },
        queryTosState: async (noticeIds) => {
            if (!deps.queryWithContext) {
                throw new Error('newsletter queryTosState requires queryWithContext');
            }
            const response = await deps.queryWithContext('newsletter.query_tos', (0, tos_1.buildTosQueryIq)(noticeIds));
            (0, query_1.assertIqResult)(response, 'newsletter.query_tos');
            return (0, tos_1.parseTosQueryResponse)(response);
        },
        acceptTos: async (noticeIds) => {
            if (!deps.queryWithContext) {
                throw new Error('newsletter acceptTos requires queryWithContext');
            }
            const response = await deps.queryWithContext('newsletter.accept_tos', (0, tos_1.buildTosUpdateIq)(noticeIds));
            (0, query_1.assertIqResult)(response, 'newsletter.accept_tos');
        }
    };
}
