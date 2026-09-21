import { parseJidFull, parsePhoneJid } from '../../protocol/jid.js';
import { WA_NODE_TAGS } from '../../protocol/nodes.js';
import { isUsernameKey, normalizeUsername, splitUsernameHandle, validateUsernameLocally, WA_USERNAME_LIMITS } from '../../protocol/username.js';
import { buildDeleteProfilePictureIq, buildGetDisappearingModeUsyncQueryNode, buildGetProfilePictureIq, buildGetStatusUsyncQueryNodes, buildGetTextStatusUsyncQueryNode, buildGetUsernameUsyncQueryNode, buildSetDisappearingModeIq, buildSetProfilePictureIq, buildSetStatusIq, buildUsernameLookupContactNode, buildUsernameLookupUsyncQueryNodes } from '../../transport/node/builders/profile.js';
import { buildUsyncIq, iterateUsyncUsers, parseUsyncResultEnvelope } from '../../transport/node/builders/usync.js';
import { findNodeChild, getNodeTextContent } from '../../transport/node/helpers.js';
import { runMexQuery } from '../../transport/node/mex/client.js';
import { assertIqResult } from '../../transport/node/query.js';
import { logUsyncProtocolErrors } from '../../transport/node/usync.js';
import { tryAsRecord, tryAsString } from '../../util/coercion.js';
import { parseOptionalInt, parseOptionalSignedInt } from '../../util/primitives.js';
function parseProfilePicture(result) {
    const pictureNode = findNodeChild(result, WA_NODE_TAGS.PICTURE);
    if (!pictureNode) {
        return {};
    }
    return {
        url: pictureNode.attrs.url,
        directPath: pictureNode.attrs.direct_path,
        id: pictureNode.attrs.id,
        type: pictureNode.attrs.type
    };
}
function parseSetPictureResult(result) {
    const pictureNode = findNodeChild(result, WA_NODE_TAGS.PICTURE);
    return pictureNode?.attrs.id ?? null;
}
function parseUsyncProfiles(result) {
    const userNodes = iterateUsyncUsers(result) ?? [];
    const profiles = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const jid = userNode.attrs.jid;
        if (!jid) {
            continue;
        }
        const info = { jid };
        const userContent = userNode.content;
        if (!Array.isArray(userContent)) {
            profiles[count] = info;
            count += 1;
            continue;
        }
        for (let j = 0; j < userContent.length; j += 1) {
            const child = userContent[j];
            if (child.tag === WA_NODE_TAGS.PICTURE) {
                const pictureId = parseOptionalInt(child.attrs.id);
                if (pictureId !== undefined) {
                    info.pictureId = pictureId;
                }
            }
            else if (child.tag === WA_NODE_TAGS.STATUS) {
                const code = child.attrs.code;
                if (parseOptionalInt(code) === 401) {
                    info.status = '';
                }
                else {
                    info.status = getNodeTextContent(child) || null;
                }
            }
        }
        profiles[count] = info;
        count += 1;
    }
    profiles.length = count;
    return profiles;
}
function parseUsyncDisappearingModes(result) {
    const userNodes = iterateUsyncUsers(result) ?? [];
    const results = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const userContent = userNode.content;
        if (!Array.isArray(userContent))
            continue;
        for (let j = 0; j < userContent.length; j += 1) {
            const child = userContent[j];
            if (child.tag !== WA_NODE_TAGS.DISAPPEARING_MODE)
                continue;
            const errorNode = findNodeChild(child, WA_NODE_TAGS.ERROR);
            if (errorNode)
                continue;
            const duration = parseOptionalInt(child.attrs.duration) ?? 0;
            const timestamp = parseOptionalInt(child.attrs.t) ?? 0;
            const entry = { duration, timestamp };
            if (child.attrs.ephemerality_disabled === 'true') {
                entry.ephemeralityDisabled = true;
            }
            results[count] = entry;
            count += 1;
        }
    }
    results.length = count;
    return results;
}
function parseUsyncTextStatuses(result) {
    const userNodes = iterateUsyncUsers(result) ?? [];
    const results = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const jid = userNode.attrs.jid;
        if (!jid)
            continue;
        let entry = {
            jid,
            text: null,
            emoji: null,
            ephemeralDurationSec: null,
            lastUpdateTime: null
        };
        const textStatusNode = findNodeChild(userNode, WA_NODE_TAGS.TEXT_STATUS);
        if (textStatusNode && !findNodeChild(textStatusNode, WA_NODE_TAGS.ERROR)) {
            const emojiNode = findNodeChild(textStatusNode, 'emoji');
            entry = {
                jid,
                text: textStatusNode.attrs.text ?? null,
                emoji: emojiNode?.attrs.content ?? null,
                ephemeralDurationSec: parseOptionalSignedInt(textStatusNode.attrs.ephemeral_duration_sec) ?? null,
                lastUpdateTime: parseOptionalInt(textStatusNode.attrs.last_update_time) ?? null
            };
        }
        results[count] = entry;
        count += 1;
    }
    results.length = count;
    return results;
}
function parseUsyncUsernames(result) {
    const userNodes = iterateUsyncUsers(result) ?? [];
    const results = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const jid = userNode.attrs.jid;
        if (!jid)
            continue;
        const usernameNode = findNodeChild(userNode, WA_NODE_TAGS.USERNAME);
        const hasUsernameError = usernameNode && findNodeChild(usernameNode, WA_NODE_TAGS.ERROR) !== undefined;
        const rawUsername = usernameNode && !hasUsernameError ? getNodeTextContent(usernameNode) || null : null;
        const username = rawUsername !== null ? normalizeUsername(rawUsername) : null;
        results[count] = { jid, username };
        count += 1;
    }
    results.length = count;
    return results;
}
/** Reports the failing rule, never the rejected handle. */
function assertValidUsername(username) {
    const validation = validateUsernameLocally(username);
    if (!validation.isValid) {
        throw new Error(`invalid username: ${validation.errorType}`);
    }
}
/**
 * The key is a recovery secret, so a rejection describes the expected shape and
 * never echoes the value - callers routinely log the errors they catch.
 */
