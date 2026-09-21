import { WA_DEFAULTS } from '../../../protocol/defaults.js';
import { toUserJid } from '../../../protocol/jid.js';
import { WA_IQ_TYPES, WA_XMLNS } from '../../../protocol/nodes.js';
import { WA_PRIVACY_TOKEN_TAGS, WA_PRIVACY_TOKEN_TYPES } from '../../../protocol/privacy-token.js';
import { buildIqNode } from '../../node/query.js';
export function buildPrivacyTokenIqNode(input) {
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.PRIVACY, [
        {
            tag: WA_PRIVACY_TOKEN_TAGS.TOKENS,
            attrs: {},
            content: [
                {
                    tag: WA_PRIVACY_TOKEN_TAGS.TOKEN,
                    attrs: {
                        jid: toUserJid(input.jid),
                        t: String(input.timestampS),
                        type: input.type ?? WA_PRIVACY_TOKEN_TYPES.TRUSTED_CONTACT
                    }
                }
            ]
        }
    ]);
}
export function buildTcTokenMessageNode(token) {
    return {
        tag: WA_PRIVACY_TOKEN_TAGS.TC_TOKEN,
        attrs: {},
        content: token
    };
}
export function buildCsTokenMessageNode(hash) {
    return {
        tag: WA_PRIVACY_TOKEN_TAGS.CS_TOKEN,
        attrs: {},
        content: hash
    };
}
