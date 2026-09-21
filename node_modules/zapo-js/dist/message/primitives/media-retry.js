"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMediaRetryNotification = parseMediaRetryNotification;
exports.createMediaRetryRequester = createMediaRetryRequester;
const media_retry_1 = require("../../media/crypto/media-retry");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const global_1 = require("../../transport/node/builders/global");
const helpers_1 = require("../../transport/node/helpers");
const collections_1 = require("../../util/collections");
const primitives_1 = require("../../util/primitives");
function parseMediaRetryNotification(node) {
    const messageId = node.attrs.id;
    if (!messageId) {
        return null;
    }
    const from = node.attrs.from;
    const errorNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.ERROR);
    if (errorNode) {
        const errorCode = (0, primitives_1.parseOptionalInt)(errorNode.attrs.code);
        return errorCode === undefined ? null : { messageId, from, errorCode };
    }
    const encryptNode = (0, helpers_1.findNodeChild)(node, 'encrypt');
    if (!encryptNode) {
        return null;
    }
    const ciphertext = (0, helpers_1.getNodeBytesContent)((0, helpers_1.findNodeChild)(encryptNode, 'enc_p'));
    const iv = (0, helpers_1.getNodeBytesContent)((0, helpers_1.findNodeChild)(encryptNode, 'enc_iv'));
    if (!ciphertext?.byteLength || !iv || iv.byteLength !== media_retry_1.MEDIA_RETRY_IV_SIZE) {
        return null;
    }
    return { messageId, from, ciphertext, iv };
}
function toResultType(code) {
    switch (code) {
        case _proto_1.proto.MediaRetryNotification.ResultType.SUCCESS:
            return 'success';
        case _proto_1.proto.MediaRetryNotification.ResultType.NOT_FOUND:
            return 'not_found';
        case _proto_1.proto.MediaRetryNotification.ResultType.DECRYPTION_ERROR:
            return 'decryption_error';
        default:
            return 'general_error';
    }
}
function createMediaRetryRequester(options) {
    const { logger, sendNode, getCurrentCredentials } = options;
    const defaultTimeoutMs = options.defaultTimeoutMs ?? constants_1.WA_DEFAULTS.MEDIA_RETRY_TIMEOUT_MS;
    const maxPending = options.maxPending ?? constants_1.WA_DEFAULTS.MAX_PENDING_MEDIA_RETRIES;
    const pending = new Map();
    const takePending = (messageId) => {
        const entry = pending.get(messageId);
        if (!entry) {
            return undefined;
        }
        clearTimeout(entry.timeout);
        pending.delete(messageId);
        return entry;
    };
    const rejectPending = (messageId, error) => {
        takePending(messageId)?.reject(error);
    };
    const settle = (result) => {
        const entry = takePending(result.messageId);
        if (!entry) {
            return;
        }
        logger.debug('media reupload resolved', {
            id: result.messageId,
            result: result.result,
            hasDirectPath: result.directPath !== undefined
        });
        entry.resolve(result);
    };
    const buildRequestNode = async (input) => {
        const credentials = getCurrentCredentials();
        const ownJid = credentials?.meLid ?? credentials?.meJid;
        if (!ownJid) {
            throw new Error('media reupload request requires a paired session');
        }
        const { ciphertext, iv } = await (0, media_retry_1.encryptServerErrorReceipt)(input.mediaKey, input.messageId);
        return (0, global_1.buildReceiptNode)({
            kind: 'server_error',
            id: input.messageId,
            to: (0, jid_1.toUserJid)(ownJid),
            encryptCiphertext: ciphertext,
            encryptIv: iv,
            rmrJid: input.chatJid,
            rmrFromMe: input.fromMe,
            rmrParticipant: input.participant && (0, jid_1.isGroupOrBroadcastJid)(input.chatJid)
                ? (0, jid_1.toUserJid)(input.participant)
                : undefined
        });
    };
    const trackPending = (input) => {
        const timeoutMs = input.timeoutMs ?? defaultTimeoutMs;
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const timeout = setTimeout(() => {
            rejectPending(input.messageId, new Error(`media reupload timeout (${input.messageId}) after ${timeoutMs}ms`));
        }, timeoutMs);
        const entry = {
            mediaKey: input.mediaKey,
            promise,
            resolve,
            reject,
            timeout
        };
        (0, collections_1.setBoundedMapEntry)(pending, input.messageId, entry, maxPending, (evictedKey, evicted) => {
            clearTimeout(evicted.timeout);
            logger.warn('media reupload pending entry evicted: capacity reached', {
                evictedId: evictedKey,
                maxPending
            });
            evicted.reject(new Error(`media reupload evicted from pending map (id=${evictedKey})`));
        });
        return entry;
    };
    return {
        request: async (input) => {
            if (!input.messageId) {
                throw new Error('media reupload request requires a message id');
            }
            if (!input.chatJid) {
                throw new Error('media reupload request requires a chat jid');
            }
            const inFlight = pending.get(input.messageId);
            if (inFlight) {
                return inFlight.promise;
            }
            const entry = trackPending(input);
            buildRequestNode(input)
                .then((node) => sendNode(node))
                .catch((error) => {
                rejectPending(input.messageId, (0, primitives_1.toError)(error));
            });
            return entry.promise;
        },
        handleNotification: (node) => {
            const notificationLogger = logger.child({ id: node.attrs.id });
            const parsed = parseMediaRetryNotification(node);
            if (!parsed) {
                notificationLogger.warn('failed to parse mediaretry notification', {
                    from: node.attrs.from
                });
                return;
            }
            const entry = pending.get(parsed.messageId);
            if (!entry) {
                notificationLogger.debug('mediaretry notification without a pending request');
                return;
            }
            const credentials = getCurrentCredentials();
            if (parsed.from &&
                !(0, jid_1.isOwnAccountJid)(parsed.from, credentials?.meJid, credentials?.meLid)) {
                notificationLogger.warn('mediaretry notification did not come from this account', {
                    from: parsed.from
                });
            }
            if (parsed.ciphertext === undefined) {
                settle({
                    messageId: parsed.messageId,
                    result: toResultType(parsed.errorCode),
                    resultCode: parsed.errorCode
                });
                return;
            }
            let result;
            try {
                const decoded = (0, media_retry_1.decryptMediaRetryNotification)({
                    mediaKey: entry.mediaKey,
                    ciphertext: parsed.ciphertext,
                    iv: parsed.iv,
                    stanzaId: parsed.messageId
                });
                if (decoded.stanzaId !== parsed.messageId) {
                    throw new Error(`mediaretry stanza id mismatch: sealed ${String(decoded.stanzaId)}`);
                }
                result = {
                    messageId: parsed.messageId,
                    result: toResultType(decoded.result),
                    resultCode: decoded.result ?? _proto_1.proto.MediaRetryNotification.ResultType.GENERAL_ERROR,
                    directPath: decoded.directPath ?? undefined
                };
            }
            catch (error) {
                const normalized = (0, primitives_1.toError)(error);
                notificationLogger.warn('failed to open mediaretry notification', {
                    message: normalized.message
                });
                rejectPending(parsed.messageId, normalized);
                return;
            }
            settle(result);
        }
    };
}
