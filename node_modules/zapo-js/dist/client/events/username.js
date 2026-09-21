"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOwnUsernameNotification = parseOwnUsernameNotification;
const incoming_1 = require("../events/incoming");
const nodes_1 = require("../../protocol/nodes");
const username_1 = require("../../protocol/username");
const helpers_1 = require("../../transport/node/helpers");
/**
 * Reads the `<username>` child of an `account_sync` notification, `null` when
 * there is none. The shapes are tried in WhatsApp Web's order, so
 * `action="modify"` wins over a handle when a stanza carries both.
 */
function parseOwnUsernameNotification(node) {
    const usernameNode = (0, helpers_1.findNodeChild)(node, nodes_1.WA_NODE_TAGS.USERNAME);
    if (!usernameNode)
        return null;
    const base = (0, incoming_1.createIncomingBaseEvent)(node);
    if (usernameNode.attrs.action === 'modify') {
        return { ...base, kind: 'modify', username: null };
    }
    const rawUsername = usernameNode.attrs.username;
    if (rawUsername !== undefined) {
        return { ...base, kind: 'set', username: (0, username_1.normalizeUsername)(rawUsername) };
    }
    return { ...base, kind: 'delete', username: null };
}
