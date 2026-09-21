"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLowLevelCoordinator = createLowLevelCoordinator;
const constants_1 = require("../../protocol/constants");
const primitives_1 = require("../../util/primitives");
/** Builds a {@link WaLowLevelCoordinator} from its transport dependencies. */
function createLowLevelCoordinator(options) {
    const { logger, nodeOrchestrator, incomingNode, receiptQueue, isConnected } = options;
    const defaultIqTimeoutMs = options.defaultIqTimeoutMs ?? constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS;
    return {
        sendNode: async (node) => {
            try {
                await nodeOrchestrator.sendNode(node);
            }
            catch (error) {
                const normalized = (0, primitives_1.toError)(error);
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
