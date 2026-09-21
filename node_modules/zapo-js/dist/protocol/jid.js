"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitJid = splitJid;
exports.normalizeRecipientJid = normalizeRecipientJid;
exports.isLidJid = isLidJid;
exports.isUserJid = isUserJid;
exports.isBotJid = isBotJid;
exports.isGroupJid = isGroupJid;
exports.isBroadcastJid = isBroadcastJid;
exports.isStatusBroadcastJid = isStatusBroadcastJid;
exports.isNewsletterJid = isNewsletterJid;
exports.isGroupOrBroadcastJid = isGroupOrBroadcastJid;
exports.parseSignalAddressFromJid = parseSignalAddressFromJid;
exports.parseJidFull = parseJidFull;
exports.canonicalizeSignalServer = canonicalizeSignalServer;
exports.canonicalizeSignalJid = canonicalizeSignalJid;
exports.toUserJid = toUserJid;
exports.isOwnAccountJid = isOwnAccountJid;
exports.canonicalizeOwnAccountJid = canonicalizeOwnAccountJid;
exports.normalizeDeviceJid = normalizeDeviceJid;
exports.applyDeviceToJid = applyDeviceToJid;
exports.isHostedDeviceId = isHostedDeviceId;
exports.isHostedServer = isHostedServer;
exports.isHostedDeviceJid = isHostedDeviceJid;
exports.buildDeviceJid = buildDeviceJid;
exports.getLoginIdentity = getLoginIdentity;
exports.parsePhoneJid = parsePhoneJid;
exports.signalAddressKey = signalAddressKey;
const constants_1 = require("./constants");
/**
 * Ordered by how often each server actually shows up in traffic, because
 * {@link internServerAt} scans it in order and stops at the first match:
 * the cost is the position of the hit, not the length of the list. LID is
 * the primary addressing mode, so `lid` leads and the phone domain follows
 * as the fallback; groups and status come next, and the rest are rare.
 * Keep new entries at the tail unless they are genuinely high-volume.
 */
const KNOWN_SERVERS = [
    constants_1.WA_DEFAULTS.LID_SERVER,
    constants_1.WA_DEFAULTS.HOST_DOMAIN,
    constants_1.WA_DEFAULTS.GROUP_SERVER,
    constants_1.WA_DEFAULTS.BROADCAST_SERVER,
    constants_1.WA_DEFAULTS.NEWSLETTER_SERVER,
    constants_1.WA_DEFAULTS.HOSTED_SERVER,
    constants_1.WA_DEFAULTS.HOSTED_LID_SERVER,
    constants_1.WA_DEFAULTS.BOT_SERVER,
    constants_1.WA_DEFAULTS.MSGR_SERVER,
    constants_1.WA_DEFAULTS.INTEROP_SERVER
];
/**
 * Returns the canonical reference for the server segment of `jid` starting
 * at `from`, avoiding thousands of duplicate sliced copies (e.g. "lid",
 * "s.whatsapp.net") that would otherwise be created by repeated JID parsing.
 *
 * A linear scan beats a `Map` lookup here, and by a wide margin: the length
 * pre-check rejects nine of the ten candidates in one comparison, while the
 * `Map` has to hash the whole server string before it can probe. Do not
 * "optimize" this back into a hash lookup without benchmarking it. Matching
 * in place is a smaller second win – a known server allocates nothing, and
 * only an unrecognized one pays the `slice()`. Scanning a list also keeps
 * untrusted input like "toString" from resolving through the prototype
 * chain, which is why the original used a `Map` rather than an object.
 */
