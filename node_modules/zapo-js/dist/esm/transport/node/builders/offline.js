import { WA_NODE_TAGS } from '../../../protocol/constants.js';
export function buildOfflineBatchNode(count) {
    return {
        tag: WA_NODE_TAGS.INFO_BULLETIN,
        attrs: {},
        content: [
            {
                tag: 'offline_batch',
                attrs: { count: String(count) },
                content: undefined
            }
        ]
    };
}
