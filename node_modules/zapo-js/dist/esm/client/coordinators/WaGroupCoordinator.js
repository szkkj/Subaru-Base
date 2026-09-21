import { parseParticipants as parseGroupEventParticipants } from '../events/group.js';
import { WA_DEFAULTS } from '../../protocol/defaults.js';
import { WA_GROUP_PARTICIPANT_TYPES } from '../../protocol/group.js';
import { parseJidFull } from '../../protocol/jid.js';
import { WA_ADDRESSING_MODES } from '../../protocol/message.js';
import { WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../protocol/nodes.js';
import { WA_GROUP_NOTIFICATION_TAGS } from '../../protocol/notification.js';
import { buildListParticipatingGroupsIq } from '../../transport/node/builders/account-sync.js';
import { buildDeactivateCommunityIq, buildLinkedGroupsParticipantsIq, buildLinkSubGroupsIq, buildUnlinkSubGroupsIq } from '../../transport/node/builders/community.js';
import { buildCancelMembershipRequestsIq, buildCreateGroupIq, buildGetMembershipApprovalRequestsIq, buildGroupParticipantChangeIq, buildJoinLinkedGroupIq, buildLeaveGroupIq, buildMembershipRequestsActionIq, buildSetGroupEphemeralIq, buildSetGroupMemberAddModeIq, buildSetGroupMemberLinkModeIq, buildSetGroupMemberShareGroupHistoryModeIq } from '../../transport/node/builders/group.js';
import { findNodeChild, getNodeChildrenByTag, getNodeChildrenByTagFromChildren, getNodeTextContent, hasNodeChild } from '../../transport/node/helpers.js';
import { runMexQuery } from '../../transport/node/mex/client.js';
import { assertIqResult, buildIqNode } from '../../transport/node/query.js';
import { tryAsNumber, tryAsRecord, tryAsString } from '../../util/coercion.js';
function parseGroupParticipants(node) {
    const parsed = parseGroupEventParticipants(node);
    const participants = new Array(parsed.length);
    let participantsCount = 0;
    for (let index = 0; index < parsed.length; index += 1) {
        const participant = parsed[index];
        if (!participant.jid) {
            continue;
        }
        const type = participant.role ?? WA_GROUP_PARTICIPANT_TYPES.REGULAR;
        participants[participantsCount] = {
            jid: participant.jid,
            type,
            isAdmin: type === WA_GROUP_PARTICIPANT_TYPES.ADMIN ||
                type === WA_GROUP_PARTICIPANT_TYPES.SUPERADMIN,
            isSuperAdmin: type === WA_GROUP_PARTICIPANT_TYPES.SUPERADMIN,
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
    const container = findNodeChild(node, 'membership_approval_requests');
    if (!container)
        return [];
    const requestNodes = getNodeChildrenByTag(container, 'membership_approval_request');
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
    if (node.tag === WA_NODE_TAGS.GROUP)
        return node;
    const groupNode = findNodeChild(node, WA_NODE_TAGS.GROUP);
    if (!groupNode) {
        throw new Error(`expected <group> node in response, got <${node.tag}>`);
    }
    return groupNode;
}
function parseGroupCommons(target) {
    const attrs = target.attrs;
    const descNode = findNodeChild(target, WA_NODE_TAGS.DESCRIPTION);
    const desc = descNode
        ? getNodeTextContent(findNodeChild(descNode, WA_NODE_TAGS.BODY))
        : undefined;
    const ephemeralNode = findNodeChild(target, WA_NODE_TAGS.EPHEMERAL);
    const parentNode = findNodeChild(target, 'parent');
    const linkedParentNode = findNodeChild(target, 'linked_parent');
    const membershipApprovalNode = findNodeChild(target, WA_NODE_TAGS.MEMBERSHIP_APPROVAL_MODE);
    const groupJoinNode = membershipApprovalNode
        ? findNodeChild(membershipApprovalNode, WA_NODE_TAGS.GROUP_JOIN)
        : undefined;
    const addressingModeRaw = attrs.addressing_mode;
    const addressingMode = addressingModeRaw === WA_ADDRESSING_MODES.LID
        ? WA_ADDRESSING_MODES.LID
        : addressingModeRaw === WA_ADDRESSING_MODES.PN
            ? WA_ADDRESSING_MODES.PN
            : undefined;
    const rawJid = attrs.id ?? attrs.jid ?? '';
    const jid = rawJid && !rawJid.includes('@') ? `${rawJid}@${WA_DEFAULTS.GROUP_SERVER}` : rawJid;
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
    const parentNode = findNodeChild(target, 'parent');
    const growthLockedNode = findNodeChild(target, 'growth_locked');
    const appealStatusNode = findNodeChild(target, 'appeal_status');
    const appealStatusType = appealStatusNode?.attrs.type;
    const appealUpdateTimeNode = findNodeChild(target, 'appeal_update_time');
    const evolutionVersionNode = findNodeChild(target, 'evolution_version');
    const memberAddModeNode = findNodeChild(target, 'member_add_mode');
    const memberLinkModeNode = findNodeChild(target, 'member_link_mode');
    const memberShareNode = findNodeChild(target, 'member_share_group_history_mode');
    return {
        ...commons,
        owner: attrs.creator ?? attrs.owner,
        ownerPhoneNumber: attrs.creator_pn,
        ownerUsername: attrs.creator_username,
        ownerCountryCode: attrs.creator_country_code,
        restrict: hasNodeChild(target, WA_NODE_TAGS.LOCKED),
        announce: hasNodeChild(target, WA_NODE_TAGS.ANNOUNCEMENT),
        isParentGroup: parentNode !== undefined,
        isClosedCommunity: parentNode?.attrs.default_membership_approval_mode === 'request_required',
        defaultSubgroup: hasNodeChild(target, 'default_sub_group'),
        generalSubgroup: hasNodeChild(target, 'general_chat'),
        hiddenSubgroup: hasNodeChild(target, 'hidden_group'),
        allowNonAdminSubGroupCreation: hasNodeChild(target, 'allow_non_admin_sub_group_creation'),
        noFrequentlyForwarded: hasNodeChild(target, 'no_frequently_forwarded'),
        support: hasNodeChild(target, 'support'),
        suspended: hasNodeChild(target, 'suspended'),
        incognito: hasNodeChild(target, 'incognito'),
        allowAdminReports: hasNodeChild(target, 'allow_admin_reports'),
        autoAddDisabled: hasNodeChild(target, 'auto_add_disabled'),
        groupHistory: hasNodeChild(target, 'group_history'),
        capi: hasNodeChild(target, 'capi'),
        groupSafetyCheck: hasNodeChild(target, 'group_safety_check'),
        participantLabelEnabled: hasNodeChild(target, 'participant_label_enabled'),
        limitSharingEnabled: hasNodeChild(target, 'limit_sharing_enabled'),
        evolutionVersion: evolutionVersionNode?.attrs.value
            ? Number(evolutionVersionNode.attrs.value)
            : undefined,
        memberAddMode: memberAddModeNode ? getNodeTextContent(memberAddModeNode) : undefined,
        memberLinkMode: memberLinkModeNode ? getNodeTextContent(memberLinkModeNode) : undefined,
        memberShareGroupHistoryMode: memberShareNode
            ? getNodeTextContent(memberShareNode)
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
    const wrapper = findNodeChild(iqResult, action);
    const target = wrapper ?? iqResult;
    const participantNodes = getNodeChildrenByTag(target, WA_NODE_TAGS.PARTICIPANT);
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
    const participantNodes = getNodeChildrenByTag(target, WA_NODE_TAGS.PARTICIPANT);
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
        hiddenGroup: hasNodeChild(target, 'hidden_group'),
        defaultSubgroup: hasNodeChild(target, 'default_sub_group'),
        generalChat: hasNodeChild(target, 'general_chat'),
        hasCapi: hasNodeChild(target, 'capi'),
        participants
    };
}
const SETTING_TAGS = {
    announcement: {
        on: WA_GROUP_NOTIFICATION_TAGS.ANNOUNCEMENT,
        off: WA_GROUP_NOTIFICATION_TAGS.NOT_ANNOUNCEMENT
    },
    restrict: { on: WA_GROUP_NOTIFICATION_TAGS.LOCKED, off: WA_GROUP_NOTIFICATION_TAGS.UNLOCKED },
    ephemeral: {
        on: WA_GROUP_NOTIFICATION_TAGS.EPHEMERAL,
        off: WA_GROUP_NOTIFICATION_TAGS.NOT_EPHEMERAL
    },
    membership_approval_mode: {
        on: WA_GROUP_NOTIFICATION_TAGS.MEMBERSHIP_APPROVAL_MODE,
        off: WA_GROUP_NOTIFICATION_TAGS.MEMBERSHIP_APPROVAL_MODE
    },
    allow_non_admin_sub_group_creation: {
        on: WA_GROUP_NOTIFICATION_TAGS.ALLOW_NON_ADMIN_SUB_GROUP_CREATION,
        off: WA_GROUP_NOTIFICATION_TAGS.NOT_ALLOW_NON_ADMIN_SUB_GROUP_CREATION
    },
    group_history: {
        on: WA_GROUP_NOTIFICATION_TAGS.GROUP_HISTORY,
        off: WA_GROUP_NOTIFICATION_TAGS.NO_GROUP_HISTORY
    },
    allow_admin_reports: {
        on: WA_GROUP_NOTIFICATION_TAGS.ALLOW_ADMIN_REPORTS,
        off: WA_GROUP_NOTIFICATION_TAGS.NOT_ALLOW_ADMIN_REPORTS
    },
    no_frequently_forwarded: {
        on: WA_GROUP_NOTIFICATION_TAGS.NO_FREQUENTLY_FORWARDED,
        off: WA_GROUP_NOTIFICATION_TAGS.FREQUENTLY_FORWARDED_OK
    }
};
function parseSubGroupNode(node, defaultSubgroup) {
    const n = tryAsRecord(node);
    const subject = tryAsRecord(n?.subject);
    const properties = tryAsRecord(n?.properties);
    const approvals = tryAsRecord(n?.membership_approval_requests);
    return {
        jid: tryAsString(n?.id) ?? '',
        subject: tryAsString(subject?.value) ?? undefined,
        subjectTime: tryAsNumber(subject?.creation_time) ?? undefined,
        defaultSubgroup,
        generalSubgroup: properties?.general_chat === true,
        hiddenSubgroup: properties?.hidden_group === true,
        membershipApprovalEnabled: properties?.membership_approval_mode_enabled === true,
        pendingMembershipRequests: tryAsNumber(approvals?.total_count) ?? 0
    };
}
function parseGroupIsInternalMexResponse(data) {
    return data?.xwa2_group_query_by_id?.properties?.internal === true;
}
function parseGroupSuspensionAppealMexResponse(data) {
    const root = data?.wa_create_group_suspension_appeal;
    const responseCode = tryAsString(root?.response_code);
    return {
        success: responseCode === 'SUCCESS' || responseCode === 'APPEAL_ALREADY_EXISTS',
        responseCode,
        errorMessage: tryAsString(root?.error_message),
        appealCreationTime: tryAsNumber(root?.appeal_creation_time)
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
            creationTime: tryAsNumber(node.creation_time),
            participantCount: node.total_participants_count ?? null,
            isExistingGroup: node.is_existing_group === true,
            hiddenGroup: node.hidden_group === true
        });
    }
    return results;
}
/** Builds a {@link WaGroupCoordinator} backed by the given IQ query function and optional MEX socket. */
export function createGroupCoordinator(options) {
    const { queryWithContext, mexSocket } = options;
    const changeParticipants = async (action, groupJid, participants) => {
        const context = `group.${action}Participants`;
        const node = buildGroupParticipantChangeIq({
            groupJid,
            action,
            participants
        });
        const result = await queryWithContext(context, node);
        assertIqResult(result, context);
        return parseParticipantActionResults(result, action);
    };
    const queryInvite = async (type, groupJid, context) => {
        const node = buildIqNode(type, groupJid, WA_XMLNS.GROUPS, [
            { tag: WA_NODE_TAGS.INVITE, attrs: {} }
        ]);
        const result = await queryWithContext(context, node);
        assertIqResult(result, context);
        const code = findNodeChild(result, WA_NODE_TAGS.INVITE)?.attrs.code;
        if (!code) {
            throw new Error(`${context}: missing invite code in response`);
        }
        return { result, code };
    };
    return {
        queryGroupMetadata: async (groupJid) => {
            const node = buildIqNode(WA_IQ_TYPES.GET, groupJid, WA_XMLNS.GROUPS, [
                {
                    tag: WA_NODE_TAGS.QUERY,
                    attrs: {}
                }
            ]);
            const result = await queryWithContext('group.metadata', node);
            assertIqResult(result, 'group.metadata');
            return parseGroupMetadata(result);
        },
        queryAllGroups: async () => {
            const result = await queryWithContext('group.list', buildListParticipatingGroupsIq());
            assertIqResult(result, 'group.list');
            const groupNodes = getNodeChildrenByTagFromChildren(result, WA_NODE_TAGS.GROUP);
            const metadata = new Array(groupNodes.length);
            for (let index = 0; index < groupNodes.length; index += 1) {
                metadata[index] = parseGroupMetadata(groupNodes[index]);
            }
            return metadata;
        },
        queryGroupInviteInfo: async (code) => {
            const node = buildIqNode(WA_IQ_TYPES.GET, WA_DEFAULTS.GROUP_SERVER, WA_XMLNS.GROUPS, [
                { tag: WA_NODE_TAGS.INVITE, attrs: { code } }
            ]);
            const result = await queryWithContext('group.invite.info', node);
            assertIqResult(result, 'group.invite.info');
            return parseGroupInviteInfo(result);
        },
        createGroup: async (subject, participants, opts) => {
            const node = buildCreateGroupIq({
                subject,
                participants,
                description: opts?.description,
                linkedParentJid: opts?.linkedParentJid
            });
            const result = await queryWithContext('group.create', node);
            assertIqResult(result, 'group.create');
            return parseGroupMetadata(result);
        },
        setSubject: async (groupJid, subject) => {
            const node = buildIqNode(WA_IQ_TYPES.SET, groupJid, WA_XMLNS.GROUPS, [
                { tag: WA_NODE_TAGS.SUBJECT, attrs: {}, content: subject }
            ]);
            const result = await queryWithContext('group.setSubject', node);
            assertIqResult(result, 'group.setSubject');
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
                content = [{ tag: WA_NODE_TAGS.BODY, attrs: {}, content: description }];
            }
            const node = buildIqNode(WA_IQ_TYPES.SET, groupJid, WA_XMLNS.GROUPS, [
                { tag: WA_NODE_TAGS.DESCRIPTION, attrs, content }
            ]);
            const result = await queryWithContext('group.setDescription', node);
            assertIqResult(result, 'group.setDescription');
        },
        setMemberAddMode: async (groupJid, mode) => {
            const node = buildSetGroupMemberAddModeIq({ groupJid, mode });
            const result = await queryWithContext('group.setMemberAddMode', node, undefined, {
                groupJid,
                mode
            });
            assertIqResult(result, 'group.setMemberAddMode');
        },
        setMemberLinkMode: async (groupJid, mode) => {
            const node = buildSetGroupMemberLinkModeIq({ groupJid, mode });
            const result = await queryWithContext('group.setMemberLinkMode', node, undefined, {
                groupJid,
                mode
            });
            assertIqResult(result, 'group.setMemberLinkMode');
        },
        setMemberShareGroupHistoryMode: async (groupJid, mode) => {
            const node = buildSetGroupMemberShareGroupHistoryModeIq({ groupJid, mode });
            const result = await queryWithContext('group.setMemberShareGroupHistoryMode', node, undefined, { groupJid, mode });
            assertIqResult(result, 'group.setMemberShareGroupHistoryMode');
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
            const node = buildSetGroupEphemeralIq({
                groupJid,
                expirationSeconds,
                ...(trigger === undefined ? {} : { trigger })
            });
            const result = await queryWithContext('group.setEphemeralDuration', node, undefined, {
                groupJid,
                expirationSeconds,
                ...(trigger === undefined ? {} : { trigger })
            });
            assertIqResult(result, 'group.setEphemeralDuration');
        },
        setSetting: async (groupJid, setting, enabled) => {
            const tags = SETTING_TAGS[setting];
            const tag = enabled ? tags.on : tags.off;
            let content;
            if (setting === 'membership_approval_mode') {
                content = [
                    {
                        tag: WA_NODE_TAGS.GROUP_JOIN,
                        attrs: { state: enabled ? 'on' : 'off' }
                    }
                ];
            }
            const node = buildIqNode(WA_IQ_TYPES.SET, groupJid, WA_XMLNS.GROUPS, [
                { tag, attrs: {}, ...(content ? { content } : {}) }
            ]);
            const result = await queryWithContext('group.setSetting', node);
            assertIqResult(result, 'group.setSetting');
        },
        addParticipants: async (groupJid, participants) => changeParticipants('add', groupJid, participants),
        removeParticipants: async (groupJid, participants) => changeParticipants('remove', groupJid, participants),
        promoteParticipants: async (groupJid, participants) => changeParticipants('promote', groupJid, participants),
        demoteParticipants: async (groupJid, participants) => changeParticipants('demote', groupJid, participants),
        leaveGroup: async (groupJids) => {
            const node = buildLeaveGroupIq(groupJids);
            const result = await queryWithContext('group.leave', node);
            assertIqResult(result, 'group.leave');
        },
        queryInviteCode: async (groupJid) => {
            const { code } = await queryInvite(WA_IQ_TYPES.GET, groupJid, 'group.queryInviteCode');
            return code;
        },
        revokeInvite: async (groupJid) => {
            const { result, code } = await queryInvite(WA_IQ_TYPES.SET, groupJid, 'group.revokeInvite');
            const participantNodes = getNodeChildrenByTag(result, WA_NODE_TAGS.PARTICIPANT);
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
            const node = buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.GROUP_SERVER, WA_XMLNS.GROUPS, [
                { tag: WA_NODE_TAGS.INVITE, attrs: { code } }
            ]);
            const result = await queryWithContext('group.joinViaInvite', node);
            assertIqResult(result, 'group.joinViaInvite');
            return parseGroupMetadata(result);
        },
        createCommunity: async (subject, opts) => {
            const node = buildCreateGroupIq({
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
            assertIqResult(result, 'community.create');
            return parseGroupMetadata(result);
        },
        deactivateCommunity: async (communityJid) => {
            const node = buildDeactivateCommunityIq(communityJid);
            const result = await queryWithContext('community.deactivate', node);
            assertIqResult(result, 'community.deactivate');
        },
        linkSubGroups: async (communityJid, subGroupJids) => {
            const node = buildLinkSubGroupsIq({
                communityJid,
                subGroups: subGroupJids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('community.linkSubGroups', node);
            assertIqResult(result, 'community.linkSubGroups');
            const linksNode = findNodeChild(result, 'links');
            const linkNode = linksNode ? findNodeChild(linksNode, 'link') : undefined;
            const groupNodes = linkNode ? getNodeChildrenByTag(linkNode, WA_NODE_TAGS.GROUP) : [];
            const linkedJids = [];
            const failed = [];
            for (const groupNode of groupNodes) {
                const jid = groupNode.attrs.jid;
                if (!jid)
                    continue;
                const errorAttr = findNodeChild(groupNode, WA_NODE_TAGS.ERROR)?.attrs.code;
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
            const node = buildUnlinkSubGroupsIq({
                communityJid,
                subGroupJids,
                removeOrphanedMembers: options?.removeOrphanedMembers
            });
            const result = await queryWithContext('community.unlinkSubGroups', node);
            assertIqResult(result, 'community.unlinkSubGroups');
            const unlinkNode = findNodeChild(result, 'unlink');
            const groupNodes = unlinkNode
                ? getNodeChildrenByTag(unlinkNode, WA_NODE_TAGS.GROUP)
                : [];
            const unlinkedJids = [];
            const failed = [];
            for (const groupNode of groupNodes) {
                const jid = groupNode.attrs.jid;
                if (!jid)
                    continue;
                const errorAttr = findNodeChild(groupNode, WA_NODE_TAGS.ERROR)?.attrs.code;
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
            const node = buildLinkedGroupsParticipantsIq(communityJid);
            const result = await queryWithContext('community.linkedGroupsParticipants', node);
            assertIqResult(result, 'community.linkedGroupsParticipants');
            const container = findNodeChild(result, 'linked_groups_participants');
            return container ? parseGroupParticipants(container) : [];
        },
        fetchSubGroups: async (communityJid) => {
            if (!mexSocket) {
                throw new Error('community.fetchSubGroups requires a mex transport');
            }
            const data = await runMexQuery(mexSocket, 'FetchAllSubgroups', {
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
            const node = buildGetMembershipApprovalRequestsIq(groupJid);
            const result = await queryWithContext('group.membershipRequests', node);
            assertIqResult(result, 'group.membershipRequests');
            return parseMembershipApprovalRequests(result);
        },
        approveMembershipRequests: async (groupJid, participantJids) => {
            const node = buildMembershipRequestsActionIq({ groupJid, approve: participantJids });
            const result = await queryWithContext('group.membershipRequests.approve', node);
            assertIqResult(result, 'group.membershipRequests.approve');
        },
        rejectMembershipRequests: async (groupJid, participantJids) => {
            const node = buildMembershipRequestsActionIq({ groupJid, reject: participantJids });
            const result = await queryWithContext('group.membershipRequests.reject', node);
            assertIqResult(result, 'group.membershipRequests.reject');
        },
        cancelMembershipRequests: async (groupJid, participantJids) => {
            const node = buildCancelMembershipRequestsIq({ groupJid, participantJids });
            const result = await queryWithContext('group.membershipRequests.cancel', node);
            assertIqResult(result, 'group.membershipRequests.cancel');
        },
        joinLinkedGroup: async (communityJid, subGroupJid, options) => {
            const node = buildJoinLinkedGroupIq({
                groupJid: communityJid,
                subGroupJid,
                type: options?.type
            });
            const result = await queryWithContext('community.joinLinkedGroup', node);
            assertIqResult(result, 'community.joinLinkedGroup');
        },
        isInternalGroup: async (groupJid) => {
            if (!mexSocket) {
                throw new Error('group.isInternalGroup requires a mex transport');
            }
            const data = await runMexQuery(mexSocket, 'FetchGroupIsInternal', { id: groupJid });
            return parseGroupIsInternalMexResponse(data);
        },
        transferCommunityOwnership: async (communityJid, newOwnerJid) => {
            if (!mexSocket) {
                throw new Error('community.transferOwnership requires a mex transport');
            }
            await runMexQuery(mexSocket, 'TransferCommunityOwnership', {
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
            const data = await runMexQuery(mexSocket, 'FetchSubgroupSuggestions', {
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
            const data = await runMexQuery(mexSocket, 'GroupSuspensionAppeal', {
                input: {
                    group_jid: parseJidFull(groupJid).address.user,
                    appeal_reason: options?.reason ?? undefined,
                    debug_info: options?.debugInfo ?? '{}'
                }
            });
            return parseGroupSuspensionAppealMexResponse(data);
        }
    };
}
