"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaNodeOrchestrator = void 0;
const constants_1 = require("../../protocol/constants");
const primitives_1 = require("../../util/primitives");
const helpers_1 = require("./helpers");
/**
 * Issues outgoing binary nodes and matches incoming responses back to their
 * caller's IQ promises by stanza id. Owns the per-process id generator and
 * the in-flight query timeout map.
 */
class WaNodeOrchestrator {
    constructor(options) {
        this.logger = options.logger;
        this.sendNodeFn = options.sendNode;
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? constants_1.WA_DEFAULTS.NODE_QUERY_TIMEOUT_MS;
        this.hostDomain = options.hostDomain ?? constants_1.WA_DEFAULTS.HOST_DOMAIN;
        this.mobileIqIdFormat = options.mobileIqIdFormat ?? (() => false);
        this.idGenerator = null;
        this.idGeneratorReady = null;
        this.pendingQueries = new Map();
    }
    hasPending() {
        return this.pendingQueries.size > 0;
    }
    clearPending(reason) {
        const count = this.pendingQueries.size;
        if (count === 0) {
            return;
        }
        this.logger.debug('clearing pending node queries', {
            count,
            reason: reason.message
        });
        for (const pending of this.pendingQueries.values()) {
            clearTimeout(pending.timer);
            pending.reject(reason);
        }
        this.pendingQueries.clear();
    }
    tryResolvePending(node) {
        const id = node.attrs.id;
        if (!id) {
            return false;
        }
        const pending = this.pendingQueries.get(id);
        if (!pending) {
            return false;
        }
        clearTimeout(pending.timer);
        this.pendingQueries.delete(id);
        this.logger.trace('resolved pending query node', {
            id,
            tag: node.tag,
            type: node.attrs.type
        });
        pending.resolve(node);
        return true;
    }
    async handleIncomingNode(node) {
        if (this.tryResolvePending(node)) {
            return true;
        }
        if (node.tag !== constants_1.WA_NODE_TAGS.IQ || node.attrs.type !== constants_1.WA_IQ_TYPES.GET) {
            return false;
        }
        const xmlns = node.attrs.xmlns;
        if (xmlns !== constants_1.WA_XMLNS.XMPP_PING && xmlns !== constants_1.WA_XMLNS.WHATSAPP_PING) {
            return false;
        }
        const attrs = {
            to: node.attrs.from ?? this.hostDomain,
            type: constants_1.WA_IQ_TYPES.RESULT
        };
        if (node.attrs.id) {
            attrs.id = node.attrs.id;
        }
        await this.sendNodeFn({
            tag: constants_1.WA_NODE_TAGS.IQ,
            attrs
        });
        this.logger.debug('auto-responded to ping iq', { id: node.attrs.id, xmlns });
        return true;
    }
    async sendNode(node, autoId = true) {
        const outbound = autoId ? await this.withAutoId(node) : node;
        await this.sendNodeFn(outbound);
    }
    async query(node, timeoutMs = this.defaultTimeoutMs, options = {}) {
        const outbound = await this.withAutoId(node, options.useSystemId === true);
        const id = outbound.attrs.id;
        if (!id) {
            throw new Error('query node id is required');
        }
        if (this.pendingQueries.has(id)) {
            throw new Error(`pending node id collision: ${id}`);
        }
        const queryLogger = this.logger.child({ id });
        queryLogger.debug('sending query node', {
            tag: outbound.tag,
            type: outbound.attrs.type,
            timeoutMs
        });
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingQueries.delete(id);
                queryLogger.warn('query node timeout', { timeoutMs });
                reject(new Error(`query timeout (${id}) after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pendingQueries.set(id, {
                resolve,
                reject,
                timer
            });
            this.sendNodeFn(outbound).catch((error) => {
                clearTimeout(timer);
                this.pendingQueries.delete(id);
                queryLogger.warn('failed to send query node', {
                    message: (0, primitives_1.toError)(error).message
                });
                reject((0, primitives_1.toError)(error));
            });
        });
    }
    async withAutoId(node, useSystemId = false) {
        if (node.attrs.id) {
            return node;
        }
        const generator = await this.getIdGenerator();
        const generatedId = useSystemId && generator.nextSystem ? generator.nextSystem() : generator.next();
        this.logger.trace('generated stanza id', { id: generatedId, system: useSystemId });
        return {
            ...node,
            attrs: {
                ...node.attrs,
                id: generatedId
            }
        };
    }
    async getIdGenerator() {
        if (this.idGenerator) {
            return this.idGenerator;
        }
        if (this.mobileIqIdFormat()) {
            this.idGenerator = (0, helpers_1.createMobileNodeIdGenerator)();
            this.logger.debug('generated stanza prefix (mobile)', {
                prefix: this.idGenerator.prefix
            });
            return this.idGenerator;
        }
        if (!this.idGeneratorReady) {
            this.idGeneratorReady = (0, helpers_1.createNodeIdGenerator)();
        }
        try {
            const generator = await this.idGeneratorReady;
            if (!this.idGenerator) {
                this.idGenerator = generator;
                this.logger.debug('generated stanza prefix', { prefix: generator.prefix });
            }
            return generator;
        }
        catch (error) {
            this.idGeneratorReady = null;
            throw (0, primitives_1.toError)(error);
        }
    }
}
exports.WaNodeOrchestrator = WaNodeOrchestrator;
