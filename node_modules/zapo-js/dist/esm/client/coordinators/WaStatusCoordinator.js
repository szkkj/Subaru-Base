import { proto } from '../../proto.js';
import { WA_DEFAULTS } from '../../protocol/defaults.js';
/** Builds a {@link WaStatusCoordinator} from its dependencies. */
export function createStatusCoordinator(options) {
    return {
        setPrivacy: (input) => options.appStateMutations.setStatusPrivacy(input),
        setUserMuted: (jid, muted) => options.appStateMutations.setUserStatusMute(jid, muted),
        send: async (input) => {
            const built = await options.buildMessageContent(input.content);
            const message = built.message.conversation && !built.message.extendedTextMessage
                ? {
                    ...built.message,
                    conversation: null,
                    extendedTextMessage: {
                        text: built.message.conversation
                    }
                }
                : built.message;
            const published = await options.publishStatusMessage({
                message,
                recipients: input.recipients,
                statusSetting: input.statusSetting,
                options: input.options
            });
            return built.upload ? { ...published, upload: built.upload } : published;
        },
        revokeStatus: async (input) => {
            const message = {
                protocolMessage: {
                    type: proto.Message.ProtocolMessage.Type.REVOKE,
                    key: {
                        remoteJid: WA_DEFAULTS.STATUS_BROADCAST_JID,
                        fromMe: true,
                        id: input.messageId
                    }
                }
            };
            return options.publishStatusMessage({
                message,
                recipients: input.recipients,
                statusSetting: input.statusSetting,
                options: input.options
            });
        }
    };
}