function internServerAt(jid, from) {
    const length = jid.length - from;
    for (let index = 0; index < KNOWN_SERVERS.length; index += 1) {
        const server = KNOWN_SERVERS[index];
        if (server.length === length && jid.startsWith(server, from))
            return server;
    }
    return jid.slice(from);
}
function extractDigits(input) {
    let digits = '';
    for (let index = 0; index < input.length; index += 1) {
        const code = input.charCodeAt(index);
        if (code >= 48 && code <= 57)
            digits += input[index];
    }
    return digits;
}
function findAtIndex(jid) {
    const atIndex = jid.indexOf('@');
    if (atIndex < 1 || atIndex >= jid.length - 1)
        throw new Error(`invalid jid: ${jid}`);
    return atIndex;
}
/**
 * Splits a JID into `user` and `server` parts at the `@` separator.
 * Throws if the input does not contain a valid `user@server` shape.
 */
function splitJid(jid) {
    const atIndex = findAtIndex(jid);
    return { user: jid.slice(0, atIndex), server: internServerAt(jid, atIndex + 1) };
}
/**
 * Normalizes a user-supplied recipient (phone number, group id, or full JID)
 * into a canonical JID. Strings already containing `@` are returned as-is;
 * dashed inputs map to `<input>@g.us` (group); pure-digit inputs map to
 * `<digits>@s.whatsapp.net`.
 */
function normalizeRecipientJid(to) {
    const input = to.trim();
    if (input.length === 0)
        throw new Error('recipient cannot be empty');
    let hasDash = false;
    for (let index = 0; index < input.length; index += 1) {
        const code = input.charCodeAt(index);
        if (code === 64)
            return input;
        if (code === 45) {
            hasDash = true;
        }
    }
    const digits = extractDigits(input);
    if (hasDash)
        return `${input}@${constants_1.WA_DEFAULTS.GROUP_SERVER}`;
    if (digits.length === 0)
        throw new Error(`invalid recipient: ${to}`);
    return `${digits}@${constants_1.WA_DEFAULTS.HOST_DOMAIN}`;
}
function isJidType(jid, type) {
    const atIndex = jid.length - type.length - 1;
    if (atIndex < 1 || jid.charCodeAt(atIndex) !== 64 || !jid.endsWith(type))
        return false;
    // Reject multi-@ JIDs (consistency with splitJid). Manual loop beats indexOf.
    for (let i = 0; i < atIndex; i += 1) {
        if (jid.charCodeAt(i) === 64)
            return false;
    }
    return true;
}
/** Returns `true` for JIDs in the `@lid` server (linked-device identity). */
function isLidJid(jid) {
    return isJidType(jid, constants_1.WA_DEFAULTS.LID_SERVER);
}
/** Returns `true` for JIDs in the `@s.whatsapp.net` server (phone-number user JIDs). */
function isUserJid(jid) {
    return isJidType(jid, constants_1.WA_DEFAULTS.HOST_DOMAIN);
}
/** Returns `true` for JIDs in the `@bot` server. */
function isBotJid(jid) {
    return isJidType(jid, constants_1.WA_DEFAULTS.BOT_SERVER);
}
/** Returns `true` for JIDs in the `@g.us` server (groups). */
function isGroupJid(jid) {
    return isJidType(jid, constants_1.WA_DEFAULTS.GROUP_SERVER);
}
/** Returns `true` for JIDs in the `@broadcast` server (broadcast lists). */
function isBroadcastJid(jid) {
    return isJidType(jid, constants_1.WA_DEFAULTS.BROADCAST_SERVER);
}
/** Returns `true` for the special `status@broadcast` JID. */
function isStatusBroadcastJid(jid) {
    return jid === constants_1.WA_DEFAULTS.STATUS_BROADCAST_JID;
}
/** Returns `true` for JIDs in the `@newsletter` server. */
function isNewsletterJid(jid) {
    return isJidType(jid, constants_1.WA_DEFAULTS.NEWSLETTER_SERVER);
}
/** Returns `true` for any group or broadcast JID. */
function isGroupOrBroadcastJid(jid) {
    return isGroupJid(jid) || isBroadcastJid(jid);
}
/**
 * Parses a JID into a Signal-style `{ user, server, device }` address.
 * `device` is `0` when the JID has no `:device` segment.
 */
