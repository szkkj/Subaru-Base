"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaIncomingNodeCoordinator = void 0;
const chatstate_1 = require("../events/chatstate");
const incoming_1 = require("../events/incoming");
const offline_1 = require("../events/offline");
const presence_1 = require("../events/presence");
const constants_1 = require("../../protocol/constants");
const helpers_1 = require("../../transport/node/helpers");
const parse_1 = require("../../transport/stream/parse");
const primitives_1 = require("../../util/primitives");
const INFO_BULLETIN_CHILD_TAGS = new Set([
    'offline',
    'offline_preview',
    'priority_offline_complete',
    'tos',
    'thread_metadata',
    'client_expiration'
]);
const FILTER_PROTECTED_TAGS = new Set([constants_1.WA_NODE_TAGS.SUCCESS, 'failure']);
class WaIncomingNodeCoordinator {
    constructor(options) {
        this.logger = options.logger;
        this.runtime = options.runtime;
        this.offlineResume = options.offlineResume;
        this.nodeHandlerRegistry = new Map();
        this.stanzaFilters = [];
        this.registerDefaultIncomingHandlers();
        this.mediaConnWarmupPromise = null;
    }
    async handleIncomingNode(node) {
        this.logger.trace('wa client incoming node', {
            tag: node.tag,
            id: node.attrs.id,
            type: node.attrs.type
        });
        if (node.attrs.offline !== undefined) {
            this.offlineResume.trackOfflineStanza();
        }
        const streamControlResult = (0, parse_1.parseStreamControlNode)(node);
        if (streamControlResult) {
            await this.runtime.handleStreamControlResult(streamControlResult);
            return;
        }
        if (await this.applyStanzaFilters(node)) {
            return;
        }
        if (await this.handleSuccessNode(node)) {
            return;
        }
        if (await this.handleInfoBulletinNode(node)) {
            return;
        }
        const handled = await this.dispatchIncomingNode(node);
        if (handled) {
            return;
        }
        this.runtime.emitUnhandledIncomingNode((0, incoming_1.createUnhandledIncomingNodeEvent)(node));
    }
    registerIncomingStanzaFilter(filter) {
        this.stanzaFilters.push(filter);
        return () => {
            const index = this.stanzaFilters.indexOf(filter);
            if (index !== -1) {
                this.stanzaFilters.splice(index, 1);
            }
        };
    }
    async applyStanzaFilters(node) {
        if (this.stanzaFilters.length === 0 || FILTER_PROTECTED_TAGS.has(node.tag)) {
            return false;
        }
        const filterLogger = this.logger.child({ tag: node.tag, id: node.attrs.id });
        for (let i = 0; i < this.stanzaFilters.length; i += 1) {
            let verdict;
            try {
                verdict = await this.stanzaFilters[i](node);
            }
            catch (error) {
                filterLogger.warn('incoming stanza filter threw', {
                    message: (0, primitives_1.toError)(error).message
                });
                continue;
            }
            if (!verdict) {
                continue;
            }
            filterLogger.trace('incoming stanza dropped by filter', {
                type: node.attrs.type,
                from: node.attrs.from
            });
            const ack = (0, incoming_1.buildInboundAck)(node);
            if (ack) {
                await (0, incoming_1.sendSafeAck)(this.logger, this.runtime.sendNode, ack);
            }
            return true;
        }
        return false;
    }
    registerIncomingHandler(registration) {
        const handlersByTag = this.nodeHandlerRegistry.get(registration.tag);
        const entry = {
            subtype: registration.subtype,
            handler: registration.handler
        };
        if (!handlersByTag) {
            this.nodeHandlerRegistry.set(registration.tag, [entry]);
        }
        else if (registration.prepend) {
            handlersByTag.unshift(entry);
        }
        else {
            handlersByTag.push(entry);
        }
        return () => {
            this.unregisterIncomingHandler(registration);
        };
    }
    unregisterIncomingHandler(registration) {
        const handlersByTag = this.nodeHandlerRegistry.get(registration.tag);
        if (!handlersByTag || handlersByTag.length === 0) {
            return false;
        }
        const index = handlersByTag.findIndex((entry) => entry.subtype === registration.subtype && entry.handler === registration.handler);
        if (index === -1) {
            return false;
        }
        handlersByTag.splice(index, 1);
        if (handlersByTag.length === 0) {
            this.nodeHandlerRegistry.delete(registration.tag);
        }
        return true;
    }
    async dispatchIncomingNode(node) {
        const handlersByTag = this.nodeHandlerRegistry.get(node.tag);
        const nodeSubtype = node.attrs.type;
        if (node.tag === constants_1.WA_MESSAGE_TAGS.RECEIPT) {
            if (handlersByTag && handlersByTag.length > 0) {
                for (const entry of handlersByTag) {
                    if (entry.subtype !== undefined && entry.subtype !== nodeSubtype) {
                        continue;
                    }
                    if (await entry.handler(node)) {
                        if (!this.isRetryReceiptType(nodeSubtype)) {
                            this.runtime.tryResolvePendingNode(node);
                        }
                        return true;
                    }
                }
            }
            return this.runtime.tryResolvePendingNode(node);
        }
        if (this.runtime.tryResolvePendingNode(node)) {
            return true;
        }
        const genericHandled = await this.runtime.handleGenericIncomingNode(node);
        if (genericHandled) {
            return true;
        }
        if (!handlersByTag || handlersByTag.length === 0) {
            return false;
        }
        for (const entry of handlersByTag) {
            if (entry.subtype !== undefined && entry.subtype !== nodeSubtype) {
                continue;
            }
            if (await entry.handler(node)) {
                return true;
            }
        }
        return false;
    }
    isRetryReceiptType(type) {
        return (type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY ||
            type === constants_1.WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY);
    }
    registerDefaultIncomingHandlers() {
        const runtime = this.runtime;
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.IQ,
            subtype: constants_1.WA_IQ_TYPES.SET,
            handler: runtime.handleIncomingIqSetNode
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.NOTIFICATION,
            handler: runtime.handleLinkCodeNotificationNode
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.NOTIFICATION,
            subtype: constants_1.WA_SIGNALING.COMPANION_REG_REFRESH_NOTIFICATION,
            handler: runtime.handleCompanionRegRefreshNotificationNode
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.NOTIFICATION,
            subtype: constants_1.WA_NOTIFICATION_TYPES.GROUP,
            handler: (0, incoming_1.createIncomingGroupNotificationHandler)({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitGroupEvent: runtime.emitGroupEvent,
                emitUnhandledStanza: runtime.emitUnhandledIncomingNode
            })
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.NOTIFICATION,
            subtype: constants_1.WA_NOTIFICATION_TYPES.BUSINESS,
            handler: (0, incoming_1.createIncomingBusinessNotificationHandler)({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitBusinessEvent: runtime.emitBusinessEvent,
                emitUnhandledStanza: runtime.emitUnhandledIncomingNode
            })
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.NOTIFICATION,
            subtype: constants_1.WA_NOTIFICATION_TYPES.PICTURE,
            handler: (0, incoming_1.createIncomingPictureNotificationHandler)({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitPictureEvent: runtime.emitPictureEvent,
                emitUnhandledStanza: runtime.emitUnhandledIncomingNode
            })
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.NOTIFICATION,
            subtype: constants_1.WA_NOTIFICATION_TYPES.REGISTRATION,
            handler: (0, incoming_1.createIncomingRegistrationNotificationHandler)({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitRegistrationCode: runtime.emitRegistrationCode,
                emitAccountTakeoverNotice: runtime.emitAccountTakeoverNotice
            })
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.NOTIFICATION,
            handler: (0, incoming_1.createIncomingNotificationHandler)({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitIncomingNotification: runtime.emitIncomingNotification,
                emitMexNotification: runtime.emitMexNotification,
                emitUnhandledStanza: runtime.emitUnhandledIncomingNode,
                syncAppState: runtime.syncAppState,
                handleMediaRetryNotification: runtime.handleMediaRetryNotification
            })
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_MESSAGE_TAGS.MESSAGE,
            handler: runtime.handleIncomingMessageNode
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_MESSAGE_TAGS.RECEIPT,
            handler: (0, incoming_1.createIncomingReceiptHandler)({
                logger: this.logger,
                sendNode: runtime.sendNode,
                handleIncomingRetryReceipt: runtime.handleIncomingRetryReceipt,
                trackOutboundReceipt: runtime.trackOutboundReceipt,
                emitIncomingReceipt: runtime.emitIncomingReceipt
            })
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.PRESENCE,
            // eslint-disable-next-line @typescript-eslint/require-await
            handler: async (node) => {
                runtime.emitIncomingPresence({
                    ...(0, incoming_1.createIncomingBaseEvent)(node),
                    ...(0, presence_1.parsePresenceNode)(node)
                });
                return true;
            }
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.CHATSTATE,
            // eslint-disable-next-line @typescript-eslint/require-await
            handler: async (node) => {
                const parsed = (0, chatstate_1.parseChatstateNode)(node);
                if (!parsed) {
                    return false;
                }
                runtime.emitIncomingChatstate({
                    ...(0, incoming_1.createIncomingBaseEvent)(node),
                    ...parsed
                });
                return true;
            }
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.CALL,
            handler: (0, incoming_1.createIncomingCallHandler)({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitIncomingCall: runtime.emitIncomingCall,
                getCurrentCredentials: runtime.getCurrentCredentials
            })
        });
        this.registerIncomingHandler({
            tag: 'failure',
            handler: (0, incoming_1.createIncomingFailureHandler)({
                logger: this.logger,
                emitIncomingFailure: runtime.emitIncomingFailure,
                stopComms: runtime.stopComms,
                disconnect: runtime.disconnect,
                clearStoredCredentials: runtime.clearStoredCredentials
            })
        });
        this.registerIncomingHandler({
            tag: constants_1.WA_NODE_TAGS.ERROR,
            // eslint-disable-next-line @typescript-eslint/require-await
            handler: async (node) => {
                runtime.emitIncomingErrorStanza({
                    ...(0, incoming_1.createIncomingBaseEvent)(node),
                    code: (0, primitives_1.parseOptionalInt)(node.attrs.code),
                    text: node.attrs.text
                });
                return true;
            }
        });
    }
    async handleSuccessNode(node) {
        if (node.tag !== constants_1.WA_NODE_TAGS.SUCCESS) {
            return false;
        }
        const persistAttributes = (0, parse_1.parseSuccessPersistAttributes)(node, (error) => {
            this.logger.warn('invalid companion_enc_static in success node', {
                message: error.message
            });
        });
        this.logger.info('received success node', {
            t: node.attrs.t,
            props: node.attrs.props,
            abprops: node.attrs.abprops,
            location: node.attrs.location,
            hasCompanionEncStatic: persistAttributes.companionEncStatic !== undefined,
            meLid: persistAttributes.meLid,
            meDisplayName: persistAttributes.meDisplayName
        });
        this.runtime.emitSuccessNode(node);
        if (persistAttributes.lastSuccessTs !== undefined) {
            this.runtime.updateClockSkewFromSuccess(persistAttributes.lastSuccessTs);
        }
        await this.runtime.persistSuccessAttributes(persistAttributes);
        this.scheduleMediaConnWarmup();
        return true;
    }
    scheduleMediaConnWarmup() {
        if (this.mediaConnWarmupPromise) {
            return;
        }
        this.mediaConnWarmupPromise = (async () => {
            try {
                if (!this.runtime.shouldWarmupMediaConn()) {
                    return;
                }
                await this.runtime.warmupMediaConn();
                this.logger.debug('post-login media_conn warmup completed');
            }
            catch (error) {
                this.logger.warn('post-login media_conn warmup failed', {
                    message: (0, primitives_1.toError)(error).message
                });
            }
            finally {
                this.mediaConnWarmupPromise = null;
            }
        })();
    }
    async handleInfoBulletinNode(node) {
        if (node.tag !== constants_1.WA_NODE_TAGS.INFO_BULLETIN) {
            return false;
        }
        let handled = false;
        const children = (0, helpers_1.getNodeChildren)(node);
        for (const child of children) {
            if (INFO_BULLETIN_CHILD_TAGS.has(child.tag)) {
                this.runtime.emitIncomingNotification((0, incoming_1.createInfoBulletinNotificationEvent)(node, child.tag, {
                    count: (0, primitives_1.parseOptionalInt)(child.attrs.count),
                    message: (0, primitives_1.parseOptionalInt)(child.attrs.message),
                    receipt: (0, primitives_1.parseOptionalInt)(child.attrs.receipt),
                    notification: (0, primitives_1.parseOptionalInt)(child.attrs.notification),
                    t: (0, primitives_1.parseOptionalInt)(child.attrs.t)
                }));
                if (child.tag === 'offline_preview') {
                    this.offlineResume.handleOfflinePreview((0, primitives_1.parseOptionalInt)(child.attrs.count) ?? 0);
                }
                if (child.tag === 'offline') {
                    this.offlineResume.handleOfflineComplete((0, primitives_1.parseOptionalInt)(child.attrs.count) ?? 0);
                }
                if (child.tag === 'thread_metadata') {
                    this.runtime.emitOfflineThreadMetadata((0, offline_1.parseOfflineThreadMetadata)(child));
                }
                handled = true;
            }
        }
        const edgeRoutingNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.EDGE_ROUTING);
        if (edgeRoutingNode) {
            const routingInfoNode = (0, helpers_1.findNodeChild)(edgeRoutingNode, constants_1.WA_NODE_TAGS.ROUTING_INFO);
            if (routingInfoNode) {
                try {
                    const routingInfo = (0, helpers_1.decodeNodeContentBase64OrBytes)(routingInfoNode.content, `ib.${constants_1.WA_NODE_TAGS.EDGE_ROUTING}.${constants_1.WA_NODE_TAGS.ROUTING_INFO}`);
                    await this.runtime.persistRoutingInfo(routingInfo);
                    this.logger.debug('updated routing info from info bulletin', {
                        byteLength: routingInfo.byteLength
                    });
                }
                catch (error) {
                    this.logger.warn('failed to process routing info from info bulletin', {
                        message: (0, primitives_1.toError)(error).message
                    });
                }
            }
            handled = true;
        }
        const dirtyNodes = (0, helpers_1.getNodeChildrenByTag)(node, constants_1.WA_NODE_TAGS.DIRTY);
        const dirtyBits = this.runtime.parseDirtyBits(dirtyNodes);
        if (dirtyBits.length > 0) {
            void this.runtime.handleDirtyBits(dirtyBits).catch((error) => {
                this.logger.warn('dirty bits sync failed', {
                    message: (0, primitives_1.toError)(error).message
                });
            });
            handled = true;
        }
        return handled;
    }
}
exports.WaIncomingNodeCoordinator = WaIncomingNodeCoordinator;
