import { WA_PRIVACY_TOKEN_TAGS } from '../../protocol/privacy-token.js';
import { findNodeChild, getNodeChildren } from '../../transport/node/helpers.js';
import { asNumber } from '../../util/coercion.js';
export function parsePrivacyTokenNotification(node) {
    const tokensNode = findNodeChild(node, WA_PRIVACY_TOKEN_TAGS.TOKENS);
    if (!tokensNode) {
        return [];
    }
    const children = getNodeChildren(tokensNode);
    const result = [];
    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (child.tag !== WA_PRIVACY_TOKEN_TAGS.TOKEN) {
            continue;
        }
        const type = child.attrs.type;
        if (!type) {
            continue;
        }
        const rawTimestamp = child.attrs.t;
        if (!rawTimestamp) {
            continue;
        }
        const content = child.content;
        if (!(content instanceof Uint8Array)) {
            continue;
        }
        result[result.length] = {
            type,
            tokenBytes: content,
            timestampS: asNumber(Number(rawTimestamp), 'privacy_token.t')
        };
    }
    return result;
}
