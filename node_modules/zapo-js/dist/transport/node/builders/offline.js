"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOfflineBatchNode = buildOfflineBatchNode;
const constants_1 = require("../../../protocol/constants");
function buildOfflineBatchNode(count) {
    return {
        tag: constants_1.WA_NODE_TAGS.INFO_BULLETIN,
        attrs: {},
        content: [
            {
                tag: 'offline_batch',
                attrs: { count: String(count) },
                content: undefined
            }
        ]
    };
}
