export declare const WA_NEWSLETTER_ROLES: Readonly<{
    readonly SUBSCRIBER: "SUBSCRIBER";
    readonly GUEST: "GUEST";
    readonly ADMIN: "ADMIN";
    readonly OWNER: "OWNER";
}>;
export type WaNewsletterRole = (typeof WA_NEWSLETTER_ROLES)[keyof typeof WA_NEWSLETTER_ROLES];
export declare const WA_NEWSLETTER_STATE_TYPES: Readonly<{
    readonly ACTIVE: "ACTIVE";
    readonly SUSPENDED: "SUSPENDED";
    readonly GEOSUSPENDED: "GEOSUSPENDED";
    readonly DELETED: "DELETED";
    readonly NON_EXISTING: "NON_EXISTING";
}>;
export type WaNewsletterStateType = (typeof WA_NEWSLETTER_STATE_TYPES)[keyof typeof WA_NEWSLETTER_STATE_TYPES];
export declare const WA_NEWSLETTER_PICTURE_TYPES: Readonly<{
    readonly IMAGE: "IMAGE";
    readonly PREVIEW: "PREVIEW";
}>;
export declare const WA_NEWSLETTER_FETCH_KEY_TYPES: Readonly<{
    readonly JID: "JID";
    readonly INVITE: "INVITE";
}>;
export declare const WA_NEWSLETTER_VIEW_ROLES: Readonly<{
    readonly GUEST: "GUEST";
    readonly SUBSCRIBER: "SUBSCRIBER";
    readonly ADMIN: "ADMIN";
    readonly OWNER: "OWNER";
}>;
export declare const WA_NEWSLETTER_MUTE_TYPES: Readonly<{
    readonly ADMIN_ACTIVITY: "MUTE_ADMIN_ACTIVITY";
    readonly FOLLOWER_ACTIVITY: "MUTE_FOLLOWER_ACTIVITY";
}>;
export declare const WA_NEWSLETTER_MUTE_VALUES: Readonly<{
    readonly ON: "ON";
    readonly OFF: "OFF";
}>;
export declare const WA_NEWSLETTER_SEND_TYPES: Readonly<{
    readonly TEXT: "text";
    readonly MEDIA: "media";
    readonly REACTION: "reaction";
    readonly REVOKE: "revoke";
}>;
export type WaNewsletterSendType = (typeof WA_NEWSLETTER_SEND_TYPES)[keyof typeof WA_NEWSLETTER_SEND_TYPES];
export declare const WA_NEWSLETTER_RECEIVE_TYPES: Readonly<{
    readonly TEXT: "NewsletterText";
    readonly MEDIA: "NewsletterMedia";
    readonly REACTION: "NewsletterReaction";
    readonly REACTION_REVOKE: "NewsletterReactionRevoke";
    readonly REVOKE: "NewsletterRevoke";
    readonly EDIT: "NewsletterEdit";
    readonly POLL_CREATION: "NewsletterPollCreation";
    readonly POLL_VOTE: "NewsletterPollVote";
    readonly POLL_RESULT_SNAPSHOT: "NewsletterPollResultSnapshot";
    readonly QUIZ_CREATION: "NewsletterQuizCreation";
    readonly QUESTION: "NewsletterQuestion";
    readonly QUESTION_REPLY: "NewsletterQuestionReply";
    readonly QUESTION_RESPONSE: "NewsletterQuestionResponse";
    readonly WAMO_EMPTY: "NewsletterWAMOEmpty";
}>;
export type WaNewsletterReceiveType = (typeof WA_NEWSLETTER_RECEIVE_TYPES)[keyof typeof WA_NEWSLETTER_RECEIVE_TYPES];
export declare const WA_NEWSLETTER_VERIFICATION_STATES: Readonly<{
    readonly VERIFIED: "VERIFIED";
    readonly UNVERIFIED: "UNVERIFIED";
}>;
