"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrivacyTokenIqNode = buildPrivacyTokenIqNode;
exports.buildTcTokenMessageNode = buildTcTokenMessageNode;
exports.buildCsTokenMessageNode = buildCsTokenMessageNode;
const defaults_1 = require("../../../protocol/defaults");
const jid_1 = require("../../../protocol/jid");
const nodes_1 = require("../../../protocol/nodes");
const privacy_token_1 = require("../../../protocol/privacy-token");
const query_1 = require("../../node/query");
function buildPrivacyTokenIqNode(input) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.PRIVACY, [
        {
            tag: privacy_token_1.WA_PRIVACY_TOKEN_TAGS.TOKENS,
            attrs: {},
            content: [
                {
                    tag: privacy_token_1.WA_PRIVACY_TOKEN_TAGS.TOKEN,
                    attrs: {
                        jid: (0, jid_1.toUserJid)(input.jid),
                        t: String(input.timestampS),
                        type: input.type ?? privacy_token_1.WA_PRIVACY_TOKEN_TYPES.TRUSTED_CONTACT
                    }
                }
            ]
        }
    ]);
}
function buildTcTokenMessageNode(token) {
    return {
        tag: privacy_token_1.WA_PRIVACY_TOKEN_TAGS.TC_TOKEN,
        attrs: {},
        content: token
    };
}
function buildCsTokenMessageNode(hash) {
    return {
        tag: privacy_token_1.WA_PRIVACY_TOKEN_TAGS.CS_TOKEN,
        attrs: {},
        content: hash
    };
}
