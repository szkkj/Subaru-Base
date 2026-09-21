"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCreateGroupIq = buildCreateGroupIq;
exports.buildGroupParticipantChangeIq = buildGroupParticipantChangeIq;
exports.buildLeaveGroupIq = buildLeaveGroupIq;
exports.buildGetMembershipApprovalRequestsIq = buildGetMembershipApprovalRequestsIq;
exports.buildMembershipRequestsActionIq = buildMembershipRequestsActionIq;
exports.buildCancelMembershipRequestsIq = buildCancelMembershipRequestsIq;
exports.buildSetGroupMemberAddModeIq = buildSetGroupMemberAddModeIq;
exports.buildSetGroupMemberLinkModeIq = buildSetGroupMemberLinkModeIq;
exports.buildSetGroupMemberShareGroupHistoryModeIq = buildSetGroupMemberShareGroupHistoryModeIq;
exports.buildSetGroupEphemeralIq = buildSetGroupEphemeralIq;
exports.buildJoinLinkedGroupIq = buildJoinLinkedGroupIq;
const defaults_1 = require("../../../protocol/defaults");
const group_1 = require("../../../protocol/group");
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
function buildCreateGroupIq(input) {
    const children = input.participants.map((jid) => ({
        tag: 'participant',
        attrs: { jid }
    }));
    if (input.description) {
        children.push({
            tag: 'description',
            attrs: { id: `${Date.now()}` },
            content: [{ tag: 'body', attrs: {}, content: input.description }]
        });
    }
    if (input.parent !== undefined) {
        const parentAttrs = {};
        if (input.parent !== true &&
            input.parent.defaultMembershipApprovalMode === 'request_required') {
            parentAttrs.default_membership_approval_mode = 'request_required';
        }
        children.push({ tag: 'parent', attrs: parentAttrs });
    }
    if (input.linkedParentJid) {
        children.push({ tag: 'linked_parent', attrs: { jid: input.linkedParentJid } });
    }
    if (input.allowNonAdminSubGroupCreation) {
        children.push({ tag: 'allow_non_admin_sub_group_creation', attrs: {} });
    }
    if (input.createGeneralChat) {
        children.push({ tag: 'create_general_chat', attrs: {} });
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.GROUP_SERVER, nodes_1.WA_XMLNS.GROUPS, [
        {
            tag: 'create',
            attrs: { subject: input.subject },
            content: children
        }
    ]);
}
function buildGroupParticipantChangeIq(input) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.groupJid, nodes_1.WA_XMLNS.GROUPS, [
        {
            tag: input.action,
            attrs: {},
            content: input.participants.map((jid) => ({
                tag: 'participant',
                attrs: { jid }
            }))
        }
    ]);
}
function buildLeaveGroupIq(groupJids) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.GROUP_SERVER, nodes_1.WA_XMLNS.GROUPS, [
        {
            tag: 'leave',
            attrs: {},
            content: groupJids.map((jid) => ({
                tag: 'group',
                attrs: { id: jid }
            }))
        }
    ]);
}
function buildGetMembershipApprovalRequestsIq(groupJid) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, groupJid, nodes_1.WA_XMLNS.GROUPS, [
        { tag: 'membership_approval_requests', attrs: {} }
    ]);
}
function buildMembershipRequestsActionIq(input) {
    const approve = input.approve ?? [];
    const reject = input.reject ?? [];
    if (approve.length === 0 && reject.length === 0) {
        throw new Error('membership_requests_action requires at least one approve or reject jid');
    }
    const children = [];
    if (approve.length > 0) {
        children.push({
            tag: group_1.WA_GROUP_MEMBERSHIP_ACTION_TAGS.APPROVE,
            attrs: {},
            content: approve.map((jid) => ({ tag: 'participant', attrs: { jid } }))
        });
    }
    if (reject.length > 0) {
        children.push({
            tag: group_1.WA_GROUP_MEMBERSHIP_ACTION_TAGS.REJECT,
            attrs: {},
            content: reject.map((jid) => ({ tag: 'participant', attrs: { jid } }))
        });
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.groupJid, nodes_1.WA_XMLNS.GROUPS, [
        { tag: group_1.WA_GROUP_MEMBERSHIP_ACTION_TAGS.REQUESTS_ACTION, attrs: {}, content: children }
    ]);
}
function buildCancelMembershipRequestsIq(input) {
    if (input.participantJids.length === 0) {
        throw new Error('cancel_membership_requests requires at least one participant');
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.groupJid, nodes_1.WA_XMLNS.GROUPS, [
        {
            tag: 'cancel_membership_requests',
            attrs: {},
            content: input.participantJids.map((jid) => ({
                tag: 'participant',
                attrs: { jid }
            }))
        }
    ]);
}
function buildSetGroupMemberModeIq(input) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.groupJid, nodes_1.WA_XMLNS.GROUPS, [
        {
            tag: input.tag,
            attrs: {},
            content: input.mode
        }
    ]);
}
function buildSetGroupMemberAddModeIq(input) {
    return buildSetGroupMemberModeIq({
        groupJid: input.groupJid,
        tag: 'member_add_mode',
        mode: input.mode
    });
}
function buildSetGroupMemberLinkModeIq(input) {
    return buildSetGroupMemberModeIq({
        groupJid: input.groupJid,
        tag: 'member_link_mode',
        mode: input.mode
    });
}
function buildSetGroupMemberShareGroupHistoryModeIq(input) {
    return buildSetGroupMemberModeIq({
        groupJid: input.groupJid,
        tag: 'member_share_group_history_mode',
        mode: input.mode
    });
}
function buildSetGroupEphemeralIq(input) {
    const attrs = { expiration: String(input.expirationSeconds) };
    if (input.trigger !== undefined) {
        attrs.trigger = String(input.trigger);
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.groupJid, nodes_1.WA_XMLNS.GROUPS, [
        { tag: 'ephemeral', attrs }
    ]);
}
function buildJoinLinkedGroupIq(input) {
    const attrs = { jid: input.subGroupJid };
    if (input.type) {
        attrs.type = input.type;
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.groupJid, nodes_1.WA_XMLNS.GROUPS, [
        { tag: 'join_linked_group', attrs }
    ]);
}
