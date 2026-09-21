import { PromiseDedup } from '../../infra/perf/PromiseDedup.js';
import { WA_DEFAULTS, WA_NODE_TAGS, WA_USYNC_CONTEXTS } from '../../protocol/constants.js';
import { buildDeviceJid, isHostedDeviceId, isLidJid, isUserJid, parsePhoneJid, splitJid, toUserJid } from '../../protocol/jid.js';
import { buildUsyncIq, iterateUsyncUsers, parseUsyncResultEnvelope } from '../../transport/node/builders/usync.js';
import { findNodeChild, getNodeChildrenByTag, getNodeTextContent } from '../../transport/node/helpers.js';
import { assertIqResult } from '../../transport/node/query.js';
import { createUsyncSidGenerator, logUsyncProtocolErrors } from '../../transport/node/usync.js';
import { toError } from '../../util/primitives.js';
/**
 * Resolves the device list and LID mapping for a set of users via the `usync`
 * protocol. Concurrent calls for the same JIDs are deduplicated.
 */
export class SignalDeviceSyncApi {
    constructor(options) {
        this.syncDedup = new PromiseDedup();
        this.logger = options.logger;
        this.query = options.query;
        this.deviceListStore = options.deviceListStore;
        this.defaultTimeoutMs =
            options.defaultTimeoutMs ?? WA_DEFAULTS.SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS;
        this.hostDomain = options.hostDomain ?? WA_DEFAULTS.HOST_DOMAIN;
        this.generateSid = options.generateSid ?? createUsyncSidGenerator();
    }
    /**
     * Refreshes the device list for every JID in `userJids`. Returns the
     * resolved per-user device JIDs (matches the on-store snapshot).
     */
    syncDeviceList(userJids, timeoutMs = this.defaultTimeoutMs) {
        const normalizedUsers = this.normalizeUsers(userJids);
        if (normalizedUsers.length === 0) {
            return Promise.resolve([]);
        }
        const dedupKey = normalizedUsers.join(',');
        return this.syncDedup.run(dedupKey, () => this.syncDeviceListInternal(normalizedUsers, timeoutMs));
    }
    async syncDeviceListInternal(normalizedUsers, timeoutMs) {
        const nowMs = Date.now();
        const cachedByUser = new Map();
        const usersToQuery = this.deviceListStore
            ? await this.collectUsersToQuery(normalizedUsers, nowMs, cachedByUser, this.deviceListStore)
            : normalizedUsers;
        if (usersToQuery.length === 0) {
            const fromCache = new Array(normalizedUsers.length);
            for (let index = 0; index < normalizedUsers.length; index += 1) {
                const jid = normalizedUsers[index];
                fromCache[index] = {
                    jid,
                    deviceJids: cachedByUser.get(jid) ?? []
                };
            }
            return fromCache;
        }
        const sid = await this.generateSid();
        const request = this.makeDeviceSyncRequest(usersToQuery, sid);
        this.logger.debug('signal device sync request', {
            users: usersToQuery.length,
            timeoutMs
        });
        const response = await this.query(request, timeoutMs);
        const parsed = this.parseDeviceSyncResponse(response, usersToQuery);
        if (this.deviceListStore) {
            const updatedAtMs = Date.now();
            const batch = new Array(parsed.length);
            for (let index = 0; index < parsed.length; index += 1) {
                const entry = parsed[index];
                batch[index] = {
                    userJid: entry.jid,
                    deviceJids: entry.deviceJids,
                    updatedAtMs
                };
            }
            await this.deviceListStore.upsertUserDevicesBatch(batch);
        }
        const parsedByUser = new Map();
        for (let index = 0; index < parsed.length; index += 1) {
            const entry = parsed[index];
            parsedByUser.set(entry.jid, entry.deviceJids);
        }
        const merged = new Array(normalizedUsers.length);
        let totalDevices = 0;
        for (let index = 0; index < normalizedUsers.length; index += 1) {
            const jid = normalizedUsers[index];
            const deviceJids = parsedByUser.get(jid) ?? cachedByUser.get(jid) ?? [];
            totalDevices += deviceJids.length;
            merged[index] = {
                jid,
                deviceJids
            };
        }
        this.logger.debug('signal device sync success', {
            users: merged.length,
            devices: totalDevices
        });
        return merged;
    }
    /**
     * Looks up LIDs for a list of phone JIDs via a `lid` usync query. Returns
     * one entry per input JID with `exists` indicating server-side presence.
     */
    async queryLidsByPhoneJids(phoneJids, timeoutMs = this.defaultTimeoutMs) {
        const normalizedPhoneJids = this.normalizeUsers(phoneJids);
        if (normalizedPhoneJids.length === 0) {
            return [];
        }
        const sid = await this.generateSid();
        const request = this.makeLidSyncRequest(normalizedPhoneJids, sid);
        this.logger.debug('signal lid sync request', {
            users: normalizedPhoneJids.length,
            timeoutMs
        });
        const response = await this.query(request, timeoutMs);
        const parsed = this.parseLidSyncResponse(response, normalizedPhoneJids);
        const parsedByPhoneJid = new Map();
        for (let index = 0; index < parsed.length; index += 1) {
            const entry = parsed[index];
            parsedByPhoneJid.set(entry.jid, {
                phoneJid: entry.phoneJid ?? entry.jid,
                lidJid: entry.lidJid,
                exists: entry.exists,
                invalid: entry.invalid
            });
        }
        const result = new Array(normalizedPhoneJids.length);
        let found = 0;
        for (let index = 0; index < normalizedPhoneJids.length; index += 1) {
            const queriedJid = normalizedPhoneJids[index];
            const hit = parsedByPhoneJid.get(queriedJid);
            const resolved = hit
                ? { queriedJid, ...hit }
                : { queriedJid, phoneJid: queriedJid, lidJid: null, exists: false, invalid: false };
            if (resolved.exists) {
                found += 1;
            }
            result[index] = resolved;
        }
        this.logger.debug('signal lid sync success', {
            users: result.length,
            found
        });
        await this.propagateAltUserJids(result);
        return result;
    }
    /**
     * Resolves both addressing forms for a 1:1 user jid (PN or LID input),
     * cache-first via the device-list store (`userJid`/`altUserJid`) with a
     * one-shot {@link queryLidsByPhoneJids} fallback for PN inputs. LID
     * inputs have no reverse lookup - their PN side stays `null` on a cache
     * miss. Store/usync failures are logged at debug and degrade to the
     * forms already known. Inputs that are neither PN nor LID user jids
     * resolve to `{ lidJid: null, pnJid: null }`.
     */
    async resolveUserJidPair(userJid, timeoutMs = this.defaultTimeoutMs) {
        if (isLidJid(userJid)) {
            return { lidJid: userJid, pnJid: await this.findCachedAltForm(userJid, isUserJid) };
        }
        if (!isUserJid(userJid)) {
            return { lidJid: null, pnJid: null };
        }
        const cachedLid = await this.findCachedAltForm(userJid, isLidJid);
        if (cachedLid) {
            return { lidJid: cachedLid, pnJid: userJid };
        }
        try {
            const results = await this.queryLidsByPhoneJids([userJid], timeoutMs);
            const match = results.find((entry) => entry.queriedJid === userJid);
            if (match?.lidJid) {
                return { lidJid: match.lidJid, pnJid: match.phoneJid };
            }
        }
        catch (error) {
            this.logger.debug('lid usync resolution failed for jid pair', {
                jid: userJid,
                message: toError(error).message
            });
        }
        return { lidJid: null, pnJid: userJid };
    }
    /**
     * Returns the device-list snapshot form of `userJid` that satisfies
     * `matches` (checked against `userJid` then `altUserJid`), or `null` when
     * the store is absent, misses, or fails.
     */
    async findCachedAltForm(userJid, matches) {
        if (!this.deviceListStore)
            return null;
        try {
            const snapshot = await this.deviceListStore.findByAnyUserJid(userJid);
            if (snapshot) {
                if (matches(snapshot.userJid))
                    return snapshot.userJid;
                if (snapshot.altUserJid && matches(snapshot.altUserJid))
                    return snapshot.altUserJid;
            }
        }
        catch (error) {
            this.logger.debug('device-list lookup failed for jid pair', {
                jid: userJid,
                message: toError(error).message
            });
        }
        return null;
    }
    /**
     * Enriches existing device-list snapshots with the resolved LID equivalents
     * so {@link WaDeviceListStore.findByAnyUserJid} can later match a retry
     * receipt arriving in LID form against an eligible list stored in PN form
     * (and vice versa). Skips users with no cached snapshot — the alt gets
     * recorded on the next {@link syncDeviceList} sweep.
     */
    async propagateAltUserJids(results) {
        if (!this.deviceListStore || results.length === 0)
            return;
        const nowMs = Date.now();
        const lidByQueriedJid = new Map();
        const queriedJids = [];
        for (const entry of results) {
            if (entry.lidJid) {
                lidByQueriedJid.set(entry.queriedJid, entry.lidJid);
                queriedJids.push(entry.queriedJid);
            }
        }
        if (queriedJids.length === 0)
            return;
        const existing = await this.deviceListStore.getUserDevicesBatch(queriedJids, nowMs);
        const updates = [];
        for (let index = 0; index < queriedJids.length; index += 1) {
            const snapshot = existing[index];
            if (!snapshot)
                continue;
            const lidJid = lidByQueriedJid.get(queriedJids[index]);
            if (!lidJid || snapshot.altUserJid === lidJid)
                continue;
            updates.push({
                userJid: snapshot.userJid,
                altUserJid: lidJid,
                deviceJids: snapshot.deviceJids,
                updatedAtMs: nowMs
            });
        }
        if (updates.length > 0) {
            await this.deviceListStore.upsertUserDevicesBatch(updates);
        }
    }
    async collectUsersToQuery(normalizedUsers, nowMs, cachedByUser, store) {
        const records = await store.getUserDevicesBatch(normalizedUsers, nowMs);
        const usersToQuery = new Array(normalizedUsers.length);
        let usersToQueryCount = 0;
        for (let index = 0; index < normalizedUsers.length; index += 1) {
            const userJid = normalizedUsers[index];
            const record = records[index];
            if (!record) {
                usersToQuery[usersToQueryCount] = userJid;
                usersToQueryCount += 1;
                continue;
            }
            cachedByUser.set(userJid, record.deviceJids);
        }
        usersToQuery.length = usersToQueryCount;
        return usersToQuery;
    }
    makeDeviceSyncRequest(userJids, sid) {
        const users = new Array(userJids.length);
        for (let index = 0; index < userJids.length; index += 1) {
            users[index] = {
                jid: userJids[index]
            };
        }
        return buildUsyncIq({
            sid,
            hostDomain: this.hostDomain,
            context: WA_USYNC_CONTEXTS.INTERACTIVE,
            queryProtocolNodes: [
                {
                    tag: WA_NODE_TAGS.DEVICES,
                    attrs: {
                        version: '2'
                    }
                }
            ],
            users
        });
    }
    makeLidSyncRequest(userJids, sid) {
        const users = new Array(userJids.length);
        for (let index = 0; index < userJids.length; index += 1) {
            const jid = userJids[index];
            users[index] = {
                jid,
                content: [
                    {
                        tag: WA_NODE_TAGS.CONTACT,
                        attrs: {},
                        // E.164 '+': without it the server normalizes under the
                        // account's country and resolves the wrong contact.
                        content: `+${splitJid(jid).user}`
                    }
                ]
            };
        }
        return buildUsyncIq({
            sid,
            hostDomain: this.hostDomain,
            context: WA_USYNC_CONTEXTS.INTERACTIVE,
            queryProtocolNodes: [
                {
                    tag: WA_NODE_TAGS.CONTACT,
                    attrs: {}
                },
                {
                    tag: WA_NODE_TAGS.LID,
                    attrs: {}
                }
            ],
            users
        });
    }
    parseDeviceSyncResponse(node, requestedUsers) {
        assertIqResult(node, 'signal device sync');
        logUsyncProtocolErrors(parseUsyncResultEnvelope(node), this.logger, 'signal.deviceSync');
        const userNodes = iterateUsyncUsers(node);
        if (!userNodes) {
            throw new Error('signal device sync response missing usync envelope');
        }
        const requestedSet = new Set(requestedUsers);
        const parsed = new Array(userNodes.length);
        let parsedCount = 0;
        for (let index = 0; index < userNodes.length; index += 1) {
            const userNode = userNodes[index];
            const userJid = userNode.attrs.jid;
            if (!userJid) {
                continue;
            }
            const normalizedUserJid = this.tryNormalizeUserJid(userJid);
            if (normalizedUserJid === null) {
                this.logger.debug('signal device sync skipping user node with invalid jid', {
                    jid: userJid
                });
                continue;
            }
            if (!requestedSet.has(normalizedUserJid)) {
                continue;
            }
            parsed[parsedCount] = {
                jid: normalizedUserJid,
                deviceJids: this.parseUserDeviceJids(userNode, userJid, normalizedUserJid)
            };
            parsedCount += 1;
        }
        parsed.length = parsedCount;
        return parsed;
    }
    parseLidSyncResponse(node, requestedUsers) {
        assertIqResult(node, 'signal lid sync');
        logUsyncProtocolErrors(parseUsyncResultEnvelope(node), this.logger, 'signal.lidSync');
        const userNodes = iterateUsyncUsers(node);
        if (!userNodes) {
            throw new Error('signal lid sync response missing usync envelope');
        }
        const requestedSet = new Set(requestedUsers);
        const parsed = [];
        const lidUserErrors = [];
        for (let index = 0; index < userNodes.length; index += 1) {
            const userNode = userNodes[index];
            const rawUserJid = userNode.attrs.jid;
            if (!rawUserJid) {
                continue;
            }
            const resolvedJid = this.tryNormalizeUserJid(rawUserJid);
            const pnJid = userNode.attrs.pn_jid
                ? this.tryNormalizeUserJid(userNode.attrs.pn_jid)
                : null;
            const phoneJid = pnJid ?? resolvedJid;
            const lidNode = findNodeChild(userNode, WA_NODE_TAGS.LID);
            const lidErrorNode = lidNode ? findNodeChild(lidNode, WA_NODE_TAGS.ERROR) : null;
            if (lidErrorNode) {
                lidUserErrors.push({
                    jid: resolvedJid ?? rawUserJid,
                    code: lidErrorNode.attrs.code,
                    text: lidErrorNode.attrs.text
                });
            }
            const lidJid = !lidErrorNode && lidNode?.attrs.val
                ? this.tryNormalizeUserJid(lidNode.attrs.val)
                : null;
            const contactNodes = getNodeChildrenByTag(userNode, WA_NODE_TAGS.CONTACT);
            let matched = false;
            for (let c = 0; c < contactNodes.length; c += 1) {
                const contactNode = contactNodes[c];
                const inputJid = this.recoverContactJid(contactNode);
                if (inputJid === null || !requestedSet.has(inputJid)) {
                    continue;
                }
                matched = true;
                const invalid = resolvedJid === null || contactNode.attrs.type === 'invalid';
                parsed.push({
                    jid: inputJid,
                    phoneJid: phoneJid ?? inputJid,
                    lidJid,
                    exists: !invalid &&
                        this.parseLidSyncContactExists(contactNode, inputJid, lidJid !== null),
                    invalid
                });
            }
            if (matched) {
                continue;
            }
            if (resolvedJid === null) {
                this.logger.debug('signal lid sync skipping user node with invalid jid', {
                    jid: rawUserJid
                });
                continue;
            }
            const requestedKey = requestedSet.has(resolvedJid)
                ? resolvedJid
                : pnJid !== null && requestedSet.has(pnJid)
                    ? pnJid
                    : null;
            if (requestedKey === null) {
                this.logger.debug('signal lid sync unmatched user (no contact echo)', {
                    jid: resolvedJid,
                    pnJid
                });
                continue;
            }
            const contactNode = findNodeChild(userNode, WA_NODE_TAGS.CONTACT);
            parsed.push({
                jid: requestedKey,
                phoneJid: phoneJid ?? requestedKey,
                lidJid,
                exists: this.parseLidSyncContactExists(contactNode, requestedKey, lidJid !== null),
                invalid: false
            });
        }
        if (lidUserErrors.length > 0) {
            this.logger.warn('signal lid sync user errors', {
                droppedCount: lidUserErrors.length,
                totalExpected: requestedUsers.length,
                sample: lidUserErrors.slice(0, 3)
            });
        }
        return parsed;
    }
    /**
     * Recovers the queried phone JID from a `<contact>` echo. Each `<contact>` in a
     * usync response echoes the `+<number>` we sent (base64 text content), so it maps
     * a response node back to the exact input - even when the server corrected the
     * `<user jid>` or rejected it as `jid='undefined'`. Returns `null` when there is
     * no decodable phone echo.
     */
    recoverContactJid(contactNode) {
        const echoed = getNodeTextContent(contactNode);
        if (!echoed) {
            return null;
        }
        try {
            return parsePhoneJid(echoed);
        }
        catch {
            return null;
        }
    }
    parseLidSyncContactExists(contactNode, userJid, defaultExists) {
        if (!contactNode) {
            return defaultExists;
        }
        const errorNode = findNodeChild(contactNode, WA_NODE_TAGS.ERROR);
        if (errorNode) {
            this.logger.warn('signal lid sync contact error', {
                jid: userJid,
                code: errorNode.attrs.code,
                text: errorNode.attrs.text
            });
            return false;
        }
        return contactNode.attrs.type === 'in';
    }
    parseUserDeviceJids(userNode, rawUserJid, normalizedUserJid) {
        const devicesNode = findNodeChild(userNode, WA_NODE_TAGS.DEVICES);
        if (!devicesNode) {
            return [];
        }
        const errorNode = findNodeChild(devicesNode, WA_NODE_TAGS.ERROR);
        if (errorNode) {
            this.logger.warn('signal device sync user error', {
                jid: normalizedUserJid,
                code: errorNode.attrs.code,
                text: errorNode.attrs.text
            });
            return [];
        }
        const deviceListNode = findNodeChild(devicesNode, 'device-list');
        if (!deviceListNode) {
            return [];
        }
        const parsedNormalizedUser = splitJid(normalizedUserJid);
        const rawAtIndex = rawUserJid.indexOf('@');
        const rawServer = rawAtIndex >= 1 && rawAtIndex < rawUserJid.length - 1
            ? rawUserJid.slice(rawAtIndex + 1)
            : parsedNormalizedUser.server;
        const dedup = new Set();
        for (const deviceNode of getNodeChildrenByTag(deviceListNode, WA_NODE_TAGS.DEVICE)) {
            const parsedId = deviceNode.attrs.id
                ? Number.parseInt(deviceNode.attrs.id, 10)
                : Number.NaN;
            if (!Number.isSafeInteger(parsedId) || parsedId < 0) {
                continue;
            }
            const isHostedDevice = isHostedDeviceId(parsedId) || deviceNode.attrs.is_hosted === 'true';
            dedup.add(buildDeviceJid(parsedNormalizedUser.user, parsedNormalizedUser.server, parsedId, {
                rawServer,
                isHosted: isHostedDevice
            }));
        }
        return Array.from(dedup);
    }
    normalizeUsers(userJids) {
        const normalized = new Array(userJids.length);
        let normalizedCount = 0;
        const dedup = new Set();
        for (let index = 0; index < userJids.length; index += 1) {
            const normalizedJid = toUserJid(userJids[index], {
                canonicalizeSignalServer: true,
                hostDomain: this.hostDomain
            });
            if (dedup.has(normalizedJid)) {
                continue;
            }
            dedup.add(normalizedJid);
            normalized[normalizedCount] = normalizedJid;
            normalizedCount += 1;
        }
        normalized.length = normalizedCount;
        return normalized;
    }
    /**
     * Canonicalizes a user jid, returning `null` instead of throwing when the input
     * is not a valid jid (for example the literal `'undefined'` the server returns
     * for an invalid contact). Lets a single malformed response node be skipped
     * without discarding the rest of the batch.
     */
    tryNormalizeUserJid(jid) {
        try {
            return toUserJid(jid, {
                canonicalizeSignalServer: true,
                hostDomain: this.hostDomain
            });
        }
        catch {
            return null;
        }
    }
}
