"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaMessageClient = void 0;
const ack_1 = require("./primitives/ack");
const constants_1 = require("../protocol/constants");
const global_1 = require("../transport/node/builders/global");
const async_1 = require("../util/async");
const primitives_1 = require("../util/primitives");
const WA_RETRYABLE_PUBLISH_ERROR_RE = /timeout|socket|connection|closed/i;
class MessagePublishNackError extends Error {
    constructor(message, retryable) {
        super(message);
        this.name = 'MessagePublishNackError';
        this.retryable = retryable;
    }
}
/**
 * Low-level message-publishing client. Sends pre-built message/receipt nodes,
 * handles ack timeouts and retry on negative-ack failures, and is the
 * transport hook used by {@link WaMessageCoordinator}.
 */
class WaMessageClient {
    constructor(options) {
        this.logger = options.logger;
        this.sendNode = options.sendNode;
        this.query = options.query;
        this.defaultAckTimeoutMs = options.defaultAckTimeoutMs ?? constants_1.WA_DEFAULTS.MESSAGE_ACK_TIMEOUT_MS;
        this.defaultMaxAttempts = options.defaultMaxAttempts ?? constants_1.WA_DEFAULTS.MESSAGE_MAX_ATTEMPTS;
        this.defaultRetryDelayMs = options.defaultRetryDelayMs ?? constants_1.WA_DEFAULTS.MESSAGE_RETRY_DELAY_MS;
    }
    /**
     * Publishes a `<message>` stanza and awaits its ack/receipt, retrying on
     * retryable negative-ack errors up to `maxAttempts`. Returns the ack
     * metadata extracted from the server response.
     */
    async publishNode(node, options = {}) {
        if (node.tag !== constants_1.WA_MESSAGE_TAGS.MESSAGE) {
            throw new Error(`invalid node tag for message publish: ${node.tag}`);
        }
        const ackTimeoutMs = options.ackTimeoutMs ?? this.defaultAckTimeoutMs;
        const maxAttempts = options.maxAttempts ?? this.defaultMaxAttempts;
        const retryDelayMs = options.retryDelayMs ?? this.defaultRetryDelayMs;
        if (ackTimeoutMs < 1 || maxAttempts < 1 || retryDelayMs < 0) {
            throw new Error('invalid message publish options');
        }
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                this.logger.debug('message publish attempt', {
                    attempt,
                    maxAttempts,
                    to: node.attrs.to,
                    type: node.attrs.type,
                    id: node.attrs.id
                });
                const ackNode = await this.query(node, ackTimeoutMs);
                const id = ackNode.attrs.id;
                if (!id) {
                    throw new Error('message publish ack node missing id');
                }
                if (!(0, ack_1.isAckOrReceiptNode)(ackNode)) {
                    throw new Error(`unexpected publish response: ${(0, ack_1.describeAckNode)(ackNode)}`);
                }
                if ((0, ack_1.isNegativeAckNode)(ackNode)) {
                    throw new MessagePublishNackError(`negative publish ack: ${(0, ack_1.describeAckNode)(ackNode)}`, (0, ack_1.isRetryableNegativeAck)(ackNode));
                }
                if (attempt > 1) {
                    this.logger.info('message publish acknowledged after retry', {
                        id,
                        tag: ackNode.tag,
                        type: ackNode.attrs.type,
                        phash: ackNode.attrs.phash,
                        addressingMode: ackNode.attrs.addressing_mode,
                        attempts: attempt
                    });
                }
                else {
                    this.logger.trace('message publish acknowledged', {
                        id,
                        tag: ackNode.tag,
                        type: ackNode.attrs.type,
                        phash: ackNode.attrs.phash,
                        addressingMode: ackNode.attrs.addressing_mode
                    });
                }
                return {
                    id,
                    attempts: attempt,
                    ackNode,
                    ack: this.extractAckMetadata(ackNode)
                };
            }
            catch (error) {
                lastError = (0, primitives_1.toError)(error);
                const nackRetryable = error instanceof MessagePublishNackError ? error.retryable : false;
                const canRetry = attempt < maxAttempts &&
                    (this.isRetryablePublishError(lastError) || nackRetryable);
                if (canRetry) {
                    this.logger.debug('message publish attempt failed, will retry', {
                        attempt,
                        maxAttempts,
                        nackRetryable,
                        message: lastError.message
                    });
                    await (0, async_1.delay)(retryDelayMs * attempt);
                    continue;
                }
                this.logger.warn('message publish attempt failed', {
                    attempt,
                    maxAttempts,
                    nackRetryable,
                    message: lastError.message
                });
                throw lastError;
            }
        }
        throw lastError ?? new Error('message publish failed');
    }
    /** Builds the encrypted message envelope from `input` and publishes it via {@link publishNode}. */
    async publishEncrypted(input, options = {}) {
        const node = this.buildEncryptedMessageNode(input);
        return this.publishNode(node, options);
    }
    /** Fire-and-forget variant: sends a `<message>` stanza without awaiting an ack. */
    async sendMessageNode(node) {
        if (node.tag !== constants_1.WA_MESSAGE_TAGS.MESSAGE) {
            throw new Error(`invalid node tag for message send: ${node.tag}`);
        }
        this.logger.debug('message sent without waiting for ack', {
            to: node.attrs.to,
            type: node.attrs.type,
            id: node.attrs.id
        });
        await this.sendNode(node);
    }
    /** Builds and sends an encrypted message envelope without awaiting an ack. */
    async sendEncrypted(input) {
        const node = this.buildEncryptedMessageNode(input);
        await this.sendMessageNode(node);
    }
    buildEncryptedMessageNode(input) {
        const attrs = {
            to: input.to,
            type: input.type ?? 'text'
        };
        if (input.id) {
            attrs.id = input.id;
        }
        if (input.edit) {
            attrs.edit = input.edit;
        }
        if (input.category) {
            attrs.category = input.category;
        }
        if (input.pushPriority) {
            attrs.push_priority = input.pushPriority;
        }
        if (input.participant) {
            attrs.participant = input.participant;
        }
        if (input.addressingMode) {
            attrs.addressing_mode = input.addressingMode;
        }
        if (input.deviceFanout) {
            attrs.device_fanout = input.deviceFanout;
        }
        const encAttrs = {
            v: constants_1.WA_MESSAGE_TYPES.ENC_VERSION,
            type: input.encType
        };
        if (input.mediatype) {
            encAttrs.mediatype = input.mediatype;
        }
        if (input.encCount !== undefined && input.encCount > 0) {
            encAttrs.count = String(Math.trunc(input.encCount));
        }
        const content = [
            {
                tag: constants_1.WA_MESSAGE_TAGS.ENC,
                attrs: encAttrs,
                content: input.ciphertext
            }
        ];
        if (input.deviceIdentity) {
            content.push({
                tag: constants_1.WA_NODE_TAGS.DEVICE_IDENTITY,
                attrs: {},
                content: input.deviceIdentity
            });
        }
        if (input.metaNode) {
            content.push(input.metaNode);
        }
        if (input.privacyTokenNode) {
            content.push(input.privacyTokenNode);
        }
        const node = {
            tag: constants_1.WA_MESSAGE_TAGS.MESSAGE,
            attrs,
            content
        };
        return node;
    }
    /** Builds and sends a `<receipt>` stanza (delivery/read/played/etc.). */
    async sendReceipt(input) {
        const node = (0, global_1.buildReceiptNode)({
            kind: 'outbound',
            to: input.to,
            id: input.id,
            type: input.type ?? constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_READ,
            participant: input.participant,
            recipient: input.recipient,
            category: input.category,
            from: input.from,
            t: input.t,
            peerParticipantPn: input.peerParticipantPn,
            listIds: input.listIds,
            content: input.content ? [...input.content] : undefined
        });
        this.logger.debug('sending receipt node', {
            to: node.attrs.to,
            id: node.attrs.id,
            type: node.attrs.type
        });
        await this.sendNode(node);
    }
    isRetryablePublishError(error) {
        return WA_RETRYABLE_PUBLISH_ERROR_RE.test(error.message);
    }
    extractAckMetadata(ackNode) {
        const addressingModeRaw = ackNode.attrs.addressing_mode;
        const addressingMode = addressingModeRaw === constants_1.WA_ADDRESSING_MODES.PN ||
            addressingModeRaw === constants_1.WA_ADDRESSING_MODES.LID
            ? addressingModeRaw
            : undefined;
        return {
            t: ackNode.attrs.t,
            sync: ackNode.attrs.sync,
            phash: ackNode.attrs.phash,
            refreshLid: ackNode.attrs.refresh_lid === 'true',
            addressingMode,
            count: (0, primitives_1.parseOptionalInt)(ackNode.attrs.count),
            error: (0, primitives_1.parseOptionalInt)(ackNode.attrs.error)
        };
    }
}
exports.WaMessageClient = WaMessageClient;
