"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGetAbPropsIq = buildGetAbPropsIq;
const abprops_1 = require("../../../protocol/abprops");
const constants_1 = require("../../../protocol/constants");
const query_1 = require("../../node/query");
function buildGetAbPropsIq(options) {
    const propsAttrs = {
        protocol: abprops_1.WA_ABPROPS_PROTOCOL_VERSION
    };
    if (options?.hash) {
        propsAttrs.hash = options.hash;
    }
    if (options?.refreshId !== undefined && options.refreshId !== null) {
        propsAttrs.refresh_id = `${options.refreshId}`;
    }
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.ABPROPS, [
        {
            tag: 'props',
            attrs: propsAttrs
        }
    ]);
}
