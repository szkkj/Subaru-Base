"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAccountDevicesSyncIq = buildAccountDevicesSyncIq;
exports.buildAccountPictureSyncIq = buildAccountPictureSyncIq;
exports.buildAccountBlocklistSyncIq = buildAccountBlocklistSyncIq;
exports.buildListParticipatingGroupsIq = buildListParticipatingGroupsIq;
exports.buildNewsletterMetadataSyncIq = buildNewsletterMetadataSyncIq;
exports.buildClearDirtyBitsIq = buildClearDirtyBitsIq;
const constants_1 = require("../../../protocol/constants");
const usync_1 = require("../../node/builders/usync");
const query_1 = require("../../node/query");
function buildAccountDevicesSyncIq(userJids, sid) {
    return (0, usync_1.buildUsyncIq)({
        sid,
        context: constants_1.WA_USYNC_CONTEXTS.NOTIFICATION,
        queryProtocolNodes: [
            {
                tag: constants_1.WA_NODE_TAGS.DEVICES,
                attrs: {
                    version: '2'
                }
            }
        ],
        users: userJids.map((jid) => ({
            jid
        }))
    });
}
function buildAccountPictureSyncIq(meJid) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.PROFILE_PICTURE, [
        {
            tag: constants_1.WA_NODE_TAGS.PICTURE,
            attrs: {
                type: 'image',
                query: 'url'
            }
        }
    ], {
        target: meJid
    });
}
function buildAccountBlocklistSyncIq() {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.BLOCKLIST);
}
function buildListParticipatingGroupsIq() {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.GROUP_SERVER, constants_1.WA_XMLNS.GROUPS, [
        {
            tag: constants_1.WA_NODE_TAGS.PARTICIPATING,
            attrs: {},
            content: [
                {
                    tag: constants_1.WA_NODE_TAGS.PARTICIPANTS,
                    attrs: {}
                },
                {
                    tag: constants_1.WA_NODE_TAGS.DESCRIPTION,
                    attrs: {}
                }
            ]
        }
    ]);
}
function buildNewsletterMetadataSyncIq() {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.NEWSLETTER, [
        {
            tag: constants_1.WA_NODE_TAGS.MY_ADDONS,
            attrs: {
                limit: '1'
            }
        }
    ]);
}
function buildClearDirtyBitsIq(dirtyBits) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.DIRTY_BITS, dirtyBits.map((dirtyBit) => ({
        tag: 'clean',
        attrs: {
            type: dirtyBit.type,
            timestamp: `${dirtyBit.timestamp}`
        }
    })));
}
