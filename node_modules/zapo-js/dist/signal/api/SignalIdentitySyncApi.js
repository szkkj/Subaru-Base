"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalIdentitySyncApi = void 0;
const keys_1 = require("../../crypto/core/keys");
const PromiseDedup_1 = require("../../infra/perf/PromiseDedup");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const codec_1 = require("../api/codec");
const constants_2 = require("../api/constants");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
/**
 * Fetches identity keys for a list of JIDs from the server and persists them
 * into the identity store. Concurrent calls for the same JID set are
 * deduplicated.
 */
class SignalIdentitySyncApi {
    constructor(options) {
        this.syncDedup = new PromiseDedup_1.PromiseDedup();
        this.logger = options.logger;
        this.query = options.query;
        this.identityStore = options.identityStore;
        this.defaultTimeoutMs =
            options.defaultTimeoutMs ?? constants_1.WA_DEFAULTS.SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS;
        this.hostDomain = options.hostDomain ?? constants_1.WA_DEFAULTS.HOST_DOMAIN;
    }
    /**
     * Fetches and persists identity keys for `targetJids`. Returns one entry
     * per JID the server resolved; missing/erroring users are skipped.
     */
    syncIdentityKeys(targetJids, timeoutMs = this.defaultTimeoutMs) {
        const dedupKey = `${timeoutMs}:${targetJids.join(',')}`;
        return this.syncDedup.run(dedupKey, () => this.syncIdentityKeysInternal(targetJids, timeoutMs));
    }
    async syncIdentityKeysInternal(targetJids, timeoutMs) {
        const normalizedTargets = new Array(targetJids.length);
        let normalizedTargetsCount = 0;
        const dedup = new Set();
        for (let index = 0; index < targetJids.length; index += 1) {
            const normalized = (0, jid_1.canonicalizeSignalJid)(targetJids[index], this.hostDomain);
            if (dedup.has(normalized)) {
                continue;
            }
            dedup.add(normalized);
            normalizedTargets[normalizedTargetsCount] = normalized;
            normalizedTargetsCount += 1;
        }
        normalizedTargets.length = normalizedTargetsCount;
        if (normalizedTargets.length === 0) {
            return [];
        }
        const users = new Array(normalizedTargets.length);
        for (let index = 0; index < normalizedTargets.length; index += 1) {
            users[index] = {
                tag: constants_1.WA_NODE_TAGS.USER,
                attrs: {
                    jid: normalizedTargets[index]
                }
            };
        }
        this.logger.debug('signal identity sync request', {
            targets: normalizedTargets.length,
            timeoutMs
        });
        const response = await this.query({
            tag: constants_1.WA_NODE_TAGS.IQ,
            attrs: {
                type: constants_1.WA_IQ_TYPES.GET,
                xmlns: constants_1.WA_XMLNS.SIGNAL,
                to: this.hostDomain
            },
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.IDENTITY,
                    attrs: {},
                    content: users
                }
            ]
        }, timeoutMs);
        const entries = this.parseIdentitySyncResponse(response, normalizedTargets);
        const { identityStore } = this;
        if (identityStore && entries.length > 0) {
            const identities = new Array(entries.length);
            for (let index = 0; index < entries.length; index += 1) {
                const entry = entries[index];
                identities[index] = {
                    address: (0, jid_1.parseSignalAddressFromJid)(entry.jid),
                    identityKey: (0, keys_1.toSerializedPubKey)(entry.identity)
                };
            }
            await identityStore.setRemoteIdentities(identities);
        }
        this.logger.debug('signal identity sync success', {
            requested: normalizedTargets.length,
            synced: entries.length
        });
        return entries;
    }
    parseIdentitySyncResponse(node, requestedJids) {
        (0, query_1.assertIqResult)(node, 'identity sync');
        const listNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.LIST);
        if (!listNode) {
            throw new Error('identity sync response missing list node');
        }
        const requested = new Set(requestedJids);
        const userNodes = (0, helpers_1.getNodeChildrenByTag)(listNode, constants_1.WA_NODE_TAGS.USER);
        const parsed = new Array(userNodes.length);
        let parsedCount = 0;
        for (let index = 0; index < userNodes.length; index += 1) {
            const userNode = userNodes[index];
            const jid = userNode.attrs.jid
                ? (0, jid_1.canonicalizeSignalJid)(userNode.attrs.jid, this.hostDomain)
                : '';
            if (!jid || !requested.has(jid)) {
                continue;
            }
            const errorNode = (0, helpers_1.findNodeChild)(userNode, constants_1.WA_NODE_TAGS.ERROR);
            if (errorNode) {
                this.logger.warn('signal identity sync user error', {
                    jid,
                    code: errorNode.attrs.code,
                    text: errorNode.attrs.text
                });
                continue;
            }
            const identityNode = (0, helpers_1.findNodeChild)(userNode, constants_1.WA_NODE_TAGS.IDENTITY);
            if (!identityNode) {
                throw new Error(`identity sync user missing identity node for ${jid}`);
            }
            const typeNode = (0, helpers_1.findNodeChild)(userNode, constants_1.WA_NODE_TAGS.TYPE);
            const identity = (0, codec_1.decodeExactLength)(identityNode.content, 'identity sync identity', constants_2.SIGNAL_KEY_DATA_LENGTH);
            const parsedType = typeNode
                ? (0, codec_1.parseUint)((0, codec_1.decodeExactLength)(typeNode.content, 'identity sync type', constants_2.SIGNAL_KEY_BUNDLE_TYPE_LENGTH), 'identity sync type')
                : undefined;
            if (parsedType === undefined) {
                parsed[parsedCount] = {
                    jid,
                    identity
                };
                parsedCount += 1;
                continue;
            }
            parsed[parsedCount] = {
                jid,
                identity,
                type: parsedType
            };
            parsedCount += 1;
        }
        parsed.length = parsedCount;
        return parsed;
    }
}
exports.SignalIdentitySyncApi = SignalIdentitySyncApi;
