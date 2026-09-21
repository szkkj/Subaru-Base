"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMediaConnIq = buildMediaConnIq;
const constants_1 = require("../../../protocol/constants");
const query_1 = require("../../node/query");
function buildMediaConnIq() {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.MEDIA, [
        {
            tag: constants_1.WA_NODE_TAGS.MEDIA_CONN,
            attrs: {}
        }
    ]);
}
