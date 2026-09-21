import { parseChatstateNode } from '../events/chatstate.js';
import { buildInboundAck, createIncomingBaseEvent, createIncomingBusinessNotificationHandler, createIncomingCallHandler, createIncomingFailureHandler, createIncomingGroupNotificationHandler, createIncomingNotificationHandler, createIncomingPictureNotificationHandler, createIncomingReceiptHandler, createIncomingRegistrationNotificationHandler, createInfoBulletinNotificationEvent, createUnhandledIncomingNodeEvent, sendSafeAck } from '../events/incoming.js';
import { parseOfflineThreadMetadata } from '../events/offline.js';
import { parsePresenceNode } from '../events/presence.js';
import { WA_IQ_TYPES, WA_MESSAGE_TAGS, WA_MESSAGE_TYPES, WA_NODE_TAGS, WA_NOTIFICATION_TYPES, WA_SIGNALING } from '../../protocol/constants.js';
import { decodeNodeContentBase64OrBytes, findNodeChild, getNodeChildren, getNodeChildrenByTag } from '../../transport/node/helpers.js';
import { parseStreamControlNode, parseSuccessPersistAttributes } from '../../transport/stream/parse.js';
import { parseOptionalInt, toError } from '../../util/primitives.js';
const INFO_BULLETIN_CHILD_TAGS = new Set([
    'offline',
    'offline_preview',
    'priority_offline_complete',
    'tos',
    'thread_metadata',
    'client_expiration'
]);
const FILTER_PROTECTED_TAGS = new Set([WA_NODE_TAGS.SUCCESS, 'failure']);
export class WaIncomingNodeCoordinator {
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
        const streamControlResult = parseStreamControlNode(node);
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
        this.runtime.emitUnhandledIncomingNode(createUnhandledIncomingNodeEvent(node));
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
                    message: toError(error).message
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
            const ack = buildInboundAck(node);
            if (ack) {
                await sendSafeAck(this.logger, this.runtime.sendNode, ack);
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
        if (node.tag === WA_MESSAGE_TAGS.RECEIPT) {
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
        return (type === WA_MESSAGE_TYPES.RECEIPT_TYPE_RETRY ||
            type === WA_MESSAGE_TYPES.RECEIPT_TYPE_ENC_REKEY_RETRY);
    }
    registerDefaultIncomingHandlers() {
        const runtime = this.runtime;
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.IQ,
            subtype: WA_IQ_TYPES.SET,
            handler: runtime.handleIncomingIqSetNode
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.NOTIFICATION,
            handler: runtime.handleLinkCodeNotificationNode
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.NOTIFICATION,
            subtype: WA_SIGNALING.COMPANION_REG_REFRESH_NOTIFICATION,
            handler: runtime.handleCompanionRegRefreshNotificationNode
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.NOTIFICATION,
            subtype: WA_NOTIFICATION_TYPES.GROUP,
            handler: createIncomingGroupNotificationHandler({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitGroupEvent: runtime.emitGroupEvent,
                emitUnhandledStanza: runtime.emitUnhandledIncomingNode
            })
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.NOTIFICATION,
            subtype: WA_NOTIFICATION_TYPES.BUSINESS,
            handler: createIncomingBusinessNotificationHandler({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitBusinessEvent: runtime.emitBusinessEvent,
                emitUnhandledStanza: runtime.emitUnhandledIncomingNode
            })
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.NOTIFICATION,
            subtype: WA_NOTIFICATION_TYPES.PICTURE,
            handler: createIncomingPictureNotificationHandler({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitPictureEvent: runtime.emitPictureEvent,
                emitUnhandledStanza: runtime.emitUnhandledIncomingNode
            })
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.NOTIFICATION,
            subtype: WA_NOTIFICATION_TYPES.REGISTRATION,
            handler: createIncomingRegistrationNotificationHandler({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitRegistrationCode: runtime.emitRegistrationCode,
                emitAccountTakeoverNotice: runtime.emitAccountTakeoverNotice
            })
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.NOTIFICATION,
            handler: createIncomingNotificationHandler({
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
            tag: WA_MESSAGE_TAGS.MESSAGE,
            handler: runtime.handleIncomingMessageNode
        });
        this.registerIncomingHandler({
            tag: WA_MESSAGE_TAGS.RECEIPT,
            handler: createIncomingReceiptHandler({
                logger: this.logger,
                sendNode: runtime.sendNode,
                handleIncomingRetryReceipt: runtime.handleIncomingRetryReceipt,
                trackOutboundReceipt: runtime.trackOutboundReceipt,
                emitIncomingReceipt: runtime.emitIncomingReceipt
            })
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.PRESENCE,
            // eslint-disable-next-line @typescript-eslint/require-await
            handler: async (node) => {
                runtime.emitIncomingPresence({
                    ...createIncomingBaseEvent(node),
                    ...parsePresenceNode(node)
                });
                return true;
            }
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.CHATSTATE,
            // eslint-disable-next-line @typescript-eslint/require-await
            handler: async (node) => {
                const parsed = parseChatstateNode(node);
                if (!parsed) {
                    return false;
                }
                runtime.emitIncomingChatstate({
                    ...createIncomingBaseEvent(node),
                    ...parsed
                });
                return true;
            }
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.CALL,
            handler: createIncomingCallHandler({
                logger: this.logger,
                sendNode: runtime.sendNode,
                emitIncomingCall: runtime.emitIncomingCall,
                getCurrentCredentials: runtime.getCurrentCredentials
            })
        });
        this.registerIncomingHandler({
            tag: 'failure',
            handler: createIncomingFailureHandler({
                logger: this.logger,
                emitIncomingFailure: runtime.emitIncomingFailure,
                stopComms: runtime.stopComms,
                disconnect: runtime.disconnect,
                clearStoredCredentials: runtime.clearStoredCredentials
            })
        });
        this.registerIncomingHandler({
            tag: WA_NODE_TAGS.ERROR,
            // eslint-disable-next-line @typescript-eslint/require-await
            handler: async (node) => {
                runtime.emitIncomingErrorStanza({
                    ...createIncomingBaseEvent(node),
                    code: parseOptionalInt(node.attrs.code),
                    text: node.attrs.text
                });
                return true;
            }
        });
    }
    async handleSuccessNode(node) {
        if (node.tag !== WA_NODE_TAGS.SUCCESS) {
            return false;
        }
        const persistAttributes = parseSuccessPersistAttributes(node, (error) => {
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
                    message: toError(error).message
                });
            }
            finally {
                this.mediaConnWarmupPromise = null;
            }
        })();
    }
    async handleInfoBulletinNode(node) {
        if (node.tag !== WA_NODE_TAGS.INFO_BULLETIN) {
            return false;
        }
        let handled = false;
        const children = getNodeChildren(node);
        for (const child of children) {
            if (INFO_BULLETIN_CHILD_TAGS.has(child.tag)) {
                this.runtime.emitIncomingNotification(createInfoBulletinNotificationEvent(node, child.tag, {
                    count: parseOptionalInt(child.attrs.count),
                    message: parseOptionalInt(child.attrs.message),
                    receipt: parseOptionalInt(child.attrs.receipt),
                    notification: parseOptionalInt(child.attrs.notification),
                    t: parseOptionalInt(child.attrs.t)
                }));
                if (child.tag === 'offline_preview') {
                    this.offlineResume.handleOfflinePreview(parseOptionalInt(child.attrs.count) ?? 0);
                }
                if (child.tag === 'offline') {
                    this.offlineResume.handleOfflineComplete(parseOptionalInt(child.attrs.count) ?? 0);
                }
                if (child.tag === 'thread_metadata') {
                    this.runtime.emitOfflineThreadMetadata(parseOfflineThreadMetadata(child));
                }
                handled = true;
            }
        }
        const edgeRoutingNode = findNodeChild(node, WA_NODE_TAGS.EDGE_ROUTING);
        if (edgeRoutingNode) {
            const routingInfoNode = findNodeChild(edgeRoutingNode, WA_NODE_TAGS.ROUTING_INFO);
            if (routingInfoNode) {
                try {
                    const routingInfo = decodeNodeContentBase64OrBytes(routingInfoNode.content, `ib.${WA_NODE_TAGS.EDGE_ROUTING}.${WA_NODE_TAGS.ROUTING_INFO}`);
                    await this.runtime.persistRoutingInfo(routingInfo);
                    this.logger.debug('updated routing info from info bulletin', {
                        byteLength: routingInfo.byteLength
                    });
                }
                catch (error) {
                    this.logger.warn('failed to process routing info from info bulletin', {
                        message: toError(error).message
                    });
                }
            }
            handled = true;
        }
        const dirtyNodes = getNodeChildrenByTag(node, WA_NODE_TAGS.DIRTY);
        const dirtyBits = this.runtime.parseDirtyBits(dirtyNodes);
        if (dirtyBits.length > 0) {
            void this.runtime.handleDirtyBits(dirtyBits).catch((error) => {
                this.logger.warn('dirty bits sync failed', {
                    message: toError(error).message
                });
            });
            handled = true;
        }
        return handled;
    }
}
