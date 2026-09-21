"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_GROUP_MEMBERSHIP_ACTION_TAGS = exports.WA_GROUP_PARTICIPANT_TYPES = void 0;
exports.WA_GROUP_PARTICIPANT_TYPES = Object.freeze({
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    REGULAR: 'participant'
});
/** `<membership_requests_action>` child tags for approving/rejecting group join requests. */
exports.WA_GROUP_MEMBERSHIP_ACTION_TAGS = Object.freeze({
    REQUESTS_ACTION: 'membership_requests_action',
    APPROVE: 'approve',
    REJECT: 'reject'
});
