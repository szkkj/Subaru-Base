"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseParticipants = parseParticipants;
exports.parseGroupNotificationEvents = parseGroupNotificationEvents;
const incoming_1 = require("../events/incoming");
const constants_1 = require("../../protocol/constants");
const nodes_1 = require("../../protocol/nodes");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
function parseParticipants(node) {
    const participants = [];
    for (const participantNode of (0, helpers_1.getNodeChildrenByTag)(node, nodes_1.WA_NODE_TAGS.PARTICIPANT)) {
        participants.push({
            jid: participantNode.attrs.jid,
            role: participantNode.attrs.type,
            lidJid: participantNode.attrs.lid,
            phoneJid: participantNode.attrs.phone_number,
            displayName: participantNode.attrs.display_name,
            username: participantNode.attrs.username,
            expirationSeconds: (0, primitives_1.parseOptionalInt)(participantNode.attrs.expiration)
        });
    }
    return participants;
}
function parseLinkedGroups(node) {
    const groups = [];
    for (const groupNode of (0, helpers_1.getNodeChildrenByTag)(node, nodes_1.WA_NODE_TAGS.GROUP)) {
        groups.push({
            jid: groupNode.attrs.jid,
            subject: groupNode.attrs.subject,
            subjectTimestampSeconds: (0, primitives_1.parseOptionalInt)(groupNode.attrs.s_t),
            hiddenSubgroup: (0, helpers_1.findNodeChild)(groupNode, 'hidden_group') !== undefined
        });
    }
    return groups;
}
function parseMembershipRequests(node) {
    const requests = [];
    for (const requestNode of (0, helpers_1.getNodeChildrenByTag)(node, 'requested_user')) {
        requests.push({
            jid: requestNode.attrs.jid,
            username: requestNode.attrs.username,
            phoneJid: requestNode.attrs.phone_number
        });
    }
    return requests;
}
function parseSubgroupSuggestion(node) {
    const subjectNode = (0, helpers_1.findNodeChild)(node, nodes_1.WA_NODE_TAGS.SUBJECT);
    const descriptionNode = (0, helpers_1.findNodeChild)(node, nodes_1.WA_NODE_TAGS.DESCRIPTION);
    const descriptionBodyNode = descriptionNode
        ? (0, helpers_1.findNodeChild)(descriptionNode, nodes_1.WA_NODE_TAGS.BODY)
        : undefined;
    const isExistingGroupNode = (0, helpers_1.findNodeChild)(node, 'is_existing_group');
    const participantCountNode = (0, helpers_1.findNodeChild)(node, 'participant_count');
    return {
        groupJid: node.attrs.jid,
        ownerJid: node.attrs.creator,
        subject: (0, helpers_1.getNodeTextContent)(subjectNode),
        description: (0, helpers_1.getNodeTextContent)(descriptionBodyNode),
        timestampSeconds: (0, primitives_1.parseOptionalInt)(node.attrs.creation),
        isExistingGroup: (0, helpers_1.getNodeTextContent)(isExistingGroupNode) === undefined
            ? undefined
            : (0, helpers_1.getNodeTextContent)(isExistingGroupNode) === 'true',
        participantCount: participantCountNode
            ? (0, primitives_1.parseOptionalInt)((0, helpers_1.getNodeTextContent)(participantCountNode))
            : undefined,
        reason: node.attrs.reason
    };
}
function parseSubgroupSuggestions(node) {
    const suggestions = [];
    for (const suggestionNode of (0, helpers_1.getNodeChildrenByTag)(node, 'sub_group_suggestion')) {
        const suggestion = parseSubgroupSuggestion(suggestionNode);
        if (!suggestion) {
            continue;
        }
        suggestions.push(suggestion);
    }
    return suggestions;
}
function createBaseGroupEvent(notificationNode, actionNode) {
    return {
        rawNode: notificationNode,
        rawActionNode: actionNode,
        stanzaId: notificationNode.attrs.id,
        chatJid: notificationNode.attrs.from,
        stanzaType: notificationNode.attrs.type,
        offline: notificationNode.attrs.offline !== undefined,
        groupJid: notificationNode.attrs.from,
        authorJid: notificationNode.attrs.participant,
        timestampSeconds: (0, primitives_1.parseOptionalInt)(notificationNode.attrs.t)
    };
}
function parseCreateGroupAction(notificationNode, actionNode) {
    const groupNode = (0, helpers_1.findNodeChild)(actionNode, nodes_1.WA_NODE_TAGS.GROUP);
    if (!groupNode) {
        throw new Error('create action missing group child');
    }
    const descriptionNode = (0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.DESCRIPTION);
    const descriptionBodyNode = descriptionNode
        ? (0, helpers_1.findNodeChild)(descriptionNode, nodes_1.WA_NODE_TAGS.BODY)
        : undefined;
    const membershipApprovalModeNode = (0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.MEMBERSHIP_APPROVAL_MODE);
    const groupJoinNode = membershipApprovalModeNode
        ? (0, helpers_1.findNodeChild)(membershipApprovalModeNode, nodes_1.WA_NODE_TAGS.GROUP_JOIN)
        : undefined;
    return {
        ...createBaseGroupEvent(notificationNode, actionNode),
        action: 'create',
        participants: parseParticipants(groupNode),
        subject: groupNode.attrs.subject,
        subjectOwnerJid: groupNode.attrs.s_o,
        description: (0, helpers_1.getNodeTextContent)(descriptionBodyNode),
        descriptionId: descriptionNode?.attrs.id,
        reason: actionNode.attrs.reason,
        contextGroupJid: actionNode.attrs.context_group_jid,
        details: {
            creatorJid: groupNode.attrs.creator,
            creatorPhoneJid: groupNode.attrs.creator_pn,
            creatorUsername: groupNode.attrs.creator_username,
            creatorCountryCode: groupNode.attrs.creator_country_code,
            creationSeconds: (0, primitives_1.parseOptionalInt)(groupNode.attrs.creation),
            announceEnabled: (0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.ANNOUNCEMENT) !== undefined,
            restrictEnabled: (0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.LOCKED) !== undefined,
            noFrequentlyForwardedEnabled: (0, helpers_1.findNodeChild)(groupNode, constants_1.WA_GROUP_NOTIFICATION_TAGS.NO_FREQUENTLY_FORWARDED) !==
                undefined,
            supportEnabled: (0, helpers_1.findNodeChild)(groupNode, 'support') !== undefined,
            isParentGroup: (0, helpers_1.findNodeChild)(groupNode, 'parent') !== undefined,
            defaultSubgroup: (0, helpers_1.findNodeChild)(groupNode, 'default_sub_group') !== undefined,
            generalSubgroup: (0, helpers_1.findNodeChild)(groupNode, 'general_chat') !== undefined,
            hiddenSubgroup: (0, helpers_1.findNodeChild)(groupNode, 'hidden_group') !== undefined,
            groupSafetyCheck: (0, helpers_1.findNodeChild)(groupNode, constants_1.WA_GROUP_NOTIFICATION_TAGS.GROUP_SAFETY_CHECK) !==
                undefined,
            hasCapi: (0, helpers_1.findNodeChild)(groupNode, 'capi') !== undefined,
            limitSharingEnabled: (0, helpers_1.findNodeChild)(groupNode, constants_1.WA_GROUP_NOTIFICATION_TAGS.LIMIT_SHARING_ENABLED) !==
                undefined,
            size: (0, primitives_1.parseOptionalInt)(groupNode.attrs.size),
            ephemeralDuration: (0, primitives_1.parseOptionalInt)((0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.EPHEMERAL)?.attrs.expiration),
            disappearingTrigger: (0, helpers_1.findNodeChild)(groupNode, nodes_1.WA_NODE_TAGS.EPHEMERAL)?.attrs.trigger,
            membershipApprovalEnabled: groupJoinNode?.attrs.state === 'on',
            allowNonAdminSubGroupCreation: (0, helpers_1.findNodeChild)(groupNode, constants_1.WA_GROUP_NOTIFICATION_TAGS.ALLOW_NON_ADMIN_SUB_GROUP_CREATION) !== undefined,
            linkedParentGroupJid: (0, helpers_1.findNodeChild)(groupNode, 'linked_parent')?.attrs.jid ??
                (0, helpers_1.findNodeChild)(groupNode, 'parent')?.attrs.jid
        }
    };
}
function parseGroupActionNode(notificationNode, actionNode) {
    const baseEvent = createBaseGroupEvent(notificationNode, actionNode);
    switch (actionNode.tag) {
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.CREATE:
            return parseCreateGroupAction(notificationNode, actionNode);
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.ADD:
            return {
                ...baseEvent,
                action: 'add',
                participants: parseParticipants(actionNode),
                reason: actionNode.attrs.reason
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.DELETE:
            return {
                ...baseEvent,
                action: 'delete',
                reason: actionNode.attrs.reason
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.REMOVE:
            return {
                ...baseEvent,
                action: 'remove',
                participants: parseParticipants(actionNode),
                reason: actionNode.attrs.reason
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.PROMOTE:
            return {
                ...baseEvent,
                action: 'promote',
                participants: parseParticipants(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.DEMOTE:
            return {
                ...baseEvent,
                action: 'demote',
                participants: parseParticipants(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.LINKED_GROUP_PROMOTE:
            return {
                ...baseEvent,
                action: 'linked_group_promote',
                participants: parseParticipants(actionNode),
                contextGroupJid: actionNode.attrs.jid
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.LINKED_GROUP_DEMOTE:
            return {
                ...baseEvent,
                action: 'linked_group_demote',
                participants: parseParticipants(actionNode),
                contextGroupJid: actionNode.attrs.jid
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.MODIFY:
            return {
                ...baseEvent,
                action: 'modify',
                participants: parseParticipants(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.SUBJECT:
            return {
                ...baseEvent,
                action: 'subject',
                subject: actionNode.attrs.subject,
                subjectOwnerJid: actionNode.attrs.s_o,
                details: {
                    subjectOwnerPhoneJid: actionNode.attrs.s_o_pn,
                    subjectOwnerUsername: actionNode.attrs.s_o_username,
                    subjectTimestampSeconds: (0, primitives_1.parseOptionalInt)(actionNode.attrs.s_t)
                }
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.DESCRIPTION: {
            const hasDeleteChild = (0, helpers_1.findNodeChild)(actionNode, constants_1.WA_GROUP_NOTIFICATION_TAGS.DELETE) !== undefined;
            const bodyNode = (0, helpers_1.findNodeChild)(actionNode, nodes_1.WA_NODE_TAGS.BODY);
            return {
                ...baseEvent,
                action: 'description',
                description: hasDeleteChild ? undefined : (0, helpers_1.getNodeTextContent)(bodyNode),
                descriptionId: actionNode.attrs.id,
                enabled: !hasDeleteChild
            };
        }
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.LOCKED:
            return {
                ...baseEvent,
                action: 'restrict',
                enabled: true,
                mode: actionNode.attrs.threshold
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.UNLOCKED:
            return { ...baseEvent, action: 'restrict', enabled: false };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.ANNOUNCEMENT:
            return { ...baseEvent, action: 'announce', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.NOT_ANNOUNCEMENT:
            return { ...baseEvent, action: 'announce', enabled: false };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.NO_FREQUENTLY_FORWARDED:
            return { ...baseEvent, action: 'no_frequently_forwarded', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.FREQUENTLY_FORWARDED_OK:
            return { ...baseEvent, action: 'no_frequently_forwarded', enabled: false };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.INVITE:
            return { ...baseEvent, action: 'invite', code: actionNode.attrs.code };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.EPHEMERAL:
            return {
                ...baseEvent,
                action: 'ephemeral',
                expirationSeconds: (0, primitives_1.parseOptionalInt)(actionNode.attrs.expiration),
                mode: actionNode.attrs.trigger
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.NOT_EPHEMERAL:
            return { ...baseEvent, action: 'ephemeral', expirationSeconds: 0 };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.REVOKE:
            return {
                ...baseEvent,
                action: 'revoke_invite',
                participants: parseParticipants(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.SUSPENDED:
            return { ...baseEvent, action: 'suspend', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.UNSUSPENDED:
            return { ...baseEvent, action: 'suspend', enabled: false };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.GROWTH_LOCKED:
            return {
                ...baseEvent,
                action: 'growth_locked',
                expirationSeconds: (0, primitives_1.parseOptionalInt)(actionNode.attrs.expiration),
                mode: actionNode.attrs.type
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.GROWTH_UNLOCKED:
            return { ...baseEvent, action: 'growth_unlocked' };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.LINK:
            return {
                ...baseEvent,
                action: 'link',
                mode: actionNode.attrs.link_type,
                linkedGroups: parseLinkedGroups(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.UNLINK:
            return {
                ...baseEvent,
                action: 'unlink',
                mode: actionNode.attrs.unlink_type,
                reason: actionNode.attrs.unlink_reason,
                linkedGroups: parseLinkedGroups(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.MEMBERSHIP_APPROVAL_MODE: {
            const groupJoinNode = (0, helpers_1.findNodeChild)(actionNode, nodes_1.WA_NODE_TAGS.GROUP_JOIN);
            return {
                ...baseEvent,
                action: 'membership_approval_mode',
                enabled: groupJoinNode?.attrs.state === 'on',
                details: {
                    triggered: actionNode.attrs.triggered
                }
            };
        }
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.MEMBERSHIP_APPROVAL_REQUEST:
            return {
                ...baseEvent,
                action: 'membership_approval_request',
                requestMethod: actionNode.attrs.request_method,
                contextGroupJid: actionNode.attrs.parent_group_jid
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.CREATED_MEMBERSHIP_REQUESTS:
            return {
                ...baseEvent,
                action: 'created_membership_requests',
                requestMethod: actionNode.attrs.request_method,
                contextGroupJid: actionNode.attrs.parent_group_jid,
                membershipRequests: parseMembershipRequests(actionNode),
                details: {
                    suppressSystemMessage: actionNode.attrs.suppress_sys_msg === 'true'
                }
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.REVOKED_MEMBERSHIP_REQUESTS:
            return {
                ...baseEvent,
                action: 'revoked_membership_requests',
                participants: parseParticipants(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.ALLOW_NON_ADMIN_SUB_GROUP_CREATION:
            return { ...baseEvent, action: 'allow_non_admin_sub_group_creation', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.NOT_ALLOW_NON_ADMIN_SUB_GROUP_CREATION:
            return { ...baseEvent, action: 'allow_non_admin_sub_group_creation', enabled: false };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.ALLOW_ADMIN_REPORTS:
            return {
                ...baseEvent,
                action: 'allow_admin_reports',
                enabled: true,
                details: { triggered: actionNode.attrs.triggered }
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.NOT_ALLOW_ADMIN_REPORTS:
            return {
                ...baseEvent,
                action: 'allow_admin_reports',
                enabled: false,
                details: { triggered: actionNode.attrs.triggered }
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.REPORTS:
            return { ...baseEvent, action: 'admin_reports' };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.CREATED_SUB_GROUP_SUGGESTION:
            return {
                ...baseEvent,
                action: 'created_sub_group_suggestion',
                subgroupSuggestions: parseSubgroupSuggestions(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.REVOKED_SUB_GROUP_SUGGESTIONS:
            return {
                ...baseEvent,
                action: 'revoked_sub_group_suggestions',
                subgroupSuggestions: parseSubgroupSuggestions(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.CHANGE_NUMBER:
            return {
                ...baseEvent,
                action: 'change_number',
                subgroupSuggestions: parseSubgroupSuggestions(actionNode),
                details: {
                    oldOwnerJid: notificationNode.attrs.participant,
                    newOwnerJid: actionNode.attrs.jid
                }
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.MEMBER_ADD_MODE:
            return {
                ...baseEvent,
                action: 'member_add_mode',
                mode: (0, helpers_1.getNodeTextContent)(actionNode)
            };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.AUTO_ADD_DISABLED:
            return { ...baseEvent, action: 'auto_add_disabled', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.IS_CAPI_HOSTED_GROUP:
            return { ...baseEvent, action: 'is_capi_hosted_group', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.GROUP_SAFETY_CHECK:
            return { ...baseEvent, action: 'group_safety_check', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.LIMIT_SHARING_ENABLED:
            return { ...baseEvent, action: 'limit_sharing_enabled', enabled: true };
        case constants_1.WA_GROUP_NOTIFICATION_TAGS.MISSING_PARTICIPANT_IDENTIFICATION:
            return { ...baseEvent, action: 'missing_participant_identification' };
        default:
            return null;
    }
}
function parseGroupNotificationEvents(notificationNode) {
    if (notificationNode.tag !== nodes_1.WA_NODE_TAGS.NOTIFICATION ||
        notificationNode.attrs.type !== constants_1.WA_NOTIFICATION_TYPES.GROUP) {
        return {
            events: [],
            unhandled: []
        };
    }
    const events = [];
    const unhandled = [];
    for (const actionNode of (0, helpers_1.getNodeChildren)(notificationNode)) {
        try {
            const parsedEvent = parseGroupActionNode(notificationNode, actionNode);
            if (!parsedEvent) {
                unhandled.push((0, incoming_1.createUnhandledIncomingNodeEvent)(notificationNode, `notification.${constants_1.WA_NOTIFICATION_TYPES.GROUP}.${actionNode.tag}.not_supported`));
                continue;
            }
            events.push(parsedEvent);
        }
        catch {
            unhandled.push((0, incoming_1.createUnhandledIncomingNodeEvent)(notificationNode, `notification.${constants_1.WA_NOTIFICATION_TYPES.GROUP}.${actionNode.tag}.parse_failed`));
        }
    }
    return {
        events,
        unhandled
    };
}
