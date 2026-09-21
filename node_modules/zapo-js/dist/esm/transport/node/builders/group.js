import { WA_DEFAULTS } from '../../../protocol/defaults.js';
import { WA_GROUP_MEMBERSHIP_ACTION_TAGS } from '../../../protocol/group.js';
import { WA_IQ_TYPES, WA_XMLNS } from '../../../protocol/nodes.js';
import { buildIqNode } from '../../node/query.js';
export function buildCreateGroupIq(input) {
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
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.GROUP_SERVER, WA_XMLNS.GROUPS, [
        {
            tag: 'create',
            attrs: { subject: input.subject },
            content: children
        }
    ]);
}
export function buildGroupParticipantChangeIq(input) {
    return buildIqNode(WA_IQ_TYPES.SET, input.groupJid, WA_XMLNS.GROUPS, [
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
export function buildLeaveGroupIq(groupJids) {
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.GROUP_SERVER, WA_XMLNS.GROUPS, [
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
export function buildGetMembershipApprovalRequestsIq(groupJid) {
    return buildIqNode(WA_IQ_TYPES.GET, groupJid, WA_XMLNS.GROUPS, [
        { tag: 'membership_approval_requests', attrs: {} }
    ]);
}
export function buildMembershipRequestsActionIq(input) {
    const approve = input.approve ?? [];
    const reject = input.reject ?? [];
    if (approve.length === 0 && reject.length === 0) {
        throw new Error('membership_requests_action requires at least one approve or reject jid');
    }
    const children = [];
    if (approve.length > 0) {
        children.push({
            tag: WA_GROUP_MEMBERSHIP_ACTION_TAGS.APPROVE,
            attrs: {},
            content: approve.map((jid) => ({ tag: 'participant', attrs: { jid } }))
        });
    }
    if (reject.length > 0) {
        children.push({
            tag: WA_GROUP_MEMBERSHIP_ACTION_TAGS.REJECT,
            attrs: {},
            content: reject.map((jid) => ({ tag: 'participant', attrs: { jid } }))
        });
    }
    return buildIqNode(WA_IQ_TYPES.SET, input.groupJid, WA_XMLNS.GROUPS, [
        { tag: WA_GROUP_MEMBERSHIP_ACTION_TAGS.REQUESTS_ACTION, attrs: {}, content: children }
    ]);
}
export function buildCancelMembershipRequestsIq(input) {
    if (input.participantJids.length === 0) {
        throw new Error('cancel_membership_requests requires at least one participant');
    }
    return buildIqNode(WA_IQ_TYPES.SET, input.groupJid, WA_XMLNS.GROUPS, [
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
    return buildIqNode(WA_IQ_TYPES.SET, input.groupJid, WA_XMLNS.GROUPS, [
        {
            tag: input.tag,
            attrs: {},
            content: input.mode
        }
    ]);
}
export function buildSetGroupMemberAddModeIq(input) {
    return buildSetGroupMemberModeIq({
        groupJid: input.groupJid,
        tag: 'member_add_mode',
        mode: input.mode
    });
}
export function buildSetGroupMemberLinkModeIq(input) {
    return buildSetGroupMemberModeIq({
        groupJid: input.groupJid,
        tag: 'member_link_mode',
        mode: input.mode
    });
}
export function buildSetGroupMemberShareGroupHistoryModeIq(input) {
    return buildSetGroupMemberModeIq({
        groupJid: input.groupJid,
        tag: 'member_share_group_history_mode',
        mode: input.mode
    });
}
export function buildSetGroupEphemeralIq(input) {
    const attrs = { expiration: String(input.expirationSeconds) };
    if (input.trigger !== undefined) {
        attrs.trigger = String(input.trigger);
    }
    return buildIqNode(WA_IQ_TYPES.SET, input.groupJid, WA_XMLNS.GROUPS, [
        { tag: 'ephemeral', attrs }
    ]);
}
export function buildJoinLinkedGroupIq(input) {
    const attrs = { jid: input.subGroupJid };
    if (input.type) {
        attrs.type = input.type;
    }
    return buildIqNode(WA_IQ_TYPES.SET, input.groupJid, WA_XMLNS.GROUPS, [
        { tag: 'join_linked_group', attrs }
    ]);
}