function parseSignalAddressFromJid(jid) {
    const atIndex = findAtIndex(jid);
    const colonIndex = jid.indexOf(':', 0);
    const server = internServerAt(jid, atIndex + 1);
    if (colonIndex === -1 || colonIndex > atIndex) {
        return { user: jid.slice(0, atIndex), server, device: 0 };
    }
    if (colonIndex >= atIndex - 1)
        throw new Error(`invalid jid device: ${jid}`);
    let device = 0;
    for (let i = colonIndex + 1; i < atIndex; i += 1) {
        const digit = jid.charCodeAt(i) - 48;
        if (digit < 0 || digit > 9)
            throw new Error(`invalid jid device: ${jid}`);
        device = device * 10 + digit;
        if (device > Number.MAX_SAFE_INTEGER)
            throw new Error(`invalid jid device: ${jid}`);
    }
    return { user: jid.slice(0, colonIndex), server, device };
}
/**
 * Parses a JID and returns the Signal address plus the user-only and
 * fully-normalized device JID forms in a single pass.
 */
function parseJidFull(jid) {
    const address = parseSignalAddressFromJid(jid);
    const userJid = `${address.user}@${address.server}`;
    const normalizedJid = address.device === 0 ? userJid : `${address.user}:${address.device}@${address.server}`;
    return { address, userJid, normalizedJid };
}
/**
 * Maps the hosted-account server variants (`hosted` / `hosted.lid`) back to
 * their canonical Signal server (`hostDomain` / `lid`). Other servers are
 * returned unchanged.
 */
function canonicalizeSignalServer(server, hostDomain = constants_1.WA_DEFAULTS.HOST_DOMAIN) {
    if (server === constants_1.WA_DEFAULTS.HOSTED_SERVER)
        return hostDomain;
    if (server === constants_1.WA_DEFAULTS.HOSTED_LID_SERVER)
        return constants_1.WA_DEFAULTS.LID_SERVER;
    return server;
}
/**
 * Returns the JID rewritten with its server canonicalized via
 * {@link canonicalizeSignalServer} – used to derive the address Signal
 * sessions are keyed by.
 */
function canonicalizeSignalJid(jid, hostDomain = constants_1.WA_DEFAULTS.HOST_DOMAIN) {
    const address = parseSignalAddressFromJid(jid);
    const server = canonicalizeSignalServer(address.server ?? constants_1.WA_DEFAULTS.HOST_DOMAIN, hostDomain);
    if (address.device === 0)
        return `${address.user}@${server}`;
    return `${address.user}:${address.device}@${server}`;
}
/**
 * Returns `true` when the server segment of `jid` starting at `from` is one of
 * the hosted variants. Compares in place, so the common miss costs one length
 * check and allocates nothing. Callers that already located the `@` pass its
 * index rather than paying {@link isJidType}'s tail-anchored rescan.
 */
function isHostedServerAt(jid, from) {
    const length = jid.length - from;
    if (length === constants_1.WA_DEFAULTS.HOSTED_SERVER.length) {
        return jid.startsWith(constants_1.WA_DEFAULTS.HOSTED_SERVER, from);
    }
    if (length === constants_1.WA_DEFAULTS.HOSTED_LID_SERVER.length) {
        return jid.startsWith(constants_1.WA_DEFAULTS.HOSTED_LID_SERVER, from);
    }
    return false;
}
/**
 * Strips the `:device` segment from a JID, returning the bare `user@server`
 * form. Set `options.canonicalizeSignalServer` to also rewrite hosted servers
 * via {@link canonicalizeSignalServer}.
 */
