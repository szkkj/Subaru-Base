"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInboundAck = buildInboundAck;
exports.createIncomingBaseEvent = createIncomingBaseEvent;
exports.sendSafeAck = sendSafeAck;
exports.createIncomingReceiptHandler = createIncomingReceiptHandler;
exports.createIncomingFailureHandler = createIncomingFailureHandler;
exports.createIncomingNotificationHandler = createIncomingNotificationHandler;
exports.createIncomingRegistrationNotificationHandler = createIncomingRegistrationNotificationHandler;
exports.createIncomingBusinessNotificationHandler = createIncomingBusinessNotificationHandler;
exports.createIncomingGroupNotificationHandler = createIncomingGroupNotificationHandler;
exports.createIncomingPictureNotificationHandler = createIncomingPictureNotificationHandler;
exports.createIncomingCallHandler = createIncomingCallHandler;
exports.createInfoBulletinNotificationEvent = createInfoBulletinNotificationEvent;
exports.createUnhandledIncomingNodeEvent = createUnhandledIncomingNodeEvent;
const business_1 = require("../events/business");
const call_1 = require("../events/call");
const group_1 = require("../events/group");
const mex_notification_1 = require("../events/mex-notification");
const picture_1 = require("../events/picture");
const receipt_1 = require("../events/receipt");
const registration_1 = require("../events/registration");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const username_1 = require("../../protocol/username");
const global_1 = require("../../transport/node/builders/global");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
const FAILURE_REASON_TO_DISCONNECT = {
    401: constants_1.WA_DISCONNECT_REASONS.FAILURE_NOT_AUTHORIZED,
    403: constants_1.WA_DISCONNECT_REASONS.FAILURE_LOCKED,
    406: constants_1.WA_DISCONNECT_REASONS.FAILURE_BANNED,
    405: constants_1.WA_DISCONNECT_REASONS.FAILURE_CLIENT_TOO_OLD,
    409: constants_1.WA_DISCONNECT_REASONS.FAILURE_BAD_USER_AGENT,
    503: constants_1.WA_DISCONNECT_REASONS.FAILURE_SERVICE_UNAVAILABLE
};
const LOGOUT_FAILURE_REASONS = new Set([401, 403, 406]);
const DISCONNECT_FAILURE_REASONS = new Set([405, 409, 503]);
const CORE_NOTIFICATION_TYPES = new Set([
    'server_sync',
    'contacts',
    'devices',
    'disappearing_mode',
    'mediaretry',
    'encrypt',
    'server',
    'status',
    'account_sync',
    'privacy_token',
    'newsletter',
    'w:growth',
    'registration',
    'mex'
]);
const OUT_OF_SCOPE_NOTIFICATION_TYPES = new Set(['pay', 'psa', 'waffle', 'hosted']);
const NOTIFICATION_TYPES_WITH_PARTICIPANT_ACK = new Set(['mediaretry', 'psa']);
const NOTIFICATION_TYPES_WITHOUT_TYPE_ACK = new Set(['encrypt', 'devices']);
const RECEIPT_RETRY_TYPES = new Set([
    constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY,
    constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY
]);
/**
 * Builds the inbound ack for `message`/`receipt`/`notification` tags. Returns
 * `null` for other tags or when required attrs are missing.
 */
