"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRemoveCompanionDeviceIq = buildRemoveCompanionDeviceIq;
const defaults_1 = require("../../../protocol/defaults");
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
function buildRemoveCompanionDeviceIq(deviceJid, reason) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.MD, [
        {
            tag: 'remove-companion-device',
            attrs: { jid: deviceJid, reason }
        }
    ]);
}
