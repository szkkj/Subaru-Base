"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePrivacyTokenNotification = parsePrivacyTokenNotification;
const privacy_token_1 = require("../../protocol/privacy-token");
const helpers_1 = require("../../transport/node/helpers");
const coercion_1 = require("../../util/coercion");
function parsePrivacyTokenNotification(node) {
    const tokensNode = (0, helpers_1.findNodeChild)(node, privacy_token_1.WA_PRIVACY_TOKEN_TAGS.TOKENS);
    if (!tokensNode) {
        return [];
    }
    const children = (0, helpers_1.getNodeChildren)(tokensNode);
    const result = [];
    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (child.tag !== privacy_token_1.WA_PRIVACY_TOKEN_TAGS.TOKEN) {
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
            timestampS: (0, coercion_1.asNumber)(Number(rawTimestamp), 'privacy_token.t')
        };
    }
    return result;
}
