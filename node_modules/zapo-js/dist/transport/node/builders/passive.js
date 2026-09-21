"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPassiveModeIqNode = buildPassiveModeIqNode;
const constants_1 = require("../../../protocol/constants");
const query_1 = require("../../node/query");
function buildPassiveModeIqNode(mode) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.PASSIVE, [
        { tag: mode, attrs: {} }
    ]);
}
