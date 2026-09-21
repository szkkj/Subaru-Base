"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContentType = getContentType;
exports.resolveMessageTarget = resolveMessageTarget;
exports.isSendMediaMessage = isSendMediaMessage;
exports.isSendTextMessage = isSendTextMessage;
exports.isSendReactionMessage = isSendReactionMessage;
exports.isSendRevokeMessage = isSendRevokeMessage;
exports.isSendPinMessage = isSendPinMessage;
exports.isSendKeepMessage = isSendKeepMessage;
exports.isSendPollMessage = isSendPollMessage;
exports.isSendPollVoteMessage = isSendPollVoteMessage;
exports.isSendEventMessage = isSendEventMessage;
exports.isSendEventResponseMessage = isSendEventResponseMessage;
exports.isSendAddonCryptoMessage = isSendAddonCryptoMessage;
exports.supportsViewOnce = supportsViewOnce;
exports.wrapAsViewOnce = wrapAsViewOnce;
exports.unwrapMessage = unwrapMessage;
exports.resolveMessageTypeAttr = resolveMessageTypeAttr;
exports.resolveDecryptFailAttr = resolveDecryptFailAttr;
exports.needsSecretPersistence = needsSecretPersistence;
exports.resolveEditAttr = resolveEditAttr;
exports.resolveEncMediaType = resolveEncMediaType;
exports.resolveButtonAddonKind = resolveButtonAddonKind;
exports.resolveOutboundMessageAttrs = resolveOutboundMessageAttrs;
exports.resolveMetaAttrs = resolveMetaAttrs;
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
/**
 * Content keys that carry a payload but do not end in `Message`, so the
 * substring match below would miss them.
 */
const UNSUFFIXED_CONTENT_KEYS = new Set([
    'conversation',
    'messageHistoryBundle',
    'messageHistoryNotice'
]);
/**
 * Returns the content-type key of a message - `'conversation'`,
 * `'imageMessage'`, `'extendedTextMessage'`, `'messageHistoryBundle'`, etc. -
 * or `undefined` for an empty message. `senderKeyDistributionMessage` is
 * skipped so group messages report their real payload type rather than the
 * piggy-backed sender-key.
 *
 * A key that is present but holds `null`/`undefined` carries no payload and is
 * skipped, so an explicitly-cleared field cannot mask the real content.
 */
function getContentType(content) {
    if (!content)
        return undefined;
    const key = Object.keys(content).find((k) => content[k] !== null &&
        content[k] !== undefined &&
        (UNSUFFIXED_CONTENT_KEYS.has(k) || k.includes('Message')) &&
        k !== 'senderKeyDistributionMessage');
    return key;
}
/**
 * Normalizes a reply/edit/reaction/revoke/pin target into a {@link WaMessageKey}:
 * an explicit key is returned as-is, while a received `message` event
 * ({@link WaMessageRef}, identified by its `rawNode`) yields its pre-computed
 * `key`.
 */
