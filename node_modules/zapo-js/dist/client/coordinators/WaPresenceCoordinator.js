"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPresenceCoordinator = createPresenceCoordinator;
const jid_1 = require("../../protocol/jid");
const chatstate_1 = require("../../transport/node/builders/chatstate");
const presence_1 = require("../../transport/node/builders/presence");
/** Builds a {@link WaPresenceCoordinator} from its node-send dependency. */
function createPresenceCoordinator(options) {
    const { sendNode, getCurrentCredentials, resolvePrivacyTokenNode } = options;
    return {
        send: async (type) => {
            const credentials = getCurrentCredentials();
            await sendNode((0, presence_1.buildPresenceNode)({ type, name: credentials?.meDisplayName ?? undefined }));
        },
        sendChatstate: async (jid, opts) => {
            await sendNode((0, chatstate_1.buildChatstateNode)({ jid, ...opts }));
        },
        subscribe: async (jid, opts) => {
            const privacyTokenNode = (0, jid_1.isGroupJid)(jid) ? null : await resolvePrivacyTokenNode(jid);
            await sendNode((0, presence_1.buildPresenceSubscribeNode)({
                jid,
                ...opts,
                ...(privacyTokenNode ? { privacyTokenNode } : {})
            }));
        }
    };
}
