"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupCoordinator = createGroupCoordinator;
const group_1 = require("../events/group");
const defaults_1 = require("../../protocol/defaults");
const group_2 = require("../../protocol/group");
const jid_1 = require("../../protocol/jid");
const message_1 = require("../../protocol/message");
const nodes_1 = require("../../protocol/nodes");
const notification_1 = require("../../protocol/notification");
const account_sync_1 = require("../../transport/node/builders/account-sync");
const community_1 = require("../../transport/node/builders/community");
const group_3 = require("../../transport/node/builders/group");
const helpers_1 = require("../../transport/node/helpers");
const client_1 = require("../../transport/node/mex/client");
const query_1 = require("../../transport/node/query");
const coercion_1 = require("../../util/coercion");
function parseGroupParticipants(node) {
    const parsed = (0, group_1.parseParticipants)(node);
    const participants = new Array(parsed.length);
    let participantsCount = 0;
    for (let index = 0; index < parsed.length; index += 1) {
        const participant = parsed[index];
        if (!participant.jid) {
            continue;
        }
        const type = participant.role ?? group_2.WA_GROUP_PARTICIPANT_TYPES.REGULAR;
        participants[participantsCount] = {
            jid: participant.jid,
            type,
            isAdmin: type === group_2.WA_GROUP_PARTICIPANT_TYPES.ADMIN ||
                type === group_2.WA_GROUP_PARTICIPANT_TYPES.SUPERADMIN,
            isSuperAdmin: type === group_2.WA_GROUP_PARTICIPANT_TYPES.SUPERADMIN,
            lid: participant.lidJid,
            phoneNumber: participant.phoneJid,
            displayName: participant.displayName,
            username: participant.username,
            expirationSeconds: participant.expirationSeconds
        };
        participantsCount += 1;
    }
    participants.length = participantsCount;
    return participants;
}
const APPEAL_STATUSES = new Set(['approved', 'in_review', 'none', 'rejected']);
function parseMembershipApprovalRequests(node) {
    const container = (0, helpers_1.findNodeChild)(node, 'membership_approval_requests');
    if (!container)
        return [];
    const requestNodes = (0, helpers_1.getNodeChildrenByTag)(container, 'membership_approval_request');
    const requests = [];
    for (const requestNode of requestNodes) {
        const jid = requestNode.attrs.jid;
        if (!jid)
            continue;
        const requestTime = requestNode.attrs.request_time
            ? Number(requestNode.attrs.request_time)
            : 0;
        requests.push({
            jid,
            requestor: requestNode.attrs.requestor,
            requestorPhone: requestNode.attrs.requestor_pn,
            requestorUsername: requestNode.attrs.requestor_username,
            parentGroupJid: requestNode.attrs.parent_group_jid,
            requestTime,
            requestMethod: requestNode.attrs.request_method
        });
    }
    return requests;
}
function findGroupTarget(node) {
    if (node.tag === nodes_1.WA_NODE_TAGS.GROUP)
        return node;
    const groupNode = (0, helpers_1.findNodeChild)(node, nodes_1.WA_NODE_TAGS.GROUP);
    if (!groupNode) {
        throw new Error(`expected <group> node in response, got <${node.tag}>`);
    }
    return groupNode;
}
function parseGroupCommons(target) {
    const attrs = target.attrs;
    const descNode = (0, helpers_1.findNodeChild)(target, nodes_1.WA_NODE_TAGS.DESCRIPTION);
    const desc = descNode
        ? (0, helpers_1.getNodeTextContent)((0, helpers_1.findNodeChild)(descNode, nodes_1.WA_NODE_TAGS.BODY))
        : undefined;
    const ephemeralNode = (0, helpers_1.findNodeChild)(target, nodes_1.WA_NODE_TAGS.EPHEMERAL);
    const parentNode = (0, helpers_1.findNodeChild)(target, 'parent');
    const linkedParentNode = (0, helpers_1.findNodeChild)(target, 'linked_parent');
    const membershipApprovalNode = (0, helpers_1.findNodeChild)(target, nodes_1.WA_NODE_TAGS.MEMBERSHIP_APPROVAL_MODE);
    const groupJoinNode = membershipApprovalNode
        ? (0, helpers_1.findNodeChild)(membershipApprovalNode, nodes_1.WA_NODE_TAGS.GROUP_JOIN)
        : undefined;
    const addressingModeRaw = attrs.addressing_mode;
    const addressingMode = addressingModeRaw === message_1.WA_ADDRESSING_MODES.LID
        ? message_1.WA_ADDRESSING_MODES.LID
        : addressingModeRaw === message_1.WA_ADDRESSING_MODES.PN
            ? message_1.WA_ADDRESSING_MODES.PN
            : undefined;
    const rawJid = attrs.id ?? attrs.jid ?? '';
    const jid = rawJid && !rawJid.includes('@') ? `${rawJid}@${defaults_1.WA_DEFAULTS.GROUP_SERVER}` : rawJid;
    return {
        jid,
        subject: attrs.subject ?? '',
        size: attrs.size ? Number(attrs.size) : undefined,
        creation: attrs.creation ? Number(attrs.creation) : undefined,
        subjectOwner: attrs.s_o ?? attrs.subject_owner,
        subjectOwnerPhoneNumber: attrs.s_o_pn,
        subjectOwnerUsername: attrs.s_o_username,
        subjectTime: attrs.s_t ? Number(attrs.s_t) : undefined,
        addressingMode,
        desc,
        descId: descNode?.attrs.id,
        descOwner: descNode?.attrs.participant,
        descTime: descNode?.attrs.t ? Number(descNode.attrs.t) : undefined,
        ephemeral: ephemeralNode?.attrs.expiration
            ? Number(ephemeralNode.attrs.expiration)
            : undefined,
        ephemeralTrigger: ephemeralNode?.attrs.trigger
            ? Number(ephemeralNode.attrs.trigger)
            : undefined,
        linkedParentJid: linkedParentNode?.attrs.jid ?? parentNode?.attrs.jid,
        membershipApprovalEnabled: groupJoinNode?.attrs.state === 'on'
    };
}
function parseGroupMetadata(node) {
    const target = findGroupTarget(node);
    const attrs = target.attrs;
    const commons = parseGroupCommons(target);
    const parentNode = (0, helpers_1.findNodeChild)(target, 'parent');
    const growthLockedNode = (0, helpers_1.findNodeChild)(target, 'growth_locked');
    const appealStatusNode = (0, helpers_1.findNodeChild)(target, 'appeal_status');
    const appealStatusType = appealStatusNode?.attrs.type;
    const appealUpdateTimeNode = (0, helpers_1.findNodeChild)(target, 'appeal_update_time');
    const evolutionVersionNode = (0, helpers_1.findNodeChild)(target, 'evolution_version');
    const memberAddModeNode = (0, helpers_1.findNodeChild)(target, 'member_add_mode');
    const memberLinkModeNode = (0, helpers_1.findNodeChild)(target, 'member_link_mode');
    const memberShareNode = (0, helpers_1.findNodeChild)(target, 'member_share_group_history_mode');
    return {
        ...commons,
        owner: attrs.creator ?? attrs.owner,
        ownerPhoneNumber: attrs.creator_pn,
        ownerUsername: attrs.creator_username,
        ownerCountryCode: attrs.creator_country_code,
        restrict: (0, helpers_1.hasNodeChild)(target, nodes_1.WA_NODE_TAGS.LOCKED),
        announce: (0, helpers_1.hasNodeChild)(target, nodes_1.WA_NODE_TAGS.ANNOUNCEMENT),
        isParentGroup: parentNode !== undefined,
        isClosedCommunity: parentNode?.attrs.default_membership_approval_mode === 'request_required',
        defaultSubgroup: (0, helpers_1.hasNodeChild)(target, 'default_sub_group'),
        generalSubgroup: (0, helpers_1.hasNodeChild)(target, 'general_chat'),
        hiddenSubgroup: (0, helpers_1.hasNodeChild)(target, 'hidden_group'),
        allowNonAdminSubGroupCreation: (0, helpers_1.hasNodeChild)(target, 'allow_non_admin_sub_group_creation'),
        noFrequentlyForwarded: (0, helpers_1.hasNodeChild)(target, 'no_frequently_forwarded'),
        support: (0, helpers_1.hasNodeChild)(target, 'support'),
        suspended: (0, helpers_1.hasNodeChild)(target, 'suspended'),
        incognito: (0, helpers_1.hasNodeChild)(target, 'incognito'),
        allowAdminReports: (0, helpers_1.hasNodeChild)(target, 'allow_admin_reports'),
        autoAddDisabled: (0, helpers_1.hasNodeChild)(target, 'auto_add_disabled'),
        groupHistory: (0, helpers_1.hasNodeChild)(target, 'group_history'),
        capi: (0, helpers_1.hasNodeChild)(target, 'capi'),
        groupSafetyCheck: (0, helpers_1.hasNodeChild)(target, 'group_safety_check'),
        participantLabelEnabled: (0, helpers_1.hasNodeChild)(target, 'participant_label_enabled'),
        limitSharingEnabled: (0, helpers_1.hasNodeChild)(target, 'limit_sharing_enabled'),
        evolutionVersion: evolutionVersionNode?.attrs.value
            ? Number(evolutionVersionNode.attrs.value)
            : undefined,
        memberAddMode: memberAddModeNode ? (0, helpers_1.getNodeTextContent)(memberAddModeNode) : undefined,
        memberLinkMode: memberLinkModeNode ? (0, helpers_1.getNodeTextContent)(memberLinkModeNode) : undefined,
        memberShareGroupHistoryMode: memberShareNode
            ? (0, helpers_1.getNodeTextContent)(memberShareNode)
            : undefined,
        growthLockedExpiration: growthLockedNode?.attrs.expiration
            ? Number(growthLockedNode.attrs.expiration)
            : undefined,
        appealStatus: appealStatusType && APPEAL_STATUSES.has(appealStatusType)
            ? appealStatusType
            : undefined,
        appealUpdateTime: appealUpdateTimeNode?.attrs.value
            ? Number(appealUpdateTimeNode.attrs.value)
            : undefined,
        participants: parseGroupParticipants(target)
    };
}
function parseParticipantActionResult(p) {
    const jid = p.attrs.jid;
    if (!jid)
        return null;
    const errorCode = p.attrs.error;
    const code = errorCode ? Number(errorCode) : 200;
    return {
        jid,
        status: code >= 200 && code < 300 ? 'ok' : 'error',
        code,
        phoneNumber: p.attrs.phone_number,
        username: p.attrs.username,
        raw: p
    };
}
function parseParticipantActionResults(iqResult, action) {
    const wrapper = (0, helpers_1.findNodeChild)(iqResult, action);
    const target = wrapper ?? iqResult;
    const participantNodes = (0, helpers_1.getNodeChildrenByTag)(target, nodes_1.WA_NODE_TAGS.PARTICIPANT);
    const results = new Array(participantNodes.length);
    let count = 0;
    for (const p of participantNodes) {
        const parsed = parseParticipantActionResult(p);
        if (!parsed)
            continue;
        results[count] = parsed;
        count += 1;
    }
    results.length = count;
    return results;
}
function parseGroupInviteInfo(node) {
    const target = findGroupTarget(node);
    const commons = parseGroupCommons(target);
    const participantNodes = (0, helpers_1.getNodeChildrenByTag)(target, nodes_1.WA_NODE_TAGS.PARTICIPANT);
    const participants = new Array(participantNodes.length);
    let participantCount = 0;
    for (const p of participantNodes) {
        const jidAttr = p.attrs.jid;
        if (!jidAttr)
            continue;
        participants[participantCount] = {
            jid: jidAttr,
            phoneNumber: p.attrs.phone_number,
            type: p.attrs.type
        };
        participantCount += 1;
    }
    participants.length = participantCount;
    return {
        ...commons,
        hiddenGroup: (0, helpers_1.hasNodeChild)(target, 'hidden_group'),
        defaultSubgroup: (0, helpers_1.hasNodeChild)(target, 'default_sub_group'),
        generalChat: (0, helpers_1.hasNodeChild)(target, 'general_chat'),
        hasCapi: (0, helpers_1.hasNodeChild)(target, 'capi'),
        participants
    };
}
const SETTING_TAGS = {
    announcement: {
        on: notification_1.WA_GROUP_NOTIFICATION_TAGS.ANNOUNCEMENT,
        off: notification_1.WA_GROUP_NOTIFICATION_TAGS.NOT_ANNOUNCEMENT
    },
    restrict: { on: notification_1.WA_GROUP_NOTIFICATION_TAGS.LOCKED, off: notification_1.WA_GROUP_NOTIFICATION_TAGS.UNLOCKED },
    ephemeral: {
        on: notification_1.WA_GROUP_NOTIFICATION_TAGS.EPHEMERAL,
        off: notification_1.WA_GROUP_NOTIFICATION_TAGS.NOT_EPHEMERAL
    },
    membership_approval_mode: {
        on: notification_1.WA_GROUP_NOTIFICATION_TAGS.MEMBERSHIP_APPROVAL_MODE,
        off: notification_1.WA_GROUP_NOTIFICATION_TAGS.MEMBERSHIP_APPROVAL_MODE
    },
    allow_non_admin_sub_group_creation: {
        on: notification_1.WA_GROUP_NOTIFICATION_TAGS.ALLOW_NON_ADMIN_SUB_GROUP_CREATION,
        off: notification_1.WA_GROUP_NOTIFICATION_TAGS.NOT_ALLOW_NON_ADMIN_SUB_GROUP_CREATION
    },
    group_history: {
        on: notification_1.WA_GROUP_NOTIFICATION_TAGS.GROUP_HISTORY,
        off: notification_1.WA_GROUP_NOTIFICATION_TAGS.NO_GROUP_HISTORY
    },
    allow_admin_reports: {
        on: notification_1.WA_GROUP_NOTIFICATION_TAGS.ALLOW_ADMIN_REPORTS,
        off: notification_1.WA_GROUP_NOTIFICATION_TAGS.NOT_ALLOW_ADMIN_REPORTS
    },
    no_frequently_forwarded: {
        on: notification_1.WA_GROUP_NOTIFICATION_TAGS.NO_FREQUENTLY_FORWARDED,
        off: notification_1.WA_GROUP_NOTIFICATION_TAGS.FREQUENTLY_FORWARDED_OK
    }
};
function parseSubGroupNode(node, defaultSubgroup) {
    const n = (0, coercion_1.tryAsRecord)(node);
    const subject = (0, coercion_1.tryAsRecord)(n?.subject);
    const properties = (0, coercion_1.tryAsRecord)(n?.properties);
    const approvals = (0, coercion_1.tryAsRecord)(n?.membership_approval_requests);
    return {
        jid: (0, coercion_1.tryAsString)(n?.id) ?? '',
        subject: (0, coercion_1.tryAsString)(subject?.value) ?? undefined,
        subjectTime: (0, coercion_1.tryAsNumber)(subject?.creation_time) ?? undefined,
        defaultSubgroup,
        generalSubgroup: properties?.general_chat === true,
        hiddenSubgroup: properties?.hidden_group === true,
        membershipApprovalEnabled: properties?.membership_approval_mode_enabled === true,
        pendingMembershipRequests: (0, coercion_1.tryAsNumber)(approvals?.total_count) ?? 0
    };
}
function parseGroupIsInternalMexResponse(data) {
    return data?.xwa2_group_query_by_id?.properties?.internal === true;
}
function parseGroupSuspensionAppealMexResponse(data) {
    const root = data?.wa_create_group_suspension_appeal;
    const responseCode = (0, coercion_1.tryAsString)(root?.response_code);
    return {
        success: responseCode === 'SUCCESS' || responseCode === 'APPEAL_ALREADY_EXISTS',
        responseCode,
        errorMessage: (0, coercion_1.tryAsString)(root?.error_message),
        appealCreationTime: (0, coercion_1.tryAsNumber)(root?.appeal_creation_time)
    };
}
function parseSubGroupSuggestionsMexResponse(data) {
    const edges = data?.xwa2_group_query_by_id?.sub_group_suggestions?.edges ?? [];
    const results = [];
    for (const edge of edges) {
        const node = edge?.node;
        if (!node?.id)
            continue;
        results.push({
            jid: node.id,
            subject: node.subject?.value ?? null,
            description: node.description?.value ?? null,
            creator: node.creator?.id ?? null,
            creationTime: (0, coercion_1.tryAsNumber)(node.creation_time),
            participantCount: node.total_participants_count ?? null,
            isExistingGroup: node.is_existing_group === true,
            hiddenGroup: node.hidden_group === true
        });
    }
    return results;
}
/** Builds a {@link WaGroupCoordinator} backed by the given IQ query function and optional MEX socket. */
function createGroupCoordinator(options) {
    const { queryWithContext, mexSocket } = options;
    const changeParticipants = async (action, groupJid, participants) => {
        const context = `group.${action}Participants`;
        const node = (0, group_3.buildGroupParticipantChangeIq)({
            groupJid,
            action,
            participants
        });
        const result = await queryWithContext(context, node);
        (0, query_1.assertIqResult)(result, context);
        return parseParticipantActionResults(result, action);
    };
    const queryInvite = async (type, groupJid, context) => {
        const node = (0, query_1.buildIqNode)(type, groupJid, nodes_1.WA_XMLNS.GROUPS, [
            { tag: nodes_1.WA_NODE_TAGS.INVITE, attrs: {} }
        ]);
        const result = await queryWithContext(context, node);
        (0, query_1.assertIqResult)(result, context);
        const code = (0, helpers_1.findNodeChild)(result, nodes_1.WA_NODE_TAGS.INVITE)?.attrs.code;
        if (!code) {
            throw new Error(`${context}: missing invite code in response`);
        }
        return { result, code };
    };
    return {
        queryGroupMetadata: async (groupJid) => {
            const node = (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, groupJid, nodes_1.WA_XMLNS.GROUPS, [
                {
                    tag: nodes_1.WA_NODE_TAGS.QUERY,
                    attrs: {}
                }
            ]);
            const result = await queryWithContext('group.metadata', node);
            (0, query_1.assertIqResult)(result, 'group.metadata');
            return parseGroupMetadata(result);
        },
        queryAllGroups: async () => {
            const result = await queryWithContext('group.list', (0, account_sync_1.buildListParticipatingGroupsIq)());
            (0, query_1.assertIqResult)(result, 'group.list');
            const groupNodes = (0, helpers_1.getNodeChildrenByTagFromChildren)(result, nodes_1.WA_NODE_TAGS.GROUP);
            const metadata = new Array(groupNodes.length);
            for (let index = 0; index < groupNodes.length; index += 1) {
                metadata[index] = parseGroupMetadata(groupNodes[index]);
            }
            return metadata;
        },
        queryGroupInviteInfo: async (code) => {
            const node = (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.GROUP_SERVER, nodes_1.WA_XMLNS.GROUPS, [
                { tag: nodes_1.WA_NODE_TAGS.INVITE, attrs: { code } }
            ]);
            const result = await queryWithContext('group.invite.info', node);
            (0, query_1.assertIqResult)(result, 'group.invite.info');
            return parseGroupInviteInfo(result);
        },
        createGroup: async (subject, participants, opts) => {
            const node = (0, group_3.buildCreateGroupIq)({
                subject,
                participants,
                description: opts?.description,
                linkedParentJid: opts?.linkedParentJid
            });
            const result = await queryWithContext('group.create', node);
            (0, query_1.assertIqResult)(result, 'group.create');
            return parseGroupMetadata(result);
        },
        setSubject: async (groupJid, subject) => {
            const node = (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, groupJid, nodes_1.WA_XMLNS.GROUPS, [
                { tag: nodes_1.WA_NODE_TAGS.SUBJECT, attrs: {}, content: subject }
            ]);
            const result = await queryWithContext('group.setSubject', node);
            (0, query_1.assertIqResult)(result, 'group.setSubject');
        },
        setDescription: async (groupJid, description, prevDescId) => {
            const descId = `${Date.now()}`;
            const attrs = { id: descId };
            if (prevDescId)
                attrs.prev = prevDescId;
            let content;
            if (description === null) {
                attrs.delete = 'true';
            }
            else {
                content = [{ tag: nodes_1.WA_NODE_TAGS.BODY, attrs: {}, content: description }];
            }
            const node = (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, groupJid, nodes_1.WA_XMLNS.GROUPS, [
                { tag: nodes_1.WA_NODE_TAGS.DESCRIPTION, attrs, content }
            ]);
            const result = await queryWithContext('group.setDescription', node);
            (0, query_1.assertIqResult)(result, 'group.setDescription');
        },
        setMemberAddMode: async (groupJid, mode) => {
            const node = (0, group_3.buildSetGroupMemberAddModeIq)({ groupJid, mode });
            const result = await queryWithContext('group.setMemberAddMode', node, undefined, {
                groupJid,
                mode
            });
            (0, query_1.assertIqResult)(result, 'group.setMemberAddMode');
        },
        setMemberLinkMode: async (groupJid, mode) => {
            const node = (0, group_3.buildSetGroupMemberLinkModeIq)({ groupJid, mode });
            const result = await queryWithContext('group.setMemberLinkMode', node, undefined, {
                groupJid,
                mode
            });
            (0, query_1.assertIqResult)(result, 'group.setMemberLinkMode');
        },
        setMemberShareGroupHistoryMode: async (groupJid, mode) => {
            const node = (0, group_3.buildSetGroupMemberShareGroupHistoryModeIq)({ groupJid, mode });
            const result = await queryWithContext('group.setMemberShareGroupHistoryMode', node, undefined, { groupJid, mode });
            (0, query_1.assertIqResult)(result, 'group.setMemberShareGroupHistoryMode');
        },
        setEphemeralDuration: async (groupJid, expirationSeconds, trigger) => {
            if (!Number.isFinite(expirationSeconds) ||
                !Number.isSafeInteger(expirationSeconds) ||
                expirationSeconds < 0) {
                throw new Error(`invalid expirationSeconds: ${expirationSeconds}`);
            }
            if (trigger !== undefined) {
                if (!Number.isFinite(trigger) || !Number.isSafeInteger(trigger) || trigger < 0) {
                    throw new Error(`invalid trigger: ${trigger}`);
                }
            }
            const node = (0, group_3.buildSetGroupEphemeralIq)({
                groupJid,
                expirationSeconds,
                ...(trigger === undefined ? {} : { trigger })
            });
            const result = await queryWithContext('group.setEphemeralDuration', node, undefined, {
                groupJid,
                expirationSeconds,
                ...(trigger === undefined ? {} : { trigger })
            });
            (0, query_1.assertIqResult)(result, 'group.setEphemeralDuration');
        },
        setSetting: async (groupJid, setting, enabled) => {
            const tags = SETTING_TAGS[setting];
            const tag = enabled ? tags.on : tags.off;
            let content;
            if (setting === 'membership_approval_mode') {
                content = [
                    {
                        tag: nodes_1.WA_NODE_TAGS.GROUP_JOIN,
                        attrs: { state: enabled ? 'on' : 'off' }
                    }
                ];
            }
            const node = (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, groupJid, nodes_1.WA_XMLNS.GROUPS, [
                { tag, attrs: {}, ...(content ? { content } : {}) }
            ]);
            const result = await queryWithContext('group.setSetting', node);
            (0, query_1.assertIqResult)(result, 'group.setSetting');
        },
        addParticipants: async (groupJid, participants) => changeParticipants('add', groupJid, participants),
        removeParticipants: async (groupJid, participants) => changeParticipants('remove', groupJid, participants),
        promoteParticipants: async (groupJid, participants) => changeParticipants('promote', groupJid, participants),
        demoteParticipants: async (groupJid, participants) => changeParticipants('demote', groupJid, participants),
        leaveGroup: async (groupJids) => {
            const node = (0, group_3.buildLeaveGroupIq)(groupJids);
            const result = await queryWithContext('group.leave', node);
            (0, query_1.assertIqResult)(result, 'group.leave');
        },
        queryInviteCode: async (groupJid) => {
            const { code } = await queryInvite(nodes_1.WA_IQ_TYPES.GET, groupJid, 'group.queryInviteCode');
            return code;
        },
        revokeInvite: async (groupJid) => {
            const { result, code } = await queryInvite(nodes_1.WA_IQ_TYPES.SET, groupJid, 'group.revokeInvite');
            const participantNodes = (0, helpers_1.getNodeChildrenByTag)(result, nodes_1.WA_NODE_TAGS.PARTICIPANT);
            const affectedParticipants = new Array(participantNodes.length);
            let affectedCount = 0;
            for (const p of participantNodes) {
                const parsed = parseParticipantActionResult(p);
                if (!parsed)
                    continue;
                affectedParticipants[affectedCount] = parsed;
                affectedCount += 1;
            }
            affectedParticipants.length = affectedCount;
            return { code, affectedParticipants };
        },
        joinGroupViaInvite: async (code) => {
            const node = (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.GROUP_SERVER, nodes_1.WA_XMLNS.GROUPS, [
                { tag: nodes_1.WA_NODE_TAGS.INVITE, attrs: { code } }
            ]);
            const result = await queryWithContext('group.joinViaInvite', node);
            (0, query_1.assertIqResult)(result, 'group.joinViaInvite');
            return parseGroupMetadata(result);
        },
        createCommunity: async (subject, opts) => {
            const node = (0, group_3.buildCreateGroupIq)({
                subject,
                participants: [],
                description: opts?.description,
                parent: opts?.membershipApprovalMode === 'open'
                    ? true
                    : { defaultMembershipApprovalMode: 'request_required' },
                allowNonAdminSubGroupCreation: opts?.allowNonAdminSubGroupCreation,
                createGeneralChat: opts?.createGeneralChat
            });
            const result = await queryWithContext('community.create', node);
            (0, query_1.assertIqResult)(result, 'community.create');
            return parseGroupMetadata(result);
        },
        deactivateCommunity: async (communityJid) => {
            const node = (0, community_1.buildDeactivateCommunityIq)(communityJid);
            const result = await queryWithContext('community.deactivate', node);
            (0, query_1.assertIqResult)(result, 'community.deactivate');
        },
        linkSubGroups: async (communityJid, subGroupJids) => {
            const node = (0, community_1.buildLinkSubGroupsIq)({
                communityJid,
                subGroups: subGroupJids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('community.linkSubGroups', node);
            (0, query_1.assertIqResult)(result, 'community.linkSubGroups');
            const linksNode = (0, helpers_1.findNodeChild)(result, 'links');
            const linkNode = linksNode ? (0, helpers_1.findNodeChild)(linksNode, 'link') : undefined;
            const groupNodes = linkNode ? (0, helpers_1.getNodeChildrenByTag)(linkNode, nodes_1.WA_NODE_TAGS.GROUP) : [];
            const linkedJids = [];
            const failed = [];
            for (const groupNode of groupNodes) {
                const jid = groupNode.attrs.jid;
                if (!jid)
                    continue;
                const errorAttr = (0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.ERROR)?.attrs.code;
                if (errorAttr !== undefined) {
                    failed.push({ jid, error: Number(errorAttr) });
                }
                else {
                    linkedJids.push(jid);
                }
            }
            return { linkedJids, failed };
        },
        unlinkSubGroups: async (communityJid, subGroupJids, options) => {
            const node = (0, community_1.buildUnlinkSubGroupsIq)({
                communityJid,
                subGroupJids,
                removeOrphanedMembers: options?.removeOrphanedMembers
            });
            const result = await queryWithContext('community.unlinkSubGroups', node);
            (0, query_1.assertIqResult)(result, 'community.unlinkSubGroups');
            const unlinkNode = (0, helpers_1.findNodeChild)(result, 'unlink');
            const groupNodes = unlinkNode
                ? (0, helpers_1.getNodeChildrenByTag)(unlinkNode, nodes_1.WA_NODE_TAGS.GROUP)
                : [];
            const unlinkedJids = [];
            const failed = [];
            for (const groupNode of groupNodes) {
                const jid = groupNode.attrs.jid;
                if (!jid)
                    continue;
                const errorAttr = (0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.ERROR)?.attrs.code;
                if (errorAttr !== undefined) {
                    failed.push({ jid, error: Number(errorAttr) });
                }
                else {
                    unlinkedJids.push(jid);
                }
            }
            return { unlinkedJids, failed };
        },
        queryLinkedGroupsParticipants: async (communityJid) => {
            const node = (0, community_1.buildLinkedGroupsParticipantsIq)(communityJid);
            const result = await queryWithContext('community.linkedGroupsParticipants', node);
            (0, query_1.assertIqResult)(result, 'community.linkedGroupsParticipants');
            const container = (0, helpers_1.findNodeChild)(result, 'linked_groups_participants');
            return container ? parseGroupParticipants(container) : [];
        },
        fetchSubGroups: async (communityJid) => {
            if (!mexSocket) {
                throw new Error('community.fetchSubGroups requires a mex transport');
            }
            const data = await (0, client_1.runMexQuery)(mexSocket, 'FetchAllSubgroups', {
                group_id: communityJid,
                query_context: 'INTERACTIVE',
                sub_group_hint_id: undefined
            });
            const groupQuery = data?.xwa2_group_query_by_id;
            const announcementGroup = groupQuery?.default_sub_group
                ? parseSubGroupNode(groupQuery.default_sub_group, true)
                : null;
            const edges = (groupQuery?.sub_groups?.edges ?? []);
            const subGroups = [];
            for (const edge of edges) {
                if (!edge?.node)
                    continue;
                subGroups.push(parseSubGroupNode(edge.node, false));
            }
            return { communityJid, announcementGroup, subGroups };
        },
        queryMembershipApprovalRequests: async (groupJid) => {
            const node = (0, group_3.buildGetMembershipApprovalRequestsIq)(groupJid);
            const result = await queryWithContext('group.membershipRequests', node);
            (0, query_1.assertIqResult)(result, 'group.membershipRequests');
            return parseMembershipApprovalRequests(result);
        },
        approveMembershipRequests: async (groupJid, participantJids) => {
            const node = (0, group_3.buildMembershipRequestsActionIq)({ groupJid, approve: participantJids });
            const result = await queryWithContext('group.membershipRequests.approve', node);
            (0, query_1.assertIqResult)(result, 'group.membershipRequests.approve');
        },
        rejectMembershipRequests: async (groupJid, participantJids) => {
            const node = (0, group_3.buildMembershipRequestsActionIq)({ groupJid, reject: participantJids });
            const result = await queryWithContext('group.membershipRequests.reject', node);
            (0, query_1.assertIqResult)(result, 'group.membershipRequests.reject');
        },
        cancelMembershipRequests: async (groupJid, participantJids) => {
            const node = (0, group_3.buildCancelMembershipRequestsIq)({ groupJid, participantJids });
            const result = await queryWithContext('group.membershipRequests.cancel', node);
            (0, query_1.assertIqResult)(result, 'group.membershipRequests.cancel');
        },
        joinLinkedGroup: async (communityJid, subGroupJid, options) => {
            const node = (0, group_3.buildJoinLinkedGroupIq)({
                groupJid: communityJid,
                subGroupJid,
                type: options?.type
            });
            const result = await queryWithContext('community.joinLinkedGroup', node);
            (0, query_1.assertIqResult)(result, 'community.joinLinkedGroup');
        },
        isInternalGroup: async (groupJid) => {
            if (!mexSocket) {
                throw new Error('group.isInternalGroup requires a mex transport');
            }
            const data = await (0, client_1.runMexQuery)(mexSocket, 'FetchGroupIsInternal', { id: groupJid });
            return parseGroupIsInternalMexResponse(data);
        },
        transferCommunityOwnership: async (communityJid, newOwnerJid) => {
            if (!mexSocket) {
                throw new Error('community.transferOwnership requires a mex transport');
            }
            await (0, client_1.runMexQuery)(mexSocket, 'TransferCommunityOwnership', {
                input: {
                    group_id: communityJid,
                    role_updates: [{ new_role: 'SUPERADMIN_MEMBER', user_jid: newOwnerJid }]
                }
            });
        },
        fetchSubgroupSuggestions: async (communityJid, hintSubgroupJid) => {
            if (!mexSocket) {
                throw new Error('community.fetchSubgroupSuggestions requires a mex transport');
            }
            const data = await (0, client_1.runMexQuery)(mexSocket, 'FetchSubgroupSuggestions', {
                group_id: communityJid,
                query_context: 'INTERACTIVE',
                sub_group_hint_id: hintSubgroupJid
            });
            return parseSubGroupSuggestionsMexResponse(data);
        },
        submitGroupSuspensionAppeal: async (groupJid, options) => {
            if (!mexSocket) {
                throw new Error('group.submitSuspensionAppeal requires a mex transport');
            }
            const data = await (0, client_1.runMexQuery)(mexSocket, 'GroupSuspensionAppeal', {
                input: {
                    group_jid: (0, jid_1.parseJidFull)(groupJid).address.user,
                    appeal_reason: options?.reason ?? undefined,
                    debug_info: options?.debugInfo ?? '{}'
                }
            });
            return parseGroupSuspensionAppealMexResponse(data);
        }
    };
}
