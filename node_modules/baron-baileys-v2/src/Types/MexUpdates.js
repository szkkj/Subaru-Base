"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const MexUpdatesOperations = {
  OWNER_COMMUNITY: "NotificationCommunityOwnerUpdate",
  GROUP_MEMBER_LINK: "NotificationGroupMemberLinkPropertyUpdate",
  GROUP_LIMIT_SHARING: "NotificationGroupLimitSharingPropertyUpdate",
};

const XWAPathsMexUpdates = {
  GROUP_SHARING_CHANGE: "xwa2_notify_group_on_prop_change",
  COMMUNITY_OWNER_CHANGE: "xwa2_notify_group_on_participants_roles_change",
};

exports.MexUpdatesOperations = MexUpdatesOperations;
exports.XWAPathsMexUpdates = XWAPathsMexUpdates;
