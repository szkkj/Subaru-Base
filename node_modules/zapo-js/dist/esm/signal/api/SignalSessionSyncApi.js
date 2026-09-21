import { WA_DEFAULTS, WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../protocol/constants.js';
import { canonicalizeSignalJid } from '../../protocol/jid.js';
import { decodeExactLength, parseSignalKeyBundleFromNode, parseUint } from '../api/codec.js';
import { SIGNAL_REGISTRATION_ID_LENGTH } from '../api/constants.js';
import { registerParsedResultByRawAndCanonicalKey } from '../api/result-map.js';
import { findNodeChild, getNodeChildrenByTag } from '../../transport/node/helpers.js';
import { assertIqResult } from '../../transport/node/query.js';
function isKeyBundleResultPreferred(result) {
    return 'bundle' in result;
}
/**
 * Fetches per-device prekey bundles required to start a Signal session.
 * Use {@link fetchKeyBundle} for single-JID calls or {@link fetchKeyBundles}
 * for batched encryption.
 */
export class SignalSessionSyncApi {
    constructor(options) {
        this.logger = options.logger;
        this.query = options.query;
        this.defaultTimeoutMs =
            options.defaultTimeoutMs ?? WA_DEFAULTS.SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS;
        this.hostDomain = options.hostDomain ?? WA_DEFAULTS.HOST_DOMAIN;
    }
    /**
     * Convenience wrapper for {@link fetchKeyBundles} that fetches a single
     * bundle and throws on server error envelopes.
     */
    async fetchKeyBundle(target, timeoutMs = this.defaultTimeoutMs) {
        const results = await this.fetchKeyBundles([target], timeoutMs);
        const first = results[0];
        if (!first || !('bundle' in first)) {
            const errorCode = first && 'errorCode' in first ? (first.errorCode ?? 'unknown') : 'unknown';
            const errorText = first && 'errorText' in first ? first.errorText : 'unknown';
            throw new Error(`key bundle user error (${target.jid}): ${errorCode} ${errorText}`);
        }
        const parsed = first;
        this.logger.debug('signal fetch key bundle success', {
            requestJid: target.jid,
            responseJid: parsed.jid,
            hasOneTimeKey: parsed.bundle.oneTimeKey !== undefined,
            hasDeviceIdentity: parsed.deviceIdentity !== undefined
        });
        return parsed;
    }
    /**
     * Batched key-bundle fetch. Returns one entry per JID – either a bundle
     * (success) or an error envelope. Duplicate JIDs are coalesced.
     */
    async fetchKeyBundles(targets, timeoutMs = this.defaultTimeoutMs) {
        if (targets.length === 0) {
            return [];
        }
        const targetByJid = new Map();
        for (let index = 0; index < targets.length; index += 1) {
            const target = targets[index];
            const previous = targetByJid.get(target.jid);
            targetByJid.set(target.jid, {
                jid: target.jid,
                reasonIdentity: (previous?.reasonIdentity ?? false) || target.reasonIdentity === true
            });
        }
        const mergedTargets = new Array(targetByJid.size);
        let mergedTargetsCount = 0;
        for (const target of targetByJid.values()) {
            mergedTargets[mergedTargetsCount] = target;
            mergedTargetsCount += 1;
        }
        const userNodes = new Array(mergedTargets.length);
        for (let index = 0; index < mergedTargets.length; index += 1) {
            const target = mergedTargets[index];
            userNodes[index] = {
                tag: WA_NODE_TAGS.USER,
                attrs: target.reasonIdentity === true
                    ? { jid: target.jid, reason: 'identity' }
                    : { jid: target.jid }
            };
        }
        this.logger.debug('signal fetch key bundles request', {
            targets: mergedTargets.length,
            timeoutMs
        });
        const responseNode = await this.query({
            tag: WA_NODE_TAGS.IQ,
            attrs: {
                type: WA_IQ_TYPES.GET,
                xmlns: WA_XMLNS.SIGNAL,
                to: this.hostDomain
            },
            content: [
                {
                    tag: WA_NODE_TAGS.KEY,
                    attrs: {},
                    content: userNodes
                }
            ]
        }, timeoutMs);
        return this.parseFetchKeyBundleResponse(responseNode, mergedTargets);
    }
    parseFetchKeyBundleResponse(node, requestedTargets) {
        assertIqResult(node, 'key bundle');
        const listNode = findNodeChild(node, WA_NODE_TAGS.LIST);
        if (!listNode) {
            throw new Error('key bundle response missing list node');
        }
        const userNodes = getNodeChildrenByTag(listNode, WA_NODE_TAGS.USER);
        if (userNodes.length === 0) {
            throw new Error('key bundle response list is empty');
        }
        const parsedByJid = new Map();
        const parsedByCanonicalJid = new Map();
        for (let index = 0; index < userNodes.length; index += 1) {
            const userNode = userNodes[index];
            const jid = userNode.attrs.jid;
            if (!jid) {
                continue;
            }
            const userErrorNode = findNodeChild(userNode, WA_NODE_TAGS.ERROR);
            if (userErrorNode) {
                registerParsedResultByRawAndCanonicalKey(parsedByJid, parsedByCanonicalJid, jid, canonicalizeSignalJid(jid, this.hostDomain), {
                    jid,
                    errorCode: userErrorNode.attrs.code,
                    errorText: userErrorNode.attrs.text ?? 'unknown'
                }, isKeyBundleResultPreferred);
                continue;
            }
            const parsed = this.parseUserKeyBundle(userNode);
            registerParsedResultByRawAndCanonicalKey(parsedByJid, parsedByCanonicalJid, jid, canonicalizeSignalJid(jid, this.hostDomain), {
                jid,
                bundle: parsed.bundle,
                ...(parsed.deviceIdentity ? { deviceIdentity: parsed.deviceIdentity } : {})
            }, isKeyBundleResultPreferred);
        }
        const output = new Array(requestedTargets.length);
        for (let index = 0; index < requestedTargets.length; index += 1) {
            const target = requestedTargets[index];
            output[index] = parsedByJid.get(target.jid) ??
                parsedByCanonicalJid.get(canonicalizeSignalJid(target.jid, this.hostDomain)) ?? {
                jid: target.jid,
                errorText: 'missing key bundle user in response'
            };
        }
        return output;
    }
    parseUserKeyBundle(node) {
        const registrationNode = findNodeChild(node, WA_NODE_TAGS.REGISTRATION);
        if (!registrationNode) {
            throw new Error('key bundle user missing registration node');
        }
        const regId = parseUint(decodeExactLength(registrationNode.content, 'key bundle registration', SIGNAL_REGISTRATION_ID_LENGTH), 'key bundle registration');
        const parsed = parseSignalKeyBundleFromNode(node, 'key bundle');
        return {
            bundle: {
                regId,
                identity: parsed.identity,
                signedKey: parsed.signedKey,
                ...(parsed.oneTimeKey ? { oneTimeKey: parsed.oneTimeKey } : {})
            },
            ...(parsed.deviceIdentity ? { deviceIdentity: parsed.deviceIdentity } : {})
        };
    }
}
