import { isGroupJid } from '../../protocol/jid.js';
import { buildChatstateNode } from '../../transport/node/builders/chatstate.js';
import { buildPresenceNode, buildPresenceSubscribeNode } from '../../transport/node/builders/presence.js';
/** Builds a {@link WaPresenceCoordinator} from its node-send dependency. */
export function createPresenceCoordinator(options) {
    const { sendNode, getCurrentCredentials, resolvePrivacyTokenNode } = options;
    return {
        send: async (type) => {
            const credentials = getCurrentCredentials();
            await sendNode(buildPresenceNode({ type, name: credentials?.meDisplayName ?? undefined }));
        },
        sendChatstate: async (jid, opts) => {
            await sendNode(buildChatstateNode({ jid, ...opts }));
        },
        subscribe: async (jid, opts) => {
            const privacyTokenNode = isGroupJid(jid) ? null : await resolvePrivacyTokenNode(jid);
            await sendNode(buildPresenceSubscribeNode({
                jid,
                ...opts,
                ...(privacyTokenNode ? { privacyTokenNode } : {})
            }));
        }
    };
}
