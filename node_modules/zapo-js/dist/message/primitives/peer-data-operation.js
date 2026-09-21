"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPeerDataOperationRequester = createPeerDataOperationRequester;
const _proto_1 = require("../../proto");
const jid_1 = require("../../protocol/jid");
const collections_1 = require("../../util/collections");
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_PENDING = 256;
function buildRequestProtocolMessage(type, body) {
    return {
        type: _proto_1.proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_MESSAGE,
        peerDataOperationRequestMessage: {
            ...body,
            peerDataOperationRequestType: type
        }
    };
}
function createPeerDataOperationRequester(options) {
    const { logger, publishProtocolMessageToDevice, getCurrentCredentials, generateOutgoingMessageId, subscribeToProtocolMessage } = options;
    const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxPending = options.maxPending ?? DEFAULT_MAX_PENDING;
    const pending = new Map();
    subscribeToProtocolMessage((event) => {
        const protocolMessage = event.protocolMessage;
        if (protocolMessage.type !==
            _proto_1.proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_RESPONSE_MESSAGE) {
            return;
        }
        const response = protocolMessage.peerDataOperationRequestResponseMessage;
        if (!response) {
            return;
        }
        const stanzaId = response.stanzaId;
        const results = response.peerDataOperationResult ?? [];
        if (!stanzaId) {
            logger.debug('pdo response without stanzaId', {
                from: event.key.remoteJid,
                resultCount: results.length
            });
            return;
        }
        const entry = pending.get(stanzaId);
        if (!entry) {
            logger.debug('pdo response for unknown stanzaId', {
                stanzaId,
                resultCount: results.length
            });
            return;
        }
        clearTimeout(entry.timeout);
        pending.delete(stanzaId);
        entry.resolve(results);
    });
    const publish = async (type, body, id) => {
        const meJid = getCurrentCredentials()?.meJid;
        if (!meJid) {
            throw new Error('peer data operation requires current me jid');
        }
        const result = await publishProtocolMessageToDevice((0, jid_1.toUserJid)(meJid), buildRequestProtocolMessage(type, body), { id, pushPriority: 'high_force' });
        return result.id;
    };
    return {
        request: async (type, body, requestOptions) => {
            const messageId = await generateOutgoingMessageId();
            const timeoutMs = requestOptions?.timeoutMs ?? defaultTimeoutMs;
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (!pending.delete(messageId)) {
                        return;
                    }
                    logger.debug('pdo request timed out', { messageId, timeoutMs, type });
                    reject(new Error(`peer data operation timed out after ${timeoutMs}ms (id=${messageId})`));
                }, timeoutMs);
                const entry = { resolve, reject, timeout };
                (0, collections_1.setBoundedMapEntry)(pending, messageId, entry, maxPending, (evictedKey, evicted) => {
                    clearTimeout(evicted.timeout);
                    logger.warn('pdo pending entry evicted: capacity reached', {
                        evictedId: evictedKey,
                        maxPending
                    });
                    evicted.reject(new Error(`peer data operation evicted from pending map (id=${String(evictedKey)})`));
                });
                publish(type, body, messageId).catch((error) => {
                    clearTimeout(timeout);
                    if (pending.delete(messageId)) {
                        reject(error instanceof Error ? error : new Error(String(error)));
                    }
                });
            });
        },
        send: async (type, body) => {
            const messageId = await generateOutgoingMessageId();
            return { messageId: await publish(type, body, messageId) };
        }
    };
}
