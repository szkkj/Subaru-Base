import { WA_IQ_TYPES, WA_XMLNS } from '../../../protocol/nodes.js';
import { buildIqNode } from '../../node/query.js';
export function buildLinkSubGroupsIq(input) {
    if (input.subGroups.length === 0) {
        throw new Error('linkSubGroups requires at least one subgroup');
    }
    return buildIqNode(WA_IQ_TYPES.SET, input.communityJid, WA_XMLNS.GROUPS, [
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
export function buildUnlinkSubGroupsIq(input) {
    if (input.subGroupJids.length === 0) {
        throw new Error('unlinkSubGroups requires at least one subgroup');
    }
    const groupAttrs = {};
    if (input.removeOrphanedMembers) {
        groupAttrs.remove_orphaned_members = 'true';
    }
    return buildIqNode(WA_IQ_TYPES.SET, input.communityJid, WA_XMLNS.GROUPS, [
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
export function buildDeactivateCommunityIq(communityJid) {
    return buildIqNode(WA_IQ_TYPES.SET, communityJid, WA_XMLNS.GROUPS, [
        { tag: 'delete_parent', attrs: {} }
    ]);
}
export function buildLinkedGroupsParticipantsIq(communityJid) {
    return buildIqNode(WA_IQ_TYPES.GET, communityJid, WA_XMLNS.GROUPS, [
        { tag: 'linked_groups_participants', attrs: {} }
    ]);
}
