"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGetPrivacySettingsIq = buildGetPrivacySettingsIq;
exports.buildSetPrivacyCategoryIq = buildSetPrivacyCategoryIq;
exports.buildGetPrivacyDisallowedListIq = buildGetPrivacyDisallowedListIq;
exports.buildSetPrivacyDisallowedListIq = buildSetPrivacyDisallowedListIq;
exports.buildGetBlocklistIq = buildGetBlocklistIq;
exports.buildBlocklistBlockIq = buildBlocklistBlockIq;
exports.buildBlocklistUnblockIq = buildBlocklistUnblockIq;
const defaults_1 = require("../../../protocol/defaults");
const message_1 = require("../../../protocol/message");
const nodes_1 = require("../../../protocol/nodes");
const privacy_1 = require("../../../protocol/privacy");
const query_1 = require("../../node/query");
/**
 * `<privacy>` attrs for a disallowed-list stanza. LID-migrated accounts must
 * carry `addressing_mode="lid"`; the server answers `400: bad-request`
 * without it, whatever the category's current value is.
 */
function buildPrivacyEnvelopeAttrs(lidAddressing) {
    return lidAddressing ? { addressing_mode: message_1.WA_ADDRESSING_MODES.LID } : {};
}
function buildGetPrivacySettingsIq() {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.PRIVACY, [
        { tag: nodes_1.WA_NODE_TAGS.PRIVACY, attrs: {} }
    ]);
}
function buildSetPrivacyCategoryIq(category, value) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.PRIVACY, [
        {
            tag: nodes_1.WA_NODE_TAGS.PRIVACY,
            attrs: {},
            content: [
                {
                    tag: privacy_1.WA_PRIVACY_TAGS.CATEGORY,
                    attrs: { name: category, value }
                }
            ]
        }
    ]);
}
/**
 * Builds the disallowed-list `get` IQ. Pass `lidAddressing` for LID-migrated
 * accounts - see {@link buildPrivacyEnvelopeAttrs}.
 */
function buildGetPrivacyDisallowedListIq(category, lidAddressing) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.PRIVACY, [
        {
            tag: nodes_1.WA_NODE_TAGS.PRIVACY,
            attrs: buildPrivacyEnvelopeAttrs(lidAddressing),
            content: [
                {
                    tag: privacy_1.WA_PRIVACY_TAGS.LIST,
                    attrs: { name: category, value: privacy_1.WA_PRIVACY_VALUES.CONTACT_BLACKLIST }
                }
            ]
        }
    ]);
}
/**
 * Builds the disallowed-list `set` IQ. The category value and the list
 * entries travel in the same stanza - the deny-list is not a separate
 * endpoint - and `dhash` is the version stamp the server handed out on the
 * last write/read (`'none'` when the client holds none). A stale stamp is
 * rejected with `409`, which the caller resolves by refetching the list and
 * retrying.
 */
function buildSetPrivacyDisallowedListIq(category, entries, dhash, lidAddressing) {
    const users = new Array(entries.length);
    for (let i = 0; i < entries.length; i += 1) {
        users[i] = {
            tag: privacy_1.WA_PRIVACY_TAGS.USER,
            attrs: buildDisallowedListUserAttrs(entries[i], lidAddressing)
        };
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.PRIVACY, [
        {
            tag: nodes_1.WA_NODE_TAGS.PRIVACY,
            attrs: buildPrivacyEnvelopeAttrs(lidAddressing),
            content: [
                {
                    tag: privacy_1.WA_PRIVACY_TAGS.CATEGORY,
                    attrs: {
                        name: category,
                        value: privacy_1.WA_PRIVACY_VALUES.CONTACT_BLACKLIST,
                        dhash: dhash ?? privacy_1.WA_PRIVACY_DHASH_NONE
                    },
                    content: users
                }
            ]
        }
    ]);
}
function buildDisallowedListUserAttrs(entry, lidAddressing) {
    if (lidAddressing && entry.lidJid !== null) {
        if (entry.username) {
            return { action: entry.action, jid: entry.lidJid, username: entry.username };
        }
        return entry.pnJid !== null
            ? { action: entry.action, jid: entry.lidJid, pn_jid: entry.pnJid }
            : { action: entry.action, jid: entry.lidJid };
    }
    const jid = entry.pnJid ?? entry.lidJid;
    if (jid === null) {
        throw new Error('privacy disallowed-list entry has no addressable jid');
    }
    return { action: entry.action, jid };
}
function buildGetBlocklistIq() {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.BLOCKLIST);
}
/**
 * The one identifier attribute a migrated block carries next to `jid`, in
 * wa-web's precedence. It splits the display name in two - a saved-contact
 * name decides the username/pn flip, a separate LID display name is the
 * fallback identifier - while the record here has a single `displayName`
 * filling both roles.
 */
function resolveBlocklistIdentifierAttrs(target) {
    const { pnJid, username, displayName } = target;
    if (pnJid && username) {
        return displayName ? { pn_jid: pnJid } : { username };
    }
    if (username)
        return { username };
    if (pnJid)
        return { pn_jid: pnJid };
    if (displayName)
        return { display_name: displayName };
    return { unknown_identifier: 'true' };
}
/**
 * Builds the blocklist `set` IQ for a block action. LID-migrated targets are
 * addressed by the LID jid plus one identifier attribute (see
 * {@link resolveBlocklistIdentifierAttrs}). Non-migrated targets are addressed
 * by the phone jid alone. The server rejects a block that addresses a migrated
 * account by phone jid or omits the identifier (`400: bad-request`).
 */
function buildBlocklistBlockIq(target) {
    let attrs;
    if (target.lidJid !== null) {
        attrs = {
            action: 'block',
            jid: target.lidJid,
            ...resolveBlocklistIdentifierAttrs(target)
        };
    }
    else {
        attrs = { action: 'block', jid: target.pnJid };
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.BLOCKLIST, [
        {
            tag: 'item',
            attrs
        }
    ]);
}
/**
 * Builds the blocklist `set` IQ for an unblock action. The server keys
 * migrated entries by LID, so `jid` must be the LID jid when one exists.
 */
function buildBlocklistUnblockIq(jid) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.BLOCKLIST, [
        {
            tag: 'item',
            attrs: { jid, action: 'unblock' }
        }
    ]);
}
