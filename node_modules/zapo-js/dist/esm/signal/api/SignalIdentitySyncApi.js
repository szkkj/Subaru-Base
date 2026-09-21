import { toSerializedPubKey } from '../../crypto/core/keys.js';
import { PromiseDedup } from '../../infra/perf/PromiseDedup.js';
import { WA_DEFAULTS, WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../protocol/constants.js';
import { canonicalizeSignalJid, parseSignalAddressFromJid } from '../../protocol/jid.js';
import { decodeExactLength, parseUint } from '../api/codec.js';
import { SIGNAL_KEY_BUNDLE_TYPE_LENGTH, SIGNAL_KEY_DATA_LENGTH } from '../api/constants.js';
import { findNodeChild, getNodeChildrenByTag } from '../../transport/node/helpers.js';
import { assertIqResult } from '../../transport/node/query.js';
/**
 * Fetches identity keys for a list of JIDs from the server and persists them
 * into the identity store. Concurrent calls for the same JID set are
 * deduplicated.
 */
export class SignalIdentitySyncApi {
    constructor(options) {
        this.syncDedup = new PromiseDedup();
        this.logger = options.logger;
        this.query = options.query;
        this.identityStore = options.identityStore;
        this.defaultTimeoutMs =
            options.defaultTimeoutMs ?? WA_DEFAULTS.SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS;
        this.hostDomain = options.hostDomain ?? WA_DEFAULTS.HOST_DOMAIN;
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
            const normalized = canonicalizeSignalJid(targetJids[index], this.hostDomain);
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
                tag: WA_NODE_TAGS.USER,
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
            tag: WA_NODE_TAGS.IQ,
            attrs: {
                type: WA_IQ_TYPES.GET,
                xmlns: WA_XMLNS.SIGNAL,
                to: this.hostDomain
            },
            content: [
                {
                    tag: WA_NODE_TAGS.IDENTITY,
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
                    address: parseSignalAddressFromJid(entry.jid),
                    identityKey: toSerializedPubKey(entry.identity)
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
        assertIqResult(node, 'identity sync');
        const listNode = findNodeChild(node, WA_NODE_TAGS.LIST);
        if (!listNode) {
            throw new Error('identity sync response missing list node');
        }
        const requested = new Set(requestedJids);
        const userNodes = getNodeChildrenByTag(listNode, WA_NODE_TAGS.USER);
        const parsed = new Array(userNodes.length);
        let parsedCount = 0;
        for (let index = 0; index < userNodes.length; index += 1) {
            const userNode = userNodes[index];
            const jid = userNode.attrs.jid
                ? canonicalizeSignalJid(userNode.attrs.jid, this.hostDomain)
                : '';
            if (!jid || !requested.has(jid)) {
                continue;
            }
            const errorNode = findNodeChild(userNode, WA_NODE_TAGS.ERROR);
            if (errorNode) {
                this.logger.warn('signal identity sync user error', {
                    jid,
                    code: errorNode.attrs.code,
                    text: errorNode.attrs.text
                });
                continue;
            }
            const identityNode = findNodeChild(userNode, WA_NODE_TAGS.IDENTITY);
            if (!identityNode) {
                throw new Error(`identity sync user missing identity node for ${jid}`);
            }
            const typeNode = findNodeChild(userNode, WA_NODE_TAGS.TYPE);
            const identity = decodeExactLength(identityNode.content, 'identity sync identity', SIGNAL_KEY_DATA_LENGTH);
            const parsedType = typeNode
                ? parseUint(decodeExactLength(typeNode.content, 'identity sync type', SIGNAL_KEY_BUNDLE_TYPE_LENGTH), 'identity sync type')
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
