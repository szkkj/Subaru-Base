"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProfileCoordinator = createProfileCoordinator;
const jid_1 = require("../../protocol/jid");
const nodes_1 = require("../../protocol/nodes");
const username_1 = require("../../protocol/username");
const profile_1 = require("../../transport/node/builders/profile");
const usync_1 = require("../../transport/node/builders/usync");
const helpers_1 = require("../../transport/node/helpers");
const client_1 = require("../../transport/node/mex/client");
const query_1 = require("../../transport/node/query");
const usync_2 = require("../../transport/node/usync");
const coercion_1 = require("../../util/coercion");
const primitives_1 = require("../../util/primitives");
function parseProfilePicture(result) {
    const pictureNode = (0, helpers_1.findNodeChild)(result, nodes_1.WA_NODE_TAGS.PICTURE);
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
    const pictureNode = (0, helpers_1.findNodeChild)(result, nodes_1.WA_NODE_TAGS.PICTURE);
    return pictureNode?.attrs.id ?? null;
}
function parseUsyncProfiles(result) {
    const userNodes = (0, usync_1.iterateUsyncUsers)(result) ?? [];
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
            if (child.tag === nodes_1.WA_NODE_TAGS.PICTURE) {
                const pictureId = (0, primitives_1.parseOptionalInt)(child.attrs.id);
                if (pictureId !== undefined) {
                    info.pictureId = pictureId;
                }
            }
            else if (child.tag === nodes_1.WA_NODE_TAGS.STATUS) {
                const code = child.attrs.code;
                if ((0, primitives_1.parseOptionalInt)(code) === 401) {
                    info.status = '';
                }
                else {
                    info.status = (0, helpers_1.getNodeTextContent)(child) || null;
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
    const userNodes = (0, usync_1.iterateUsyncUsers)(result) ?? [];
    const results = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const userContent = userNode.content;
        if (!Array.isArray(userContent))
            continue;
        for (let j = 0; j < userContent.length; j += 1) {
            const child = userContent[j];
            if (child.tag !== nodes_1.WA_NODE_TAGS.DISAPPEARING_MODE)
                continue;
            const errorNode = (0, helpers_1.findNodeChild)(child, nodes_1.WA_NODE_TAGS.ERROR);
            if (errorNode)
                continue;
            const duration = (0, primitives_1.parseOptionalInt)(child.attrs.duration) ?? 0;
            const timestamp = (0, primitives_1.parseOptionalInt)(child.attrs.t) ?? 0;
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
    const userNodes = (0, usync_1.iterateUsyncUsers)(result) ?? [];
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
        const textStatusNode = (0, helpers_1.findNodeChild)(userNode, nodes_1.WA_NODE_TAGS.TEXT_STATUS);
        if (textStatusNode && !(0, helpers_1.findNodeChild)(textStatusNode, nodes_1.WA_NODE_TAGS.ERROR)) {
            const emojiNode = (0, helpers_1.findNodeChild)(textStatusNode, 'emoji');
            entry = {
                jid,
                text: textStatusNode.attrs.text ?? null,
                emoji: emojiNode?.attrs.content ?? null,
                ephemeralDurationSec: (0, primitives_1.parseOptionalSignedInt)(textStatusNode.attrs.ephemeral_duration_sec) ?? null,
                lastUpdateTime: (0, primitives_1.parseOptionalInt)(textStatusNode.attrs.last_update_time) ?? null
            };
        }
        results[count] = entry;
        count += 1;
    }
    results.length = count;
    return results;
}
function parseUsyncUsernames(result) {
    const userNodes = (0, usync_1.iterateUsyncUsers)(result) ?? [];
    const results = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const jid = userNode.attrs.jid;
        if (!jid)
            continue;
        const usernameNode = (0, helpers_1.findNodeChild)(userNode, nodes_1.WA_NODE_TAGS.USERNAME);
        const hasUsernameError = usernameNode && (0, helpers_1.findNodeChild)(usernameNode, nodes_1.WA_NODE_TAGS.ERROR) !== undefined;
        const rawUsername = usernameNode && !hasUsernameError ? (0, helpers_1.getNodeTextContent)(usernameNode) || null : null;
        const username = rawUsername !== null ? (0, username_1.normalizeUsername)(rawUsername) : null;
        results[count] = { jid, username };
        count += 1;
    }
    results.length = count;
    return results;
}
/** Reports the failing rule, never the rejected handle. */
function assertValidUsername(username) {
    const validation = (0, username_1.validateUsernameLocally)(username);
    if (!validation.isValid) {
        throw new Error(`invalid username: ${validation.errorType}`);
    }
}
/**
 * The key is a recovery secret, so a rejection describes the expected shape and
 * never echoes the value - callers routinely log the errors they catch.
 */
function assertValidUsernameKey(key) {
    if (key !== undefined && !(0, username_1.isUsernameKey)(key)) {
        throw new Error(`invalid username key: expected ${username_1.WA_USERNAME_LIMITS.KEY_LENGTH} digits`);
    }
}
/**
 * An `<error>` child or `type="out"` means the handle did not resolve, a
 * missing `jid` means the lookup key is required, anything else resolves.
 */
function parseUsernameLookup(result) {
    const userNodes = (0, usync_1.iterateUsyncUsers)(result) ?? [];
    if (userNodes.length !== 1)
        return { status: 'not-found' };
    const userNode = userNodes[0];
    const contactNode = (0, helpers_1.findNodeChild)(userNode, nodes_1.WA_NODE_TAGS.CONTACT);
    if (contactNode && (0, helpers_1.findNodeChild)(contactNode, nodes_1.WA_NODE_TAGS.ERROR)) {
        return { status: 'not-found' };
    }
    const rawUsername = contactNode?.attrs.username;
    const username = rawUsername !== undefined ? (0, username_1.normalizeUsername)(rawUsername) : null;
    if (contactNode?.attrs.type === 'out')
        return { status: 'not-found' };
    const jid = userNode.attrs.jid;
    if (!jid)
        return { status: 'key-required', username };
    const businessNode = (0, helpers_1.findNodeChild)(userNode, nodes_1.WA_NODE_TAGS.BUSINESS);
    return {
        status: 'found',
        jid,
        username,
        isBusiness: businessNode !== undefined && !(0, helpers_1.findNodeChild)(businessNode, nodes_1.WA_NODE_TAGS.ERROR),
        pnJid: businessNode?.attrs.pn_jid ?? null
    };
}
function parseOwnUsernameMexResponse(data) {
    const info = (0, coercion_1.tryAsRecord)((0, coercion_1.tryAsRecord)(data?.xwa2_username_get)?.username_info);
    return {
        username: (0, coercion_1.tryAsString)(info?.username),
        state: (0, coercion_1.tryAsString)(info?.state),
        pin: (0, coercion_1.tryAsString)(info?.pin)
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
function createProfileCoordinator(options) {
    const { queryWithContext, generateSid, mexSocket, queryLidsByPhoneJids, mutations, applyOwnPushName, resolvePrivacyTokenNode, logger } = options;
    return {
        getProfilePicture: async (jid, type, existingId) => {
            const privacyTokenNode = (await resolvePrivacyTokenNode(jid)) ?? undefined;
            const node = (0, profile_1.buildGetProfilePictureIq)(jid, type, existingId, privacyTokenNode);
            const result = await queryWithContext('profile.getPicture', node, undefined, {
                jid,
                type: type ?? 'preview'
            });
            (0, query_1.assertIqResult)(result, 'profile.getPicture');
            return parseProfilePicture(result);
        },
        setProfilePicture: async (imageBytes, targetJid) => {
            const node = (0, profile_1.buildSetProfilePictureIq)(imageBytes, targetJid);
            const result = await queryWithContext('profile.setPicture', node, undefined, {
                targetJid,
                size: imageBytes.length
            });
            (0, query_1.assertIqResult)(result, 'profile.setPicture');
            return parseSetPictureResult(result);
        },
        deleteProfilePicture: async (targetJid) => {
            const node = (0, profile_1.buildDeleteProfilePictureIq)(targetJid);
            const result = await queryWithContext('profile.deletePicture', node, undefined, {
                targetJid
            });
            (0, query_1.assertIqResult)(result, 'profile.deletePicture');
        },
        getStatus: async (jid) => {
            const sid = await generateSid();
            const queryNodes = (0, profile_1.buildGetStatusUsyncQueryNodes)();
            const privacyTokenNode = await resolvePrivacyTokenNode(jid);
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes: [queryNodes[1]],
                users: [{ jid, ...(privacyTokenNode ? { content: [privacyTokenNode] } : {}) }]
            });
            const result = await queryWithContext('profile.getStatus', usyncNode, undefined, {
                jid
            });
            (0, query_1.assertIqResult)(result, 'profile.getStatus');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'profile.getStatus');
            return parseUsyncStatus(result);
        },
        setStatus: async (text) => {
            const node = (0, profile_1.buildSetStatusIq)(text);
            const result = await queryWithContext('profile.setStatus', node, undefined, undefined, {
                useSystemId: true
            });
            (0, query_1.assertIqResult)(result, 'profile.setStatus');
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
            const queryProtocolNodes = (0, profile_1.buildGetStatusUsyncQueryNodes)();
            const users = await Promise.all(jids.map(async (jid) => {
                const privacyTokenNode = await resolvePrivacyTokenNode(jid);
                return { jid, ...(privacyTokenNode ? { content: [privacyTokenNode] } : {}) };
            }));
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes,
                users
            });
            const result = await queryWithContext('profile.getProfiles', usyncNode, undefined, {
                count: jids.length
            });
            (0, query_1.assertIqResult)(result, 'profile.getProfiles');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'profile.getProfiles');
            return parseUsyncProfiles(result);
        },
        getDisappearingMode: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes: [(0, profile_1.buildGetDisappearingModeUsyncQueryNode)()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('profile.getDisappearingMode', usyncNode, undefined, { count: jids.length });
            (0, query_1.assertIqResult)(result, 'profile.getDisappearingMode');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'profile.getDisappearingMode');
            return parseUsyncDisappearingModes(result);
        },
        setDisappearingMode: async (durationSeconds) => {
            if (!Number.isFinite(durationSeconds) ||
                !Number.isSafeInteger(durationSeconds) ||
                durationSeconds < 0) {
                throw new Error(`invalid durationSeconds: ${durationSeconds}`);
            }
            const node = (0, profile_1.buildSetDisappearingModeIq)(durationSeconds);
            const result = await queryWithContext('profile.setDisappearingMode', node, undefined, {
                durationSeconds
            });
            (0, query_1.assertIqResult)(result, 'profile.setDisappearingMode');
        },
        getTextStatuses: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes: [(0, profile_1.buildGetTextStatusUsyncQueryNode)()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('profile.getTextStatuses', usyncNode, undefined, {
                count: jids.length
            });
            (0, query_1.assertIqResult)(result, 'profile.getTextStatuses');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'profile.getTextStatuses');
            return parseUsyncTextStatuses(result);
        },
        setTextStatus: async (input) => {
            await (0, client_1.runMexQuery)(mexSocket, 'UpdateTextStatus', {
                input: buildTextStatusMutationInput(input)
            });
        },
        getUsernames: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes: [(0, profile_1.buildGetUsernameUsyncQueryNode)()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('profile.getUsernames', usyncNode, undefined, {
                count: jids.length
            });
            (0, query_1.assertIqResult)(result, 'profile.getUsernames');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'profile.getUsernames');
            return parseUsyncUsernames(result);
        },
        resolveUsername: async (input) => {
            const parsed = (0, username_1.splitUsernameHandle)(input.username);
            assertValidUsername(parsed.username);
            const usernameKey = input.usernameKey ?? parsed.usernameKey ?? undefined;
            assertValidUsernameKey(usernameKey);
            const sid = await generateSid();
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes: (0, profile_1.buildUsernameLookupUsyncQueryNodes)(),
                users: [
                    {
                        content: [
                            (0, profile_1.buildUsernameLookupContactNode)({
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
            (0, query_1.assertIqResult)(result, 'profile.resolveUsername');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'profile.resolveUsername');
            return parseUsernameLookup(result);
        },
        getOwnUsername: async () => {
            try {
                const data = await (0, client_1.runMexQuery)(mexSocket, 'GetUsername', {});
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
            const username = (0, username_1.normalizeUsername)(input.username.trim());
            assertValidUsername(username);
            const data = await (0, client_1.runMexQuery)(mexSocket, 'SetUsername', {
                input: username,
                reserved: input.reserved ?? false,
                session_id: input.sessionId ?? '',
                source: input.source ?? 'USER_INPUT'
            });
            return isMexSetUsernameSuccess(data);
        },
        deleteUsername: async () => {
            const data = await (0, client_1.runMexQuery)(mexSocket, 'SetUsername', {});
            return isMexSetUsernameSuccess(data);
        },
        getAboutStatus: async (jid) => {
            const data = await (0, client_1.runMexQuery)(mexSocket, 'FetchAboutStatus', {
                user: { user_id: (0, jid_1.parseJidFull)(jid).address.user }
            });
            return parseAboutStatusMexResponse(data);
        },
        checkUsernameAvailability: async (username) => {
            const data = await (0, client_1.runMexQuery)(mexSocket, 'UsernameAvailability', {
                input: username
            });
            return parseUsernameAvailabilityMexResponse(data);
        },
        setUsernameKey: async (pin) => {
            assertValidUsernameKey(pin);
            const data = await (0, client_1.runMexQuery)(mexSocket, 'SetUsernameKey', { pin });
            return isMexUsernameKeySetSuccess(data);
        },
        getLidsByPhoneNumbers: async (phoneNumbers) => {
            if (phoneNumbers.length === 0)
                return [];
            const normalizedPhoneJids = new Array(phoneNumbers.length);
            for (let index = 0; index < phoneNumbers.length; index += 1) {
                normalizedPhoneJids[index] = (0, jid_1.parsePhoneJid)(phoneNumbers[index]);
            }
            logger.trace('profile.getLidsByPhoneNumbers', {
                phones: normalizedPhoneJids.length
            });
            return queryLidsByPhoneJids(normalizedPhoneJids);
        }
    };
}
