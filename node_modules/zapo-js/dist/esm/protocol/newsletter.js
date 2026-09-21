export const WA_NEWSLETTER_ROLES = Object.freeze({
    SUBSCRIBER: 'SUBSCRIBER',
    GUEST: 'GUEST',
    ADMIN: 'ADMIN',
    OWNER: 'OWNER'
});
export const WA_NEWSLETTER_STATE_TYPES = Object.freeze({
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    GEOSUSPENDED: 'GEOSUSPENDED',
    DELETED: 'DELETED',
    NON_EXISTING: 'NON_EXISTING'
});
export const WA_NEWSLETTER_PICTURE_TYPES = Object.freeze({
    IMAGE: 'IMAGE',
    PREVIEW: 'PREVIEW'
});
export const WA_NEWSLETTER_FETCH_KEY_TYPES = Object.freeze({
    JID: 'JID',
    INVITE: 'INVITE'
});
export const WA_NEWSLETTER_VIEW_ROLES = Object.freeze({
    GUEST: 'GUEST',
    SUBSCRIBER: 'SUBSCRIBER',
    ADMIN: 'ADMIN',
    OWNER: 'OWNER'
});
export const WA_NEWSLETTER_MUTE_TYPES = Object.freeze({
    ADMIN_ACTIVITY: 'MUTE_ADMIN_ACTIVITY',
    FOLLOWER_ACTIVITY: 'MUTE_FOLLOWER_ACTIVITY'
});
export const WA_NEWSLETTER_MUTE_VALUES = Object.freeze({
    ON: 'ON',
    OFF: 'OFF'
});
export const WA_NEWSLETTER_SEND_TYPES = Object.freeze({
    TEXT: 'text',
    MEDIA: 'media',
    REACTION: 'reaction',
    REVOKE: 'revoke'
});
export const WA_NEWSLETTER_RECEIVE_TYPES = Object.freeze({
    TEXT: 'NewsletterText',
    MEDIA: 'NewsletterMedia',
    REACTION: 'NewsletterReaction',
    REACTION_REVOKE: 'NewsletterReactionRevoke',
    REVOKE: 'NewsletterRevoke',
    EDIT: 'NewsletterEdit',
    POLL_CREATION: 'NewsletterPollCreation',
    POLL_VOTE: 'NewsletterPollVote',
    POLL_RESULT_SNAPSHOT: 'NewsletterPollResultSnapshot',
    QUIZ_CREATION: 'NewsletterQuizCreation',
    QUESTION: 'NewsletterQuestion',
    QUESTION_REPLY: 'NewsletterQuestionReply',
    QUESTION_RESPONSE: 'NewsletterQuestionResponse',
    WAMO_EMPTY: 'NewsletterWAMOEmpty'
});
export const WA_NEWSLETTER_VERIFICATION_STATES = Object.freeze({
    VERIFIED: 'VERIFIED',
    UNVERIFIED: 'UNVERIFIED'
});
