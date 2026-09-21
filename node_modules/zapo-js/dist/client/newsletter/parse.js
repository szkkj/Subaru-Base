"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNewsletterMetadata = parseNewsletterMetadata;
exports.parseAdminInfo = parseAdminInfo;
exports.parseAdminCapabilities = parseAdminCapabilities;
exports.parsePendingInvites = parsePendingInvites;
exports.parseFollowers = parseFollowers;
exports.parseDirectorySearch = parseDirectorySearch;
exports.parseDirectoryList = parseDirectoryList;
exports.parseRecommended = parseRecommended;
exports.parseSimilar = parseSimilar;
exports.parseDomainsPreviewable = parseDomainsPreviewable;
exports.parseDirectoryCategoriesPreview = parseDirectoryCategoriesPreview;
exports.parseDehydratedMetadata = parseDehydratedMetadata;
exports.parseAdminInviteResult = parseAdminInviteResult;
exports.parseReactionSenders = parseReactionSenders;
exports.parsePollVoters = parsePollVoters;
const newsletter_1 = require("../../protocol/newsletter");
const coercion_1 = require("../../util/coercion");
function asUndef(value) {
    return value === null ? undefined : value;
}
function parsePicture(raw) {
    if (!raw)
        return undefined;
    if (!raw.id && !raw.direct_path)
        return undefined;
    return { id: raw.id, directPath: raw.direct_path };
}
function parseAdminProfile(raw) {
    if (!raw?.name)
        return null;
    return {
        id: raw.id,
        name: raw.name,
        pictureId: raw.picture?.id,
        pictureDirectPath: raw.picture?.direct_path
    };
}
function parsePageInfo(raw) {
    if (!raw)
        return undefined;
    return {
        hasNextPage: raw.hasNextPage,
        hasPreviousPage: raw.hasPreviousPage,
        startCursor: raw.startCursor,
        endCursor: raw.endCursor
    };
}
function parseNewsletterMetadata(envelope) {
    const meta = envelope?.thread_metadata;
    const viewer = envelope?.viewer_metadata;
    const name = meta?.name;
    const description = meta?.description;
    let mutedAdmin;
    let mutedFollower;
    for (const setting of viewer?.settings ?? []) {
        if (setting?.type === newsletter_1.WA_NEWSLETTER_MUTE_TYPES.ADMIN_ACTIVITY) {
            mutedAdmin = setting.value === newsletter_1.WA_NEWSLETTER_MUTE_VALUES.ON;
        }
        else if (setting?.type === newsletter_1.WA_NEWSLETTER_MUTE_TYPES.FOLLOWER_ACTIVITY) {
            mutedFollower = setting.value === newsletter_1.WA_NEWSLETTER_MUTE_VALUES.ON;
        }
    }
    return {
        jid: envelope?.id ?? '',
        state: envelope?.state?.type ?? newsletter_1.WA_NEWSLETTER_STATE_TYPES.ACTIVE,
        creationTime: asUndef((0, coercion_1.tryAsNumber)(meta?.creation_time)),
        name: name?.text,
        nameUpdateTime: asUndef((0, coercion_1.tryAsNumber)(name?.update_time)),
        description: description?.text,
        descriptionUpdateTime: asUndef((0, coercion_1.tryAsNumber)(description?.update_time)),
        picture: parsePicture(meta?.picture),
        preview: parsePicture(meta?.preview),
        invite: meta?.invite,
        handle: meta?.handle,
        subscribersCount: asUndef((0, coercion_1.tryAsNumber)(meta?.subscribers_count)),
        verification: meta?.verification,
        viewerRole: viewer?.role,
        mutedAdmin,
        mutedFollower
    };
}
function parseAdminInfo(data) {
    const admin = data?.xwa2_newsletter_admin;
    if (!admin)
        return { adminProfile: null };
    return {
        adminCount: admin.admin_count,
        adminProfile: parseAdminProfile(admin.admin_profile)
    };
}
function parseAdminCapabilities(data) {
    return new Set(data?.xwa2_newsletter_admin?.capabilities ?? []);
}
function parsePendingInvites(data) {
    const invites = data?.xwa2_newsletter_admin?.pending_admin_invites ?? [];
    const result = [];
    for (const invite of invites) {
        const id = invite?.user?.pn ?? invite?.user?.id;
        if (id)
            result.push(id);
    }
    return result;
}
function parseFollowers(data) {
    const followersWrap = data?.xwa2_newsletter_followers?.followers;
    const followers = [];
    for (const edge of followersWrap?.edges ?? []) {
        const node = edge?.node;
        if (!node?.id)
            continue;
        followers.push({
            id: node.id,
            displayName: node.display_name,
            role: edge.role,
            phoneJid: node.pn,
            username: node.username_info?.username,
            followTime: asUndef((0, coercion_1.tryAsNumber)(edge.follow_time)),
            adminProfile: parseAdminProfile(edge.admin_profile)
        });
    }
    return { followers };
}
function parseDirectoryResponse(root) {
    return {
        results: (root?.result ?? []).map(parseNewsletterMetadata),
        pageInfo: parsePageInfo(root?.page_info)
    };
}
function parseDirectorySearch(data) {
    return parseDirectoryResponse(data?.xwa2_newsletters_directory_search);
}
function parseDirectoryList(data) {
    return parseDirectoryResponse(data?.xwa2_newsletters_directory_list);
}
function parseRecommended(data) {
    return parseDirectoryResponse(data?.xwa2_newsletters_recommended).results;
}
function parseSimilar(data) {
    return parseDirectoryResponse(data?.xwa2_newsletters_similar).results;
}
function parseDomainsPreviewable(data) {
    const map = new Map();
    for (const preview of data?.xwa2_newsletter_message_integrity?.url_previews ?? []) {
        if (preview?.url_domain) {
            map.set(preview.url_domain, preview.is_previewable === true);
        }
    }
    return map;
}
function parseDirectoryCategoriesPreview(data) {
    const result = [];
    for (const entry of data?.xwa2_newsletters_directory_category_preview?.result ?? []) {
        if (!entry?.category)
            continue;
        result.push({
            category: entry.category,
            categoryTitle: entry.category_title,
            newsletters: (entry.newsletters ?? []).map(parseNewsletterMetadata)
        });
    }
    return result;
}
function parseDehydratedMetadata(data) {
    const node = data?.xwa2_newsletter;
    const meta = node?.thread_metadata;
    return {
        jid: node?.id ?? '',
        subscribersCount: asUndef((0, coercion_1.tryAsNumber)(meta?.subscribers_count)),
        verification: meta?.verification,
        reactionCodesSetting: meta?.settings?.reaction_codes?.value,
        wamoSubPlanId: meta?.wamo_sub?.plan_id,
        wamoSubStatus: node?.viewer_metadata?.wamo_sub_status
    };
}
function parseAdminInviteResult(data) {
    const root = data?.xwa2_newsletter_admin_invite_create;
    return {
        inviteId: root?.id,
        expirationTime: asUndef((0, coercion_1.tryAsNumber)(root?.invite_expiration_time))
    };
}
function parseReactionSenders(data) {
    const reactions = data?.xwa2_newsletters_reaction_sender_list?.reactions ?? [];
    return reactions.map((entry) => {
        const senders = [];
        for (const edge of entry?.sender_list?.edges ?? []) {
            if (!edge?.node?.id)
                continue;
            senders.push({
                id: edge.node.id,
                profileUrl: edge.node.profile_pic_direct_path
            });
        }
        return { reactionCode: entry?.reaction_code ?? '', senders };
    });
}
function parsePollVoters(data) {
    const map = new Map();
    for (const group of data?.voter_list?.votes ?? []) {
        if (!group?.vote_hash)
            continue;
        const voters = [];
        for (const edge of group.voter_list?.edges ?? []) {
            if (!edge?.node?.id)
                continue;
            const time = (0, coercion_1.tryAsNumber)(edge.action_time);
            voters.push({
                id: edge.node.id,
                time: time !== null ? Math.floor(time / 1000000) : undefined
            });
        }
        map.set(group.vote_hash, voters);
    }
    return map;
}
