import { WA_DEFAULTS } from '../../../protocol/defaults.js';
import { WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../../protocol/nodes.js';
import { buildIqNode } from '../../node/query.js';
const BOT_LIST_VERSION = '2';
export function buildBotListIq(version = BOT_LIST_VERSION) {
    return buildIqNode(WA_IQ_TYPES.GET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.BOT, [
        {
            tag: WA_NODE_TAGS.BOT,
            attrs: { v: version }
        }
    ]);
}
export function buildGetBotProfileUsyncQueryNode() {
    return {
        tag: WA_NODE_TAGS.BOT,
        attrs: {},
        content: [
            {
                tag: 'profile',
                attrs: { v: '1' }
            }
        ]
    };
}
export function buildBotProfileUsyncUserNodeContent(personaId) {
    return [
        {
            tag: WA_NODE_TAGS.BOT,
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