function assertValidUsernameKey(key) {
    if (key !== undefined && !isUsernameKey(key)) {
        throw new Error(`invalid username key: expected ${WA_USERNAME_LIMITS.KEY_LENGTH} digits`);
    }
}
/**
 * An `<error>` child or `type="out"` means the handle did not resolve, a
 * missing `jid` means the lookup key is required, anything else resolves.
 */
function parseUsernameLookup(result) {
    const userNodes = iterateUsyncUsers(result) ?? [];
    if (userNodes.length !== 1)
        return { status: 'not-found' };
    const userNode = userNodes[0];
    const contactNode = findNodeChild(userNode, WA_NODE_TAGS.CONTACT);
    if (contactNode && findNodeChild(contactNode, WA_NODE_TAGS.ERROR)) {
        return { status: 'not-found' };
    }
    const rawUsername = contactNode?.attrs.username;
    const username = rawUsername !== undefined ? normalizeUsername(rawUsername) : null;
    if (contactNode?.attrs.type === 'out')
        return { status: 'not-found' };
    const jid = userNode.attrs.jid;
    if (!jid)
        return { status: 'key-required', username };
    const businessNode = findNodeChild(userNode, WA_NODE_TAGS.BUSINESS);
    return {
        status: 'found',
        jid,
        username,
        isBusiness: businessNode !== undefined && !findNodeChild(businessNode, WA_NODE_TAGS.ERROR),
        pnJid: businessNode?.attrs.pn_jid ?? null
    };
}
function parseOwnUsernameMexResponse(data) {
    const info = tryAsRecord(tryAsRecord(data?.xwa2_username_get)?.username_info);
    return {
        username: tryAsString(info?.username),
        state: tryAsString(info?.state),
        pin: tryAsString(info?.pin)
    };
}
function isMexSetUsernameSuccess(data) {
    return data?.xwa2_username_set?.result === 'SUCCESS';
}
function parseAboutStatusMexResponse(data) {
    return data?.xwa2_users_updates_since?.[0]?.updates?.[0]?.text ?? null;
}
function parseUsernameAvailabilityMexResponse(data) {
    const check = data?.xwa2_username_check;
    const suggestions = (Array.isArray(check?.suggestions) ? check.suggestions : []).filter((s) => typeof s === 'string');
    return { available: check?.result === 'SUCCESS', suggestions };
}
function isMexUsernameKeySetSuccess(data) {
    return data?.xwa2_username_pin_set?.result === 'SUCCESS';
}
function isMexNotFoundError(error) {
    return error instanceof Error && /\berrors?:\s*404\b/.test(error.message);
}
function parseUsyncStatus(result) {
    const profiles = parseUsyncProfiles(result);
    if (profiles.length === 0) {
        return { status: null };
    }
    return { status: profiles[0].status ?? null };
}
function buildTextStatusMutationInput(input) {
    const text = input.text === '' ? null : (input.text ?? null);
    const emoji = input.emoji ?? null;
    let ephemeralDurationSec = input.ephemeralDurationSec ?? 0;
    if (text === null && emoji === null && ephemeralDurationSec !== 0) {
        ephemeralDurationSec = 0;
    }
    return {
        text,
        emoji: emoji !== null ? { content: emoji } : undefined,
        ephemeral_duration_sec: ephemeralDurationSec
    };
}
/** Builds a {@link WaProfileCoordinator} from its IQ/MEX/SID dependencies. */
export function createProfileCoordinator(options) {
    const { queryWithContext, generateSid, mexSocket, queryLidsByPhoneJids, mutations, applyOwnPushName, resolvePrivacyTokenNode, logger } = options;
    return {
        getProfilePicture: async (jid, type, existingId) => {
            const privacyTokenNode = (await resolvePrivacyTokenNode(jid)) ?? undefined;
            const node = buildGetProfilePictureIq(jid, type, existingId, privacyTokenNode);
            const result = await queryWithContext('profile.getPicture', node, undefined, {
                jid,
                type: type ?? 'preview'
            });
            assertIqResult(result, 'profile.getPicture');
            return parseProfilePicture(result);
        },
        setProfilePicture: async (imageBytes, targetJid) => {
            const node = buildSetProfilePictureIq(imageBytes, targetJid);
            const result = await queryWithContext('profile.setPicture', node, undefined, {
                targetJid,
                size: imageBytes.length
            });
            assertIqResult(result, 'profile.setPicture');
            return parseSetPictureResult(result);
        },
        deleteProfilePicture: async (targetJid) => {
            const node = buildDeleteProfilePictureIq(targetJid);
            const result = await queryWithContext('profile.deletePicture', node, undefined, {
                targetJid
            });
            assertIqResult(result, 'profile.deletePicture');
        },
        getStatus: async (jid) => {
            const sid = await generateSid();
            const queryNodes = buildGetStatusUsyncQueryNodes();
            const privacyTokenNode = await resolvePrivacyTokenNode(jid);
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes: [queryNodes[1]],
                users: [{ jid, ...(privacyTokenNode ? { content: [privacyTokenNode] } : {}) }]
            });
            const result = await queryWithContext('profile.getStatus', usyncNode, undefined, {
                jid
            });
            assertIqResult(result, 'profile.getStatus');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'profile.getStatus');
            return parseUsyncStatus(result);
        },
        setStatus: async (text) => {
            const node = buildSetStatusIq(text);
            const result = await queryWithContext('profile.setStatus', node, undefined, undefined, {
                useSystemId: true
            });
            assertIqResult(result, 'profile.setStatus');
        },
        setPushName: async (name) => {
            // Local apply first: the app-state echo of this same write then
            // collapses into a no-op via applyOwnPushName's idempotency guard.
            await applyOwnPushName(name);
            await mutations.set({ schema: 'SettingPushName', name });
        },
        getProfiles: async (jids) => {
            if (jids.length === 0) {
                return [];
            }
            const sid = await generateSid();
            const queryProtocolNodes = buildGetStatusUsyncQueryNodes();
            const users = await Promise.all(jids.map(async (jid) => {
                const privacyTokenNode = await resolvePrivacyTokenNode(jid);
                return { jid, ...(privacyTokenNode ? { content: [privacyTokenNode] } : {}) };
            }));
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes,
                users
            });
            const result = await queryWithContext('profile.getProfiles', usyncNode, undefined, {
                count: jids.length
            });
            assertIqResult(result, 'profile.getProfiles');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'profile.getProfiles');
            return parseUsyncProfiles(result);
        },
        getDisappearingMode: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes: [buildGetDisappearingModeUsyncQueryNode()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('profile.getDisappearingMode', usyncNode, undefined, { count: jids.length });
            assertIqResult(result, 'profile.getDisappearingMode');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'profile.getDisappearingMode');
            return parseUsyncDisappearingModes(result);
        },
        setDisappearingMode: async (durationSeconds) => {
            if (!Number.isFinite(durationSeconds) ||
                !Number.isSafeInteger(durationSeconds) ||
                durationSeconds < 0) {
                throw new Error(`invalid durationSeconds: ${durationSeconds}`);
            }
            const node = buildSetDisappearingModeIq(durationSeconds);
            const result = await queryWithContext('profile.setDisappearingMode', node, undefined, {
                durationSeconds
            });
            assertIqResult(result, 'profile.setDisappearingMode');
        },
        getTextStatuses: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes: [buildGetTextStatusUsyncQueryNode()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('profile.getTextStatuses', usyncNode, undefined, {
                count: jids.length
            });
            assertIqResult(result, 'profile.getTextStatuses');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'profile.getTextStatuses');
            return parseUsyncTextStatuses(result);
        },
        setTextStatus: async (input) => {
            await runMexQuery(mexSocket, 'UpdateTextStatus', {
                input: buildTextStatusMutationInput(input)
            });
        },
        getUsernames: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes: [buildGetUsernameUsyncQueryNode()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('profile.getUsernames', usyncNode, undefined, {
                count: jids.length
            });
            assertIqResult(result, 'profile.getUsernames');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'profile.getUsernames');
            return parseUsyncUsernames(result);
        },
        resolveUsername: async (input) => {
            const parsed = splitUsernameHandle(input.username);
            assertValidUsername(parsed.username);
            const usernameKey = input.usernameKey ?? parsed.usernameKey ?? undefined;
            assertValidUsernameKey(usernameKey);
            const sid = await generateSid();
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes: buildUsernameLookupUsyncQueryNodes(),
                users: [
                    {
                        content: [
                            buildUsernameLookupContactNode({
                                username: parsed.username,
                                ...(usernameKey !== undefined ? { usernameKey } : {})
                            })
                        ]
                    }
                ]
            });
            const result = await queryWithContext('profile.resolveUsername', usyncNode, undefined, {
                username: parsed.username,
                withKey: usernameKey !== undefined
            });
            assertIqResult(result, 'profile.resolveUsername');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'profile.resolveUsername');
            return parseUsernameLookup(result);
        },
        getOwnUsername: async () => {
            try {
                const data = await runMexQuery(mexSocket, 'GetUsername', {});
                return parseOwnUsernameMexResponse(data);
            }
            catch (error) {
                if (isMexNotFoundError(error)) {
                    return { username: null, state: null, pin: null };
                }
                throw error;
            }
        },
        setUsername: async (input) => {
            const username = normalizeUsername(input.username.trim());
            assertValidUsername(username);
            const data = await runMexQuery(mexSocket, 'SetUsername', {
                input: username,
                reserved: input.reserved ?? false,
                session_id: input.sessionId ?? '',
                source: input.source ?? 'USER_INPUT'
            });
            return isMexSetUsernameSuccess(data);
        },
        deleteUsername: async () => {
            const data = await runMexQuery(mexSocket, 'SetUsername', {});
            return isMexSetUsernameSuccess(data);
        },
        getAboutStatus: async (jid) => {
            const data = await runMexQuery(mexSocket, 'FetchAboutStatus', {
                user: { user_id: parseJidFull(jid).address.user }
            });
            return parseAboutStatusMexResponse(data);
        },
        checkUsernameAvailability: async (username) => {
            const data = await runMexQuery(mexSocket, 'UsernameAvailability', {
                input: username
            });
            return parseUsernameAvailabilityMexResponse(data);
        },
        setUsernameKey: async (pin) => {
            assertValidUsernameKey(pin);
            const data = await runMexQuery(mexSocket, 'SetUsernameKey', { pin });
            return isMexUsernameKeySetSuccess(data);
        },
        getLidsByPhoneNumbers: async (phoneNumbers) => {
            if (phoneNumbers.length === 0)
                return [];
            const normalizedPhoneJids = new Array(phoneNumbers.length);
            for (let index = 0; index < phoneNumbers.length; index += 1) {
                normalizedPhoneJids[index] = parsePhoneJid(phoneNumbers[index]);
            }
            logger.trace('profile.getLidsByPhoneNumbers', {
                phones: normalizedPhoneJids.length
            });
            return queryLidsByPhoneJids(normalizedPhoneJids);
        }
    };
}
