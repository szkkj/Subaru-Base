import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../types';
interface WaNodeOrchestratorOptions {
    readonly logger: Logger;
    readonly sendNode: (node: BinaryNode) => Promise<void>;
    readonly defaultTimeoutMs?: number;
    readonly hostDomain?: string;
    /**
     * Resolved lazily on first id-generator creation (post-connect, after
     * credentials load) so a registered mobile session reconnecting without an
     * explicit `mobileTransport` option still picks the mobile id format.
     */
    readonly mobileIqIdFormat?: () => boolean;
}
/**
 * Issues outgoing binary nodes and matches incoming responses back to their
 * caller's IQ promises by stanza id. Owns the per-process id generator and
 * the in-flight query timeout map.
 */
export declare class WaNodeOrchestrator {
    private readonly logger;
    private readonly sendNodeFn;
    private readonly defaultTimeoutMs;
    private readonly hostDomain;
    private readonly mobileIqIdFormat;
    private idGenerator;
    private idGeneratorReady;
    private readonly pendingQueries;
    constructor(options: WaNodeOrchestratorOptions);
    hasPending(): boolean;
    clearPending(reason: Error): void;
    tryResolvePending(node: BinaryNode): boolean;
    handleIncomingNode(node: BinaryNode): Promise<boolean>;
    sendNode(node: BinaryNode, autoId?: boolean): Promise<void>;
    query(node: BinaryNode, timeoutMs?: number, options?: {
        readonly useSystemId?: boolean;
    }): Promise<BinaryNode>;
    private withAutoId;
    private getIdGenerator;
}
export {};