function toUserJid(jid, options = {}) {
    const canonicalize = options.canonicalizeSignalServer === true;
    const atIndex = jid.indexOf('@');
    if (atIndex >= 1 && atIndex < jid.length - 1) {
        const colonIndex = jid.indexOf(':', 0);
        // Canonicalization only rewrites the hosted servers, so a deviceless JID
        // on any other server already is its own target form and can skip the
        // parse (which would slice the user out and allocate an address).
        if ((colonIndex === -1 || colonIndex > atIndex) &&
            (!canonicalize || !isHostedServerAt(jid, atIndex + 1))) {
            return jid;
        }
    }
    const address = parseSignalAddressFromJid(jid);
    const baseServer = address.server ?? constants_1.WA_DEFAULTS.HOST_DOMAIN;
    const server = canonicalize
        ? canonicalizeSignalServer(baseServer, options.hostDomain ?? constants_1.WA_DEFAULTS.HOST_DOMAIN)
        : baseServer;
    if (server === baseServer && jid.length === address.user.length + 1 + server.length) {
        return jid;
    }
    return `${address.user}@${server}`;
}
const CANONICAL_USER_JID_OPTIONS = Object.freeze({ canonicalizeSignalServer: true });
/**
 * True when `jid` is the account's own user, matching the `meJid` (pn) or
 * `meLid` (lid) identity device-insensitively. Mirrors WhatsApp Web's
 * `isMeAccount`, including its addressing-mode equivalence: a hosted device of
 * the account (`<user>@hosted` / `<user>@hosted.lid`) is the same account as
 * `<user>@s.whatsapp.net` / `<user>@lid`, so both sides are canonicalized
 * before comparison.
 */
function isOwnAccountJid(jid, meJid, meLid) {
    const candidateUser = toUserJid(jid, CANONICAL_USER_JID_OPTIONS);
    return ((!!meJid && toUserJid(meJid, CANONICAL_USER_JID_OPTIONS) === candidateUser) ||
        (!!meLid && toUserJid(meLid, CANONICAL_USER_JID_OPTIONS) === candidateUser));
}
/**
 * Rewrites the account's own PN device JID to its LID equivalent so self traffic
 * keys one LID session instead of forking into separate PN and LID ratchets.
 * No-op for other users, already-LID/unparseable JIDs, or unknown identity.
 */
function canonicalizeOwnAccountJid(jid, meJid, meLid) {
    if (!meJid || !meLid)
        return jid;
    let address;
    try {
        address = parseSignalAddressFromJid(jid);
    }
    catch {
        return jid;
    }
    if ((address.server ?? constants_1.WA_DEFAULTS.HOST_DOMAIN) !== constants_1.WA_DEFAULTS.HOST_DOMAIN)
        return jid;
    let mePnUser;
    let meLidUser;
    try {
        mePnUser = parseSignalAddressFromJid(meJid).user;
        meLidUser = parseSignalAddressFromJid(meLid).user;
    }
    catch {
        return jid;
    }
    if (address.user !== mePnUser)
        return jid;
    return address.device === 0
        ? `${meLidUser}@${constants_1.WA_DEFAULTS.LID_SERVER}`
        : `${meLidUser}:${address.device}@${constants_1.WA_DEFAULTS.LID_SERVER}`;
}
/**
 * Returns the JID in its full device form. JIDs with `device === 0` lose the
 * device segment (`user@server`); all others keep `user:device@server`.
 */
function normalizeDeviceJid(jid) {
    const address = parseSignalAddressFromJid(jid);
    if (address.device === 0)
        return `${address.user}@${address.server}`;
    return `${address.user}:${address.device}@${address.server}`;
}
/**
 * Appends `:device` to a bare user JID. A falsy `device` returns the input
 * unchanged.
 */
function applyDeviceToJid(userJid, device) {
    if (!device)
        return userJid;
    const address = parseSignalAddressFromJid(userJid);
    return buildDeviceJid(address.user, address.server ?? constants_1.WA_DEFAULTS.HOST_DOMAIN, device);
}
/** Returns `true` when `deviceId` matches the WhatsApp hosted-device id. */
function isHostedDeviceId(deviceId) {
    return deviceId === constants_1.WA_DEFAULTS.HOSTED_DEVICE_ID;
}
/** Returns `true` for the hosted server variants (`hosted` and `hosted.lid`). */
function isHostedServer(server) {
    return server === constants_1.WA_DEFAULTS.HOSTED_SERVER || server === constants_1.WA_DEFAULTS.HOSTED_LID_SERVER;
}
/**
 * Returns `true` when the JID refers to a hosted device – either by server
 * (`@hosted` / `@hosted.lid`) or by a `:HOSTED_DEVICE_ID@…` device segment.
 */
