"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLinkSubGroupsIq = buildLinkSubGroupsIq;
exports.buildUnlinkSubGroupsIq = buildUnlinkSubGroupsIq;
exports.buildDeactivateCommunityIq = buildDeactivateCommunityIq;
exports.buildLinkedGroupsParticipantsIq = buildLinkedGroupsParticipantsIq;
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
function buildLinkSubGroupsIq(input) {
    if (input.subGroups.length === 0) {
        throw new Error('linkSubGroups requires at least one subgroup');
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.communityJid, nodes_1.WA_XMLNS.GROUPS, [
        {
            tag: 'links',
            attrs: {},
            content: [
                {
                    tag: 'link',
                    attrs: { link_type: 'sub_group' },
                    content: input.subGroups.map(({ jid, hidden }) => ({
                        tag: 'group',
                        attrs: { jid },
                        ...(hidden ? { content: [{ tag: 'hidden_group', attrs: {} }] } : {})
                    }))
                }
            ]
        }
    ]);
}
function buildUnlinkSubGroupsIq(input) {
    if (input.subGroupJids.length === 0) {
        throw new Error('unlinkSubGroups requires at least one subgroup');
    }
    const groupAttrs = {};
    if (input.removeOrphanedMembers) {
        groupAttrs.remove_orphaned_members = 'true';
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, input.communityJid, nodes_1.WA_XMLNS.GROUPS, [
        {
            tag: 'unlink',
            attrs: { unlink_type: 'sub_group' },
            content: input.subGroupJids.map((jid) => ({
                tag: 'group',
                attrs: { jid, ...groupAttrs }
            }))
        }
    ]);
}
function buildDeactivateCommunityIq(communityJid) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, communityJid, nodes_1.WA_XMLNS.GROUPS, [
        { tag: 'delete_parent', attrs: {} }
    ]);
}
function buildLinkedGroupsParticipantsIq(communityJid) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, communityJid, nodes_1.WA_XMLNS.GROUPS, [
        { tag: 'linked_groups_participants', attrs: {} }
    ]);
}
