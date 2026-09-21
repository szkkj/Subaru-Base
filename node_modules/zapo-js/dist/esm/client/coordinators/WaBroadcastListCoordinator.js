/** Builds a {@link WaBroadcastListCoordinator} from its dependencies. */
export function createBroadcastListCoordinator(options) {
    return {
        setList: (input) => options.appStateMutations.setBroadcastList(input),
        removeList: (id) => options.appStateMutations.removeBroadcastList(id),
        send: async (input) => {
            const built = await options.buildMessageContent(input.content);
            const published = await options.publishBroadcastListMessage({
                listJid: input.listJid,
                message: built.message,
                recipients: input.recipients,
                options: input.options
            });
            return built.upload ? { ...published, upload: built.upload } : published;
        }
    };
}
