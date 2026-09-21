import { WA_DEFAULTS } from '../../protocol/constants.js';
import { toError } from '../../util/primitives.js';
/** Builds a {@link WaLowLevelCoordinator} from its transport dependencies. */
export function createLowLevelCoordinator(options) {
    const { logger, nodeOrchestrator, incomingNode, receiptQueue, isConnected } = options;
    const defaultIqTimeoutMs = options.defaultIqTimeoutMs ?? WA_DEFAULTS.IQ_TIMEOUT_MS;
    return {
        sendNode: async (node) => {
            try {
                await nodeOrchestrator.sendNode(node);
            }
            catch (error) {
                const normalized = toError(error);
                if (receiptQueue.shouldQueue(node, normalized)) {
                    receiptQueue.enqueue(node);
                    logger.warn('queued dangling receipt after send failure', {
                        id: node.attrs.id,
                        to: node.attrs.to,
                        message: normalized.message,
                        queueSize: receiptQueue.size()
                    });
                    return;
                }
                throw normalized;
            }
        },
        query: async (node, timeoutMs = defaultIqTimeoutMs, queryOptions = {}) => {
            if (!isConnected()) {
                throw new Error('client is not connected');
            }
            logger.debug('wa client query', { tag: node.tag, id: node.attrs.id, timeoutMs });
            return nodeOrchestrator.query(node, timeoutMs, queryOptions);
        },
        registerIncomingHandler: (registration) => incomingNode.registerIncomingHandler(registration),
        unregisterIncomingHandler: (registration) => incomingNode.unregisterIncomingHandler(registration),
        registerIncomingStanzaFilter: (filter) => incomingNode.registerIncomingStanzaFilter(filter)
    };
}