function buildInboundAck(node) {
    if (node.tag === constants_1.WA_MESSAGE_TAGS.MESSAGE) {
        const id = node.attrs.id;
        const from = node.attrs.from;
        if (!id || !from) {
            return null;
        }
        return (0, global_1.buildAckNode)({ kind: 'message', node, id, to: from });
    }
    if (node.tag === constants_1.WA_MESSAGE_TAGS.RECEIPT) {
        if (!node.attrs.id || !node.attrs.from) {
            return null;
        }
        const receiptType = node.attrs.type;
        if (receiptType && RECEIPT_RETRY_TYPES.has(receiptType)) {
            return (0, global_1.buildAckNode)({ kind: 'receipt', node, retryType: true });
        }
        return (0, global_1.buildAckNode)({
            kind: 'receipt',
            node,
            includeParticipant: receiptType !== constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_SERVER_ERROR
        });
    }
    if (node.tag === constants_1.WA_NODE_TAGS.NOTIFICATION) {
        const type = node.attrs.type ?? '';
        return (0, global_1.buildAckNode)({
            kind: 'notification',
            node,
            includeParticipant: type === constants_1.WA_NOTIFICATION_TYPES.GROUP ||
                NOTIFICATION_TYPES_WITH_PARTICIPANT_ACK.has(type),
            includeType: !NOTIFICATION_TYPES_WITHOUT_TYPE_ACK.has(type)
        });
    }
    return null;
}
function createIncomingBaseEvent(node) {
    return {
        rawNode: node,
        stanzaId: node.attrs.id,
        chatJid: node.attrs.from,
        stanzaType: node.attrs.type,
        offline: node.attrs.offline !== undefined
    };
}
async function sendSafeAck(logger, sendNode, node) {
    try {
        await sendNode(node);
    }
    catch (error) {
        logger.warn('failed to send inbound ack', {
            tag: node.tag,
            class: node.attrs.class,
            type: node.attrs.type,
            id: node.attrs.id,
            message: (0, primitives_1.toError)(error).message
        });
    }
}
function classifyNotificationType(notificationType) {
    if (CORE_NOTIFICATION_TYPES.has(notificationType)) {
        return 'core';
    }
    if (OUT_OF_SCOPE_NOTIFICATION_TYPES.has(notificationType)) {
        return 'out_of_scope';
    }
    return 'unknown';
}
async function applyFailureAction(options, reason, clearStoredCredentials) {
    try {
        options.stopComms();
        const disconnectReason = FAILURE_REASON_TO_DISCONNECT[reason] ?? constants_1.WA_DISCONNECT_REASONS.STREAM_ERROR_OTHER;
        await options.disconnect(disconnectReason, clearStoredCredentials, reason);
        if (clearStoredCredentials) {
            await options.clearStoredCredentials();
        }
    }
    catch (error) {
        options.logger.warn('failed applying failure stanza action', {
            reason,
            clearStoredCredentials,
            message: (0, primitives_1.toError)(error).message
        });
    }
}
const INTERNAL_ONLY_RECEIPT_TYPES = new Set([
    ...RECEIPT_RETRY_TYPES,
    constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_PEER,
    constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_SENDER,
    constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_HISTORY_SYNC,
    constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_SERVER_ERROR
]);
function mapReceiptStatus(type) {
    switch (type) {
        case undefined:
        case constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_DELIVERY:
            return { status: 'delivered', fromSelfDevice: false };
        case constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_READ:
            return { status: 'read', fromSelfDevice: false };
        case constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_READ_SELF:
            return { status: 'read', fromSelfDevice: true };
        case constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_PLAYED:
            return { status: 'played', fromSelfDevice: false };
        case constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_PLAYED_SELF:
            return { status: 'played', fromSelfDevice: true };
        case constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_INACTIVE:
            return { status: 'inactive', fromSelfDevice: false };
        default:
            return null;
    }
}
function createIncomingReceiptHandler(options) {
    return async (node) => {
        if (!node.attrs.id || !node.attrs.from) {
            options.logger.warn('incoming receipt missing required attrs for ack', {
                hasFrom: node.attrs.from !== undefined,
                hasId: node.attrs.id !== undefined,
                type: node.attrs.type
            });
            return true;
        }
        const mapped = mapReceiptStatus(node.attrs.type);
        if (mapped) {
            options.emitIncomingReceipt({
                ...createIncomingBaseEvent(node),
                status: mapped.status,
                fromSelfDevice: mapped.fromSelfDevice,
                participantJid: node.attrs.participant,
                ...(node.attrs.participant_username !== undefined
                    ? { participantUsername: (0, username_1.normalizeUsername)(node.attrs.participant_username) }
                    : {}),
                recipientJid: node.attrs.recipient,
                messageIds: (0, receipt_1.extractReceiptIds)(node)
            });
        }
        else if (node.attrs.type && !INTERNAL_ONLY_RECEIPT_TYPES.has(node.attrs.type)) {
            options.logger.warn('unrecognized receipt type suppressed', {
                id: node.attrs.id,
                from: node.attrs.from,
                type: node.attrs.type
            });
        }
        try {
            await options.trackOutboundReceipt?.(node);
        }
        catch (error) {
            options.logger.warn('failed to track outbound message receipt state', {
                id: node.attrs.id,
                from: node.attrs.from,
                type: node.attrs.type,
                message: (0, primitives_1.toError)(error).message
            });
        }
        const receiptType = node.attrs.type;
        if (receiptType === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY ||
            receiptType === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY) {
            if (options.handleIncomingRetryReceipt) {
                await options.handleIncomingRetryReceipt(node);
            }
            else {
                const ack = buildInboundAck(node);
                if (ack) {
                    await sendSafeAck(options.logger, options.sendNode, ack);
                }
            }
            return true;
        }
        const ack = buildInboundAck(node);
        if (ack) {
            await sendSafeAck(options.logger, options.sendNode, ack);
        }
        return true;
    };
}
function createIncomingFailureHandler(options) {
    return async (node) => {
        const reason = (0, primitives_1.parseOptionalInt)(node.attrs.reason);
        const code = (0, primitives_1.parseOptionalInt)(node.attrs.code);
        options.emitIncomingFailure({
            ...createIncomingBaseEvent(node),
            failureReason: reason,
            failureCode: code,
            failureMessage: node.attrs.message,
            failureUrl: node.attrs.url
        });
        const shouldClearStoredCredentials = reason !== undefined && LOGOUT_FAILURE_REASONS.has(reason);
        if (shouldClearStoredCredentials ||
            (reason !== undefined && DISCONNECT_FAILURE_REASONS.has(reason))) {
            await applyFailureAction(options, reason ?? 0, shouldClearStoredCredentials);
        }
        return true;
    };
}
function createIncomingNotificationHandler(options) {
    return async (node) => {
        const notificationType = node.attrs.type ?? '';
        const classification = classifyNotificationType(notificationType);
        const firstChildTag = (0, helpers_1.getFirstNodeChild)(node)?.tag;
        const baseEvent = createIncomingBaseEvent(node);
        const serverSyncCollections = notificationType === 'server_sync'
            ? (0, helpers_1.getNodeChildrenNonEmptyAttrValuesByTag)(node, constants_1.WA_NODE_TAGS.COLLECTION, 'name')
            : [];
        let details;
        if (firstChildTag || serverSyncCollections.length > 0) {
            details = {};
            if (firstChildTag) {
                details.firstChildTag = firstChildTag;
            }
            if (serverSyncCollections.length > 0) {
                details.collections = serverSyncCollections;
            }
        }
        options.emitIncomingNotification({
            ...baseEvent,
            notificationType,
            classification,
            details
        });
        if (notificationType === 'mex') {
            const parsed = (0, mex_notification_1.parseMexNotification)(node);
            if (parsed) {
                options.emitMexNotification({ ...baseEvent, ...parsed });
            }
            else {
                options.emitUnhandledStanza({
                    ...baseEvent,
                    reason: 'notification.mex.parse_failed'
                });
            }
        }
        if (notificationType === constants_1.WA_NOTIFICATION_TYPES.MEDIA_RETRY) {
            options.handleMediaRetryNotification?.(node);
        }
        if (classification === 'out_of_scope') {
            options.emitUnhandledStanza({
                ...baseEvent,
                reason: `notification.${notificationType}.out_of_scope`
            });
        }
        else if (classification === 'unknown') {
            options.emitUnhandledStanza({
                ...baseEvent,
                reason: `notification.${notificationType || 'unknown'}.not_supported`
            });
        }
        const ack = buildInboundAck(node);
        if (ack) {
            await sendSafeAck(options.logger, options.sendNode, ack);
        }
        if (notificationType === 'server_sync' && serverSyncCollections.length > 0) {
            const collectionsCsv = serverSyncCollections.join(',');
            if (!options.syncAppState) {
                options.logger.warn('received server_sync notification without app-state sync runtime', {
                    collections: collectionsCsv
                });
                return true;
            }
            void options.syncAppState().catch((error) => {
                options.logger.warn('failed to sync app-state after server_sync notification', {
                    collections: collectionsCsv,
                    message: (0, primitives_1.toError)(error).message
                });
            });
        }
        return true;
    };
}
function createIncomingRegistrationNotificationHandler(options) {
    return async (node) => {
        if (node.attrs.type !== constants_1.WA_NOTIFICATION_TYPES.REGISTRATION) {
            return false;
        }
        const parsed = (0, registration_1.parseRegistrationNotification)(node);
        if (!parsed) {
            return false;
        }
        const baseEvent = createIncomingBaseEvent(node);
        if (parsed.kind === 'registration_code') {
            options.emitRegistrationCode({
                ...baseEvent,
                code: parsed.code,
                expiryTimestampMs: parsed.expiryTimestampMs,
                fromDeviceId: parsed.fromDeviceId
            });
        }
        else {
            options.emitAccountTakeoverNotice({
                ...baseEvent,
                serverToken: parsed.serverToken,
                attemptTimestampMs: parsed.attemptTimestampMs,
                newDeviceName: parsed.newDeviceName,
                newDevicePlatform: parsed.newDevicePlatform,
                newDeviceAppVersion: parsed.newDeviceAppVersion
            });
        }
        const ack = buildInboundAck(node);
        if (ack) {
            await sendSafeAck(options.logger, options.sendNode, ack);
        }
        return true;
    };
}
function createIncomingTypedNotificationHandler(opts) {
    return async (node) => {
        if (node.attrs.type !== opts.type) {
            return false;
        }
        const baseEvent = createIncomingBaseEvent(node);
        const parsed = opts.parse(node);
        for (const event of parsed.events) {
            opts.emit(event);
        }
        for (const unhandled of parsed.unhandled) {
            opts.emitUnhandledStanza(unhandled);
        }
        if (parsed.events.length === 0 && parsed.unhandled.length === 0) {
            opts.emitUnhandledStanza({
                ...baseEvent,
                reason: `notification.${opts.type}.empty`
            });
        }
        const ack = buildInboundAck(node);
        if (ack) {
            await sendSafeAck(opts.logger, opts.sendNode, ack);
        }
        return true;
    };
}
function createIncomingBusinessNotificationHandler(options) {
    return createIncomingTypedNotificationHandler({
        logger: options.logger,
        sendNode: options.sendNode,
        type: constants_1.WA_NOTIFICATION_TYPES.BUSINESS,
        parse: business_1.parseBusinessNotificationEvents,
        emit: options.emitBusinessEvent,
        emitUnhandledStanza: options.emitUnhandledStanza
    });
}
function createIncomingGroupNotificationHandler(options) {
    return createIncomingTypedNotificationHandler({
        logger: options.logger,
        sendNode: options.sendNode,
        type: constants_1.WA_NOTIFICATION_TYPES.GROUP,
        parse: group_1.parseGroupNotificationEvents,
        emit: options.emitGroupEvent,
        emitUnhandledStanza: options.emitUnhandledStanza
    });
}
function createIncomingPictureNotificationHandler(options) {
    return createIncomingTypedNotificationHandler({
        logger: options.logger,
        sendNode: options.sendNode,
        type: constants_1.WA_NOTIFICATION_TYPES.PICTURE,
        parse: picture_1.parsePictureNotificationEvents,
        emit: options.emitPictureEvent,
        emitUnhandledStanza: options.emitUnhandledStanza
    });
}
function createIncomingCallHandler(options) {
    return async (node) => {
        const parsed = (0, call_1.parseCallNode)(node);
        options.emitIncomingCall({
            ...createIncomingBaseEvent(node),
            ...parsed
        });
        const peerJid = node.attrs.from;
        const stanzaId = node.attrs.id;
        if (!peerJid || !stanzaId) {
            options.logger.warn('incoming call missing required attrs for ack', {
                hasFrom: peerJid !== undefined,
                hasId: stanzaId !== undefined,
                payloadTag: parsed.payloadTag
            });
            return true;
        }
        const payloadTag = parsed.payloadTag;
        const isReceiptType = parsed.type !== 'unknown' && constants_1.WA_CALL_RECEIPT_PAYLOAD_TAGS.has(parsed.type);
        let response;
        if (isReceiptType && payloadTag && parsed.callId && parsed.callCreatorJid) {
            const credentials = options.getCurrentCredentials();
            let fromJid;
            try {
                fromJid = (0, jid_1.isLidJid)(peerJid)
                    ? credentials?.meLid
                        ? (0, jid_1.normalizeDeviceJid)(credentials.meLid)
                        : undefined
                    : credentials?.meJid
                        ? (0, jid_1.toUserJid)(credentials.meJid)
                        : undefined;
            }
            catch (error) {
                options.logger.warn('failed to derive call receipt from jid', {
                    peerJid,
                    meLid: credentials?.meLid,
                    meJid: credentials?.meJid,
                    message: (0, primitives_1.toError)(error).message
                });
                fromJid = undefined;
            }
            const receiptAttrs = {
                id: stanzaId,
                to: peerJid
            };
            if (fromJid) {
                receiptAttrs.from = fromJid;
            }
            response = (0, global_1.buildReceiptNode)({
                kind: 'custom',
                attrs: receiptAttrs,
                content: [
                    {
                        tag: payloadTag,
                        attrs: {
                            [constants_1.WA_CALL_NODE_ATTRS.CALL_ID]: parsed.callId,
                            [constants_1.WA_CALL_NODE_ATTRS.CALL_CREATOR]: parsed.callCreatorJid
                        }
                    }
                ]
            });
        }
        else {
            response = (0, global_1.buildAckNode)({
                kind: 'custom',
                ackClass: constants_1.WA_MESSAGE_TYPES.ACK_CLASS_CALL,
                to: peerJid,
                id: stanzaId,
                type: payloadTag
            });
        }
        await sendSafeAck(options.logger, options.sendNode, response);
        return true;
    };
}
function createInfoBulletinNotificationEvent(node, type, details) {
    return {
        ...createIncomingBaseEvent(node),
        notificationType: `ib.${type}`,
        classification: 'info_bulletin',
        details
    };
}
function createUnhandledIncomingNodeEvent(node, reason = `unhandled.${node.tag}`) {
    return {
        ...createIncomingBaseEvent(node),
        reason
    };
}
