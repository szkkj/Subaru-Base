"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalMissingPreKeysSyncApi = void 0;
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const codec_1 = require("../api/codec");
const constants_2 = require("../api/constants");
const prekeys_1 = require("../api/prekeys");
const result_map_1 = require("../api/result-map");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
function isMissingPreKeysUserResultPreferred(result) {
    return 'devices' in result;
}
/**
 * Fetches missing prekey bundles for specific (user, device, registration id)
 * triples – used during message encryption when a Signal session is missing.
 */
class SignalMissingPreKeysSyncApi {
    constructor(options) {
        this.logger = options.logger;
        this.query = options.query;
        this.defaultTimeoutMs =
            options.defaultTimeoutMs ?? constants_1.WA_DEFAULTS.SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS;
    }
    /**
     * Fetches prekey bundles for the requested `targets` in a single IQ.
     * Returns either a per-device bundle list or an error envelope per user.
     */
    async fetchMissingPreKeys(targets, timeoutMs = this.defaultTimeoutMs) {
        if (targets.length === 0) {
            return [];
        }
        this.logger.debug('signal fetch missing prekeys request', {
            users: targets.length,
            timeoutMs
        });
        const response = await this.query((0, prekeys_1.buildMissingPreKeysFetchIq)(targets), timeoutMs);
        const parsed = this.parseFetchMissingPreKeysResponse(response, targets);
        this.logger.debug('signal fetch missing prekeys success', {
            users: parsed.length
        });
        return parsed;
    }
    parseFetchMissingPreKeysResponse(node, requestedTargets) {
        (0, query_1.assertIqResult)(node, 'missing prekeys');
        const listNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.LIST);
        if (!listNode) {
            throw new Error('missing prekeys response missing list node');
        }
        const users = (0, helpers_1.getNodeChildrenByTag)(listNode, constants_1.WA_NODE_TAGS.USER);
        const parsedByJid = new Map();
        const parsedByCanonicalJid = new Map();
        for (let index = 0; index < users.length; index += 1) {
            const userNode = users[index];
            const userJid = userNode.attrs.jid;
            if (!userJid) {
                continue;
            }
            const canonicalUserJid = (0, jid_1.toUserJid)(userJid, {
                canonicalizeSignalServer: true
            });
            const userErrorNode = (0, helpers_1.findNodeChild)(userNode, constants_1.WA_NODE_TAGS.ERROR);
            if (userErrorNode) {
                const parsedCode = Number.parseInt(userErrorNode.attrs.code ?? '', 10);
                (0, result_map_1.registerParsedResultByRawAndCanonicalKey)(parsedByJid, parsedByCanonicalJid, userJid, canonicalUserJid, {
                    userJid,
                    errorCode: Number.isSafeInteger(parsedCode) ? parsedCode : undefined,
                    errorText: userErrorNode.attrs.text ?? userErrorNode.attrs.type ?? 'unknown'
                }, isMissingPreKeysUserResultPreferred);
                continue;
            }
            (0, result_map_1.registerParsedResultByRawAndCanonicalKey)(parsedByJid, parsedByCanonicalJid, userJid, canonicalUserJid, {
                userJid,
                devices: this.parseUserDevices(userNode, canonicalUserJid)
            }, isMissingPreKeysUserResultPreferred);
        }
        const results = new Array(requestedTargets.length);
        for (let index = 0; index < requestedTargets.length; index += 1) {
            const target = requestedTargets[index];
            results[index] = parsedByJid.get(target.userJid) ??
                parsedByCanonicalJid.get((0, jid_1.toUserJid)(target.userJid, {
                    canonicalizeSignalServer: true
                })) ?? {
                userJid: target.userJid,
                errorText: 'missing user in key_fetch response'
            };
        }
        return results;
    }
    parseUserDevices(node, userJid) {
        const { user, server } = (0, jid_1.splitJid)(userJid);
        const devices = (0, helpers_1.getNodeChildrenByTag)(node, constants_1.WA_NODE_TAGS.DEVICE);
        const bundles = new Array(devices.length);
        for (let index = 0; index < devices.length; index += 1) {
            const deviceNode = devices[index];
            const deviceIdValue = deviceNode.attrs.id;
            if (!deviceIdValue) {
                throw new Error(`missing prekeys device[${index}].id is missing`);
            }
            const deviceId = Number.parseInt(deviceIdValue, 10);
            if (!Number.isSafeInteger(deviceId) || deviceId < 0) {
                throw new Error(`missing prekeys device[${index}].id is invalid`);
            }
            const registrationNode = (0, helpers_1.findNodeChild)(deviceNode, constants_1.WA_NODE_TAGS.REGISTRATION);
            if (!registrationNode) {
                throw new Error(`missing prekeys device payload is incomplete for ${userJid}`);
            }
            const regId = (0, codec_1.parseUint)((0, codec_1.decodeExactLength)(registrationNode.content, 'missing prekeys device registration', constants_2.SIGNAL_REGISTRATION_ID_LENGTH), 'missing prekeys device registration');
            const parsed = (0, codec_1.parseSignalKeyBundleFromNode)(deviceNode, 'missing prekeys device');
            const bundle = {
                regId,
                identity: parsed.identity,
                signedKey: parsed.signedKey,
                ...(parsed.oneTimeKey ? { oneTimeKey: parsed.oneTimeKey } : {})
            };
            const deviceJid = deviceId === 0 ? userJid : `${user}:${deviceId}@${server}`;
            bundles[index] = parsed.deviceIdentity
                ? { deviceJid, bundle, deviceIdentity: parsed.deviceIdentity }
                : { deviceJid, bundle };
        }
        return bundles;
    }
}
exports.SignalMissingPreKeysSyncApi = SignalMissingPreKeysSyncApi;