function isHostedDeviceJid(jid) {
    const atIndex = jid.indexOf('@');
    if (atIndex < 1 || atIndex >= jid.length - 1)
        return false;
    if (isHostedServerAt(jid, atIndex + 1))
        return true;
    const colonIndex = jid.indexOf(':');
    if (colonIndex < 0 || colonIndex >= atIndex - 1)
        return false;
    let deviceId = 0;
    for (let i = colonIndex + 1; i < atIndex; i += 1) {
        const digit = jid.charCodeAt(i) - 48;
        if (digit < 0 || digit > 9)
            return false;
        deviceId = deviceId * 10 + digit;
        if (deviceId > Number.MAX_SAFE_INTEGER)
            return false;
    }
    return isHostedDeviceId(deviceId);
}
/**
 * Builds a device JID from its parts. When `options.isHosted` is set, the
 * hosted-server variant is selected (preserving LID vs phone) and the canonical
 * hosted device id is used.
 */
function buildDeviceJid(user, normalizedServer, deviceId, options = {}) {
    if (options.isHosted === true) {
        if (!isHostedDeviceId(deviceId)) {
            return `${user}:${deviceId}@${normalizedServer}`;
        }
        const hostedServer = options.rawServer === constants_1.WA_DEFAULTS.HOSTED_LID_SERVER ||
            normalizedServer === constants_1.WA_DEFAULTS.LID_SERVER
            ? constants_1.WA_DEFAULTS.HOSTED_LID_SERVER
            : constants_1.WA_DEFAULTS.HOSTED_SERVER;
        return `${user}:${constants_1.WA_DEFAULTS.HOSTED_DEVICE_ID}@${hostedServer}`;
    }
    if (deviceId === 0) {
        return `${user}@${normalizedServer}`;
    }
    return `${user}:${deviceId}@${normalizedServer}`;
}
/**
 * Extracts the numeric username and device id from the authenticated user's
 * own JID. Throws when either segment is missing, non-numeric, or out of the
 * safe-integer range.
 */
function getLoginIdentity(meJid) {
    const atIndex = findAtIndex(meJid);
    const colonIndex = meJid.indexOf(':', 0);
    const dotIndex = meJid.indexOf('.', 0);
    const hasColon = colonIndex !== -1 && colonIndex < atIndex;
    const hasDot = dotIndex !== -1 && dotIndex < atIndex && (colonIndex === -1 || dotIndex < colonIndex);
    const userEndIndex = hasDot ? dotIndex : hasColon ? colonIndex : atIndex;
    const username = Number.parseInt(meJid.slice(0, userEndIndex), 10);
    const device = hasColon ? Number.parseInt(meJid.slice(colonIndex + 1, atIndex), 10) : 0;
    if (!Number.isSafeInteger(username) || username <= 0)
        throw new Error(`invalid numeric username from ${meJid}`);
    if (!Number.isSafeInteger(device) || device < 0)
        throw new Error(`invalid device from ${meJid}`);
    return { username, device };
}
/**
 * Builds a `<digits>@s.whatsapp.net` JID from a free-form phone number,
 * stripping non-digit characters. Throws when no digits are found.
 */
function parsePhoneJid(input) {
    const digits = extractDigits(input);
    if (!digits)
        throw new Error('phone number is empty after normalization');
    return `${digits}@${constants_1.WA_DEFAULTS.HOST_DOMAIN}`;
}
/**
 * Returns a stable `user|server|device` key for a Signal address, suitable
 * as a Map/Set key.
 */
function signalAddressKey(address) {
    const server = address.server ?? constants_1.WA_DEFAULTS.HOST_DOMAIN;
    return `${address.user}|${server}|${address.device}`;
}
