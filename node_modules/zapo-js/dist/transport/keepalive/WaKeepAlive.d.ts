import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../types';
import type { WaComms } from '../WaComms';
interface WaKeepAliveOptions {
    readonly logger: Logger;
    readonly nodeOrchestrator: {
        hasPending(): boolean;
        clearPending(reason: Error): void;
        query(node: BinaryNode, timeoutMs?: number): Promise<BinaryNode>;
    };
    readonly getComms: () => WaComms | null;
    readonly intervalMs?: number;
    readonly getIntervalMs?: () => number;
    readonly timeoutMs?: number;
    readonly hostDomain?: string;
    readonly jitterRatio?: number;
    readonly minJitterMs?: number;
    readonly onClockSkewMs?: (clockSkewMs: number) => void;
}
/**
 * Periodically pings the server with a ping IQ to detect dead sockets and
 * measure clock skew. A ping is skipped while another ping is in flight, or
 * while other queries are pending and the socket shows recent inbound
 * activity. A socket silent past the dead-socket timeout is pinged even with
 * queries pending: pending queries on a silent socket are evidence of a dead
 * connection, so steady outbound traffic must not starve detection. On ping
 * failure it rejects pending queries and resumes the socket via the
 * configured `getComms()`.
 */
export declare class WaKeepAlive {
    private readonly logger;
    private readonly nodeOrchestrator;
    private readonly getCommsFn;
    private readonly baseIntervalMs;
    private readonly getIntervalMs;
    private readonly timeoutMs;
    private readonly hostDomain;
    private readonly jitterRatio;
    private readonly minJitterMs;
    private readonly onClockSkewMs;
    private timer;
    private generation;
    private inFlight;
    constructor(options: WaKeepAliveOptions);
    start(): void;
    stop(): void;
    private schedule;
    private run;
    private normalizeJitterRatio;
    private resolveIntervalMs;
    private computeNextDelayMs;
    private clearTimer;
}
export {};
