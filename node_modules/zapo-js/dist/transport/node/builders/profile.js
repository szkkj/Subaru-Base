"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGetProfilePictureIq = buildGetProfilePictureIq;
exports.buildSetProfilePictureIq = buildSetProfilePictureIq;
exports.buildDeleteProfilePictureIq = buildDeleteProfilePictureIq;
exports.buildSetStatusIq = buildSetStatusIq;
exports.buildGetDisappearingModeUsyncQueryNode = buildGetDisappearingModeUsyncQueryNode;
exports.buildSetDisappearingModeIq = buildSetDisappearingModeIq;
exports.buildGetTextStatusUsyncQueryNode = buildGetTextStatusUsyncQueryNode;
exports.buildGetUsernameUsyncQueryNode = buildGetUsernameUsyncQueryNode;
exports.buildUsernameLookupUsyncQueryNodes = buildUsernameLookupUsyncQueryNodes;
exports.buildUsernameLookupContactNode = buildUsernameLookupContactNode;
exports.buildGetStatusUsyncQueryNodes = buildGetStatusUsyncQueryNodes;
const constants_1 = require("../../../protocol/constants");
const query_1 = require("../../node/query");
function buildGetProfilePictureIq(targetJid, type = 'preview', existingId, privacyTokenNode) {
    const pictureAttrs = {
        type,
        query: 'url'
    };
    if (existingId) {
        pictureAttrs.id = existingId;
    }
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.PROFILE_PICTURE, [
        {
            tag: constants_1.WA_NODE_TAGS.PICTURE,
            attrs: pictureAttrs,
            ...(privacyTokenNode ? { content: [privacyTokenNode] } : {})
        }
    ], {
        target: targetJid
    });
}
function buildSetProfilePictureIq(imageBytes, targetJid) {
    const attrs = {};
    if (targetJid) {
        attrs.target = targetJid;
    }
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.PROFILE_PICTURE, [
        {
            tag: constants_1.WA_NODE_TAGS.PICTURE,
            attrs: { type: 'image' },
            content: imageBytes
        }
    ], attrs);
}
function buildDeleteProfilePictureIq(targetJid) {
    const attrs = {};
    if (targetJid) {
        attrs.target = targetJid;
    }
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.PROFILE_PICTURE, undefined, attrs);
}
function buildSetStatusIq(text) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.STATUS, [
        {
            tag: constants_1.WA_NODE_TAGS.STATUS,
            attrs: {},
            content: text
        }
    ]);
}
function buildGetDisappearingModeUsyncQueryNode() {
    return {
        tag: constants_1.WA_NODE_TAGS.DISAPPEARING_MODE,
        attrs: {}
    };
}
function buildSetDisappearingModeIq(durationSeconds) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.DISAPPEARING_MODE, [
        {
            tag: constants_1.WA_NODE_TAGS.DISAPPEARING_MODE,
            attrs: { duration: String(durationSeconds) }
        }
    ]);
}
function buildGetTextStatusUsyncQueryNode() {
    return {
        tag: constants_1.WA_NODE_TAGS.TEXT_STATUS,
        attrs: {}
    };
}
function buildGetUsernameUsyncQueryNode() {
    return {
        tag: constants_1.WA_NODE_TAGS.USERNAME,
        attrs: {}
    };
}
/**
 * `contact` answers with the resolved user plus its reachability `type`,
 * `business` with the verified name. WhatsApp Web pins `contact` to LID
 * addressing here, so the lookup resolves to a LID.
 */
function buildUsernameLookupUsyncQueryNodes() {
    return [
        {
            tag: constants_1.WA_NODE_TAGS.CONTACT,
            attrs: { addressing_mode: constants_1.WA_ADDRESSING_MODES.LID }
        },
        {
            tag: constants_1.WA_NODE_TAGS.BUSINESS,
            attrs: {},
            content: [{ tag: 'verified_name', attrs: {} }]
        }
    ];
}
/**
 * The `<contact>` child identifying the account in a username lookup. It goes
 * inside a `<user>` carrying no `jid` - the handle is the identifier - with
 * the optional lookup key in `pin`.
 */
function buildUsernameLookupContactNode(input) {
    const attrs = { username: input.username };
    if (input.usernameKey) {
        attrs.pin = input.usernameKey;
    }
    return {
        tag: constants_1.WA_NODE_TAGS.CONTACT,
        attrs
    };
}
function buildGetStatusUsyncQueryNodes() {
    return [
        {
            tag: constants_1.WA_NODE_TAGS.CONTACT,
            attrs: {}
        },
        {
            tag: constants_1.WA_NODE_TAGS.STATUS,
            attrs: {}
        },
        {
            tag: constants_1.WA_NODE_TAGS.PICTURE,
            attrs: {}
        }
    ];
}
