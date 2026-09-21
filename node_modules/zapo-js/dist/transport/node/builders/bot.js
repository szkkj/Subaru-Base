"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBotListIq = buildBotListIq;
exports.buildGetBotProfileUsyncQueryNode = buildGetBotProfileUsyncQueryNode;
exports.buildBotProfileUsyncUserNodeContent = buildBotProfileUsyncUserNodeContent;
const defaults_1 = require("../../../protocol/defaults");
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
const BOT_LIST_VERSION = '2';
function buildBotListIq(version = BOT_LIST_VERSION) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.BOT, [
        {
            tag: nodes_1.WA_NODE_TAGS.BOT,
            attrs: { v: version }
        }
    ]);
}
function buildGetBotProfileUsyncQueryNode() {
    return {
        tag: nodes_1.WA_NODE_TAGS.BOT,
        attrs: {},
        content: [
            {
                tag: 'profile',
                attrs: { v: '1' }
            }
        ]
    };
}
function buildBotProfileUsyncUserNodeContent(personaId) {
    return [
        {
            tag: nodes_1.WA_NODE_TAGS.BOT,
            attrs: {},
            content: [
                {
                    tag: 'profile',
                    attrs: personaId ? { persona_id: personaId } : {}
                }
            ]
        }
    ];
}