function resolveMessageTarget(ref) {
    if (!('rawNode' in ref)) {
        return ref;
    }
    const key = ref.key;
    if (key === undefined || typeof key.id !== 'string') {
        throw new Error('message event used as a target is missing key.id');
    }
    return key;
}
function isSendMediaMessage(content) {
    if (!content || typeof content !== 'object' || !('type' in content)) {
        return false;
    }
    if ('media' in content) {
        return true;
    }
    return content.type === 'sticker-pack' && 'stickers' in content;
}
function isSendTextMessage(content) {
    return (!!content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'text' &&
        'text' in content);
}
function isSendReactionMessage(content) {
    return (!!content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'reaction' &&
        'target' in content);
}
function isSendRevokeMessage(content) {
    return (!!content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'revoke' &&
        'target' in content);
}
function isSendPinMessage(content) {
    if (!content || typeof content !== 'object' || !('type' in content) || !('target' in content)) {
        return false;
    }
    const type = content.type;
    return type === 'pin' || type === 'unpin';
}
function isSendKeepMessage(content) {
    if (!content || typeof content !== 'object' || !('type' in content) || !('target' in content)) {
        return false;
    }
    const type = content.type;
    return type === 'keep' || type === 'unkeep';
}
function isSendPollMessage(content) {
    return (!!content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'poll' &&
        'name' in content &&
        'options' in content);
}
function isSendPollVoteMessage(content) {
    return (!!content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'poll-vote' &&
        'poll' in content &&
        'selectedOptionNames' in content);
}
function isSendEventMessage(content) {
    return (!!content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'event' &&
        'name' in content &&
        'startTime' in content);
}
function isSendEventResponseMessage(content) {
    return (!!content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'event-response' &&
        'event' in content &&
        'response' in content);
}
function isSendAddonCryptoMessage(content) {
    return isSendPollVoteMessage(content) || isSendEventResponseMessage(content);
}
const VIEW_ONCE_MEDIA_FIELDS = [
    'imageMessage',
    'videoMessage',
    'ptvMessage',
    'audioMessage'
];
function supportsViewOnce(message) {
    return VIEW_ONCE_MEDIA_FIELDS.some((field) => message[field]);
}
function wrapAsViewOnce(message) {
    if (message.viewOnceMessage || message.viewOnceMessageV2) {
        return message;
    }
    for (const field of VIEW_ONCE_MEDIA_FIELDS) {
        const media = message[field];
        if (media)
            return { ...message, [field]: { ...media, viewOnce: true } };
    }
    return message;
}
function unwrapMessage(message) {
    let msg = message;
    for (;;) {
        const inner = msg.ephemeralMessage?.message ??
            msg.groupMentionedMessage?.message ??
            msg.botInvokeMessage?.message ??
            msg.deviceSentMessage?.message ??
            msg.viewOnceMessage?.message ??
            msg.viewOnceMessageV2?.message ??
            msg.documentWithCaptionMessage?.message ??
            msg.groupStatusMessage?.message ??
            msg.groupStatusMessageV2?.message ??
            msg.botForwardedMessage?.message;
        if (!inner)
            return msg;
        msg = inner;
    }
}
function resolveMessageTypeAttr(message) {
    return resolveMessageTypeAttrFrom(unwrapMessage(message));
}
function resolveMessageTypeAttrFrom(msg) {
    if (msg.reactionMessage || msg.encReactionMessage) {
        return constants_1.WA_STANZA_MSG_TYPES.REACTION;
    }
    if (msg.eventMessage ||
        msg.encEventResponseMessage ||
        msg.secretEncryptedMessage?.secretEncType ===
            _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.EVENT_EDIT) {
        return constants_1.WA_STANZA_MSG_TYPES.EVENT;
    }
    if (msg.pollCreationMessage ||
        msg.pollCreationMessageV2 ||
        msg.pollCreationMessageV3 ||
        msg.pollCreationMessageV5 ||
        msg.pollCreationMessageV6 ||
        msg.pollUpdateMessage ||
        msg.secretEncryptedMessage?.secretEncType ===
            _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_EDIT ||
        msg.secretEncryptedMessage?.secretEncType ===
            _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_ADD_OPTION) {
        return constants_1.WA_STANZA_MSG_TYPES.POLL;
    }
    if (msg.extendedTextMessage?.matchedText && msg.extendedTextMessage.matchedText.trim() !== '') {
        return constants_1.WA_STANZA_MSG_TYPES.MEDIA;
    }
    if ((msg.conversation !== undefined && msg.conversation !== null) ||
        (msg.extendedTextMessage && !msg.extendedTextMessage.matchedText) ||
        msg.protocolMessage ||
        msg.interactiveMessage ||
        msg.keepInChatMessage ||
        msg.requestPhoneNumberMessage ||
        msg.editedMessage ||
        msg.pinInChatMessage ||
        msg.encCommentMessage ||
        msg.newsletterAdminInviteMessage ||
        msg.pollResultSnapshotMessage ||
        msg.pollResultSnapshotMessageV3 ||
        msg.templateButtonReplyMessage ||
        msg.messageHistoryNotice ||
        msg.richResponseMessage ||
        msg.botForwardedMessage ||
        msg.secretEncryptedMessage?.secretEncType ===
            _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.MESSAGE_EDIT ||
        msg.secretEncryptedMessage?.secretEncType ===
            _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.MESSAGE_SCHEDULE) {
        return constants_1.WA_STANZA_MSG_TYPES.TEXT;
    }
    return constants_1.WA_STANZA_MSG_TYPES.MEDIA;
}
const REVOKED_REACTION_TEXT = '';
function resolveDecryptFailAttr(message) {
    return resolveDecryptFailAttrFrom(unwrapMessage(message));
}
function resolveDecryptFailAttrFrom(msg) {
    const secretEncType = msg.secretEncryptedMessage?.secretEncType;
    if (msg.reactionMessage ||
        msg.encReactionMessage ||
        (msg.pollUpdateMessage &&
            msg.pollUpdateMessage.vote !== null &&
            msg.pollUpdateMessage.vote !== undefined) ||
        msg.keepInChatMessage ||
        msg.editedMessage ||
        msg.pinInChatMessage ||
        msg.encCommentMessage ||
        msg.encEventResponseMessage ||
        secretEncType === _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.EVENT_EDIT ||
        secretEncType === _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_EDIT ||
        secretEncType === _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_ADD_OPTION ||
        msg.messageHistoryNotice) {
        return 'hide';
    }
    if (msg.protocolMessage) {
        const protocolType = msg.protocolMessage.type;
        if (protocolType === _proto_1.proto.Message.ProtocolMessage.Type.EPHEMERAL_SYNC_RESPONSE ||
            protocolType === _proto_1.proto.Message.ProtocolMessage.Type.REQUEST_WELCOME_MESSAGE ||
            msg.protocolMessage.editedMessage) {
            return 'hide';
        }
    }
    return undefined;
}
function needsSecretPersistence(message) {
    const msg = unwrapMessage(message);
    return !!(msg.pollCreationMessage ||
        msg.pollCreationMessageV2 ||
        msg.pollCreationMessageV3 ||
        msg.pollCreationMessageV4 ||
        msg.pollCreationMessageV5 ||
        msg.pollCreationMessageV6 ||
        msg.eventMessage ||
        // botMetadata sits on the top-level MessageContextInfo even when the
        // prompt body is wrapped (e.g. in `botInvokeMessage`); check both.
        message.messageContextInfo?.botMetadata ||
        msg.messageContextInfo?.botMetadata);
}
function resolveEditAttr(message) {
    return resolveEditAttrFrom(unwrapMessage(message));
}
function resolveEditAttrFrom(msg) {
    if (msg.protocolMessage) {
        const protocolType = msg.protocolMessage.type;
        if (protocolType === _proto_1.proto.Message.ProtocolMessage.Type.REVOKE) {
            return msg.protocolMessage.key?.fromMe === false
                ? constants_1.WA_EDIT_ATTRS.ADMIN_REVOKE
                : constants_1.WA_EDIT_ATTRS.SENDER_REVOKE;
        }
        if (protocolType === _proto_1.proto.Message.ProtocolMessage.Type.MESSAGE_EDIT) {
            return constants_1.WA_EDIT_ATTRS.MESSAGE_EDIT;
        }
        return null;
    }
    if (msg.secretEncryptedMessage) {
        const encType = msg.secretEncryptedMessage.secretEncType;
        if (encType === _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.EVENT_EDIT ||
            encType === _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.MESSAGE_EDIT) {
            return constants_1.WA_EDIT_ATTRS.MESSAGE_EDIT;
        }
    }
    if (msg.editedMessage) {
        return constants_1.WA_EDIT_ATTRS.MESSAGE_EDIT;
    }
    if (msg.reactionMessage) {
        if (msg.reactionMessage.text === REVOKED_REACTION_TEXT) {
            return constants_1.WA_EDIT_ATTRS.SENDER_REVOKE;
        }
        return null;
    }
    if (msg.keepInChatMessage) {
        if (msg.keepInChatMessage.key?.fromMe === true &&
            msg.keepInChatMessage.keepType === _proto_1.proto.KeepType.UNDO_KEEP_FOR_ALL) {
            return constants_1.WA_EDIT_ATTRS.SENDER_REVOKE;
        }
        return null;
    }
    if (msg.pinInChatMessage) {
        return constants_1.WA_EDIT_ATTRS.PIN_IN_CHAT;
    }
    return null;
}
function resolveEncMediaType(message) {
    return resolveEncMediaTypeFrom(unwrapMessage(message));
}
function resolveEncMediaTypeFrom(msg) {
    if (msg.imageMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.IMAGE;
    if (msg.stickerMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.STICKER;
    if (msg.stickerPackMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.STICKER_PACK;
    if (msg.locationMessage) {
        return msg.locationMessage.isLive
            ? constants_1.WA_ENC_MEDIA_TYPES.LIVE_LOCATION
            : constants_1.WA_ENC_MEDIA_TYPES.LOCATION;
    }
    if (msg.contactMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.VCARD;
    if (msg.contactsArrayMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.CONTACT_ARRAY;
    if (msg.documentMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.DOCUMENT;
    if (msg.audioMessage) {
        return msg.audioMessage.ptt ? constants_1.WA_ENC_MEDIA_TYPES.PTT : constants_1.WA_ENC_MEDIA_TYPES.AUDIO;
    }
    if (msg.videoMessage) {
        return msg.videoMessage.gifPlayback ? constants_1.WA_ENC_MEDIA_TYPES.GIF : constants_1.WA_ENC_MEDIA_TYPES.VIDEO;
    }
    if (msg.ptvMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.PTV;
    if (msg.buttonsMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.BUTTON;
    if (msg.buttonsResponseMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.BUTTON_RESPONSE;
    if (msg.listMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.LIST;
    if (msg.listResponseMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.LIST_RESPONSE;
    if (msg.orderMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.ORDER;
    if (msg.productMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.PRODUCT;
    if (msg.groupInviteMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.URL;
    if (msg.interactiveResponseMessage)
        return constants_1.WA_ENC_MEDIA_TYPES.NATIVE_FLOW_RESPONSE;
    if (msg.messageHistoryBundle)
        return constants_1.WA_ENC_MEDIA_TYPES.GROUP_HISTORY;
    if (msg.extendedTextMessage?.matchedText && msg.extendedTextMessage.matchedText.trim() !== '') {
        return constants_1.WA_ENC_MEDIA_TYPES.URL;
    }
    return null;
}
function resolveButtonAddonKind(message) {
    return resolveButtonAddonKindFrom(unwrapMessage(message));
}
function resolveNativeFlowAddonKind(nativeFlow) {
    const firstButtonName = nativeFlow.buttons?.[0]?.name;
    if (firstButtonName === 'payment_info')
        return 'payment_info';
    if (firstButtonName === 'review_and_pay')
        return 'order_details';
    return 'interactive';
}
function resolveButtonAddonKindFrom(msg) {
    if (msg.listMessage)
        return 'list';
    if (msg.buttonsMessage)
        return 'interactive';
    const nativeFlow = msg.interactiveMessage?.nativeFlowMessage;
    if (nativeFlow)
        return resolveNativeFlowAddonKind(nativeFlow);
    return null;
}
/**
 * Resolves every outbound stanza attribute derived from the message body in
 * one pass, unwrapping the envelope (`ephemeralMessage`, `viewOnceMessage`,
 * `deviceSentMessage`, ...) a single time instead of once per resolver.
 * Equivalent to calling the individual `resolve*` helpers on `message`.
 */
function resolveOutboundMessageAttrs(message) {
    const msg = unwrapMessage(message);
    return {
        buttonAddonKind: resolveButtonAddonKindFrom(msg),
        typeAttr: resolveMessageTypeAttrFrom(msg),
        edit: resolveEditAttrFrom(msg),
        mediatype: resolveEncMediaTypeFrom(msg),
        metaAttrs: resolveMetaAttrsFrom(message, msg),
        decryptFail: resolveDecryptFailAttrFrom(msg)
    };
}
function resolveMetaAttrs(message) {
    return resolveMetaAttrsFrom(message, unwrapMessage(message));
}
function resolveMetaAttrsFrom(message, msg) {
    let polltype;
    let eventType;
    let viewOnce;
    if (msg.pollCreationMessage ||
        msg.pollCreationMessageV2 ||
        msg.pollCreationMessageV3 ||
        msg.pollCreationMessageV5 ||
        msg.pollCreationMessageV6) {
        polltype = constants_1.WA_POLL_META_TYPES.CREATION;
    }
    else if (msg.pollUpdateMessage) {
        polltype = constants_1.WA_POLL_META_TYPES.VOTE;
    }
    else if (msg.secretEncryptedMessage?.secretEncType ===
        _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_EDIT) {
        polltype = constants_1.WA_POLL_META_TYPES.EDIT;
    }
    else if (msg.secretEncryptedMessage?.secretEncType ===
        _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_ADD_OPTION) {
        polltype = constants_1.WA_POLL_META_TYPES.EDIT;
    }
    if (msg.eventMessage) {
        eventType = constants_1.WA_EVENT_META_TYPES.CREATION;
    }
    else if (msg.encEventResponseMessage) {
        eventType = constants_1.WA_EVENT_META_TYPES.RESPONSE;
    }
    else if (msg.secretEncryptedMessage?.secretEncType ===
        _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.EVENT_EDIT) {
        eventType = constants_1.WA_EVENT_META_TYPES.EDIT;
    }
    if (message.viewOnceMessage ||
        message.viewOnceMessageV2 ||
        VIEW_ONCE_MEDIA_FIELDS.some((field) => msg[field]?.viewOnce)) {
        viewOnce = 'true';
    }
    if (!polltype && !eventType && !viewOnce) {
        return null;
    }
    const attrs = {};
    if (polltype)
        attrs.polltype = polltype;
    if (eventType)
        attrs.event_type = eventType;
    if (viewOnce)
        attrs.view_once = viewOnce;
    return attrs;
}
