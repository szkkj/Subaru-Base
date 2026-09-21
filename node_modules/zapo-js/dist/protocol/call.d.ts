export declare const WA_CALL_PAYLOAD_TAGS: Readonly<{
    readonly OFFER: "offer";
    readonly OFFER_NOTICE: "offer_notice";
    readonly ACCEPT: "accept";
    readonly PREACCEPT: "preaccept";
    readonly REJECT: "reject";
    readonly TERMINATE: "terminate";
    readonly TRANSPORT: "transport";
    readonly MUTE: "mute";
    readonly VIDEO_STATE: "video_state";
    readonly GROUP_INFO: "group_info";
    readonly GROUP_UPDATE: "group_update";
    readonly ENC_REKEY: "enc_rekey";
    readonly PEER_STATE: "peer_state";
    readonly FLOW_CONTROL: "flow_control";
    readonly WEB_CLIENT: "web_client";
}>;
export type WaCallPayloadTag = (typeof WA_CALL_PAYLOAD_TAGS)[keyof typeof WA_CALL_PAYLOAD_TAGS];
/**
 * Payload tags that wa-web responds to with a `<receipt>` carrying a typed
 * child node (`<offer call-id call-creator/>`, etc.) instead of a plain
 * `<ack class="call"/>`. Source: `WAWebHandleVoipCall.js`.
 */
export declare const WA_CALL_RECEIPT_PAYLOAD_TAGS: ReadonlySet<WaCallPayloadTag>;
export declare const WA_CALL_NODE_ATTRS: Readonly<{
    readonly CALL_ID: "call-id";
    readonly CALL_CREATOR: "call-creator";
    readonly GROUP_JID: "group-jid";
    readonly CALLER_PN: "caller_pn";
    readonly CALLER_COUNTRY_CODE: "caller_country_code";
    readonly USERNAME: "username";
    readonly NOTIFY: "notify";
    readonly SENDER_LID: "sender_lid";
    readonly PLATFORM: "platform";
    readonly VERSION: "version";
    readonly REASON: "reason";
    readonly USER_PN: "user_pn";
    readonly GUEST_NAME: "guest_name";
}>;
export declare const WA_CALL_CHILD_TAGS: Readonly<{
    readonly VIDEO: "video";
    readonly SILENCE: "silence";
    readonly GROUP_INFO: "group_info";
}>;
