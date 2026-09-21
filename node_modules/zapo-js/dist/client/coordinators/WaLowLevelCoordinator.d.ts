import type { WaReceiptQueue } from '../connection/WaReceiptQueue';
import type { WaIncomingNodeCoordinator } from '../coordinators/WaIncomingNodeCoordinator';
import type { WaIncomingNodeHandlerRegistration, WaIncomingStanzaFilter } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaNodeOrchestrator } from '../../transport/node/WaNodeOrchestrator';
import type { BinaryNode } from '../../transport/types';
/**
 * Raw escape hatch for sending nodes, issuing IQs, and registering custom
 * incoming-node handlers/filters. Accessed via {@link WaClient.lowlevel}.
 */
export interface WaLowLevelCoordinator {
    /**
     * Sends a raw stanza. Failures that look like a transient receipt-send
     * issue are buffered to the receipt queue and logged instead of thrown.
     */
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    /**
     * Sends an IQ stanza and awaits the matching response (within `timeoutMs`).
     * Throws when the client is not connected.
     */
    readonly query: (node: BinaryNode, timeoutMs?: number, options?: {
        readonly useSystemId?: boolean;
    }) => Promise<BinaryNode>;
    /**
     * Registers a handler for incoming nodes that match the registration's
     * tag/subtype filter. Returns an `unregister` function.
     */
    readonly registerIncomingHandler: (registration: WaIncomingNodeHandlerRegistration) => () => void;
    /** Removes a previously-registered incoming handler; returns `true` on success. */
    readonly unregisterIncomingHandler: (registration: WaIncomingNodeHandlerRegistration) => boolean;
    /**
     * Registers an incoming-stanza filter (runs before the typed handlers).
     * Returns an `unregister` function.
     */
    readonly registerIncomingStanzaFilter: (filter: WaIncomingStanzaFilter) => () => void;
}
interface WaLowLevelCoordinatorOptions {
    readonly logger: Logger;
    readonly nodeOrchestrator: WaNodeOrchestrator;
    readonly incomingNode: WaIncomingNodeCoordinator;
    readonly receiptQueue: WaReceiptQueue;
    readonly isConnected: () => boolean;
    readonly defaultIqTimeoutMs?: number;
}
/** Builds a {@link WaLowLevelCoordinator} from its transport dependencies. */
export declare function createLowLevelCoordinator(options: WaLowLevelCoordinatorOptions): WaLowLevelCoordinator;
export {};
