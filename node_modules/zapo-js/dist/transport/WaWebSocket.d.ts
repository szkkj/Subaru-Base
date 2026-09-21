import type { Logger } from '../infra/log/types';
import type { SocketCloseInfo, SocketOpenInfo, WaSocketConfig, WaSocketHandlers } from './types';
/**
 * Thin wrapper around a `RawWebSocket` (or Node `ws` constructor) used by
 * {@link WaComms}. Iterates the configured URL list on failure and applies a
 * connect/idle timeout.
 */
export declare class WaWebSocket {
    private readonly config;
    private readonly socketUrls;
    private readonly logger;
    private readonly webSocketCtor;
    private readonly customWebSocketCtor;
    private readonly socketRuntime;
    private readonly connectingSockets;
    private handlers;
    private socket;
    private closeWaiter;
    private nodeWsCtorPromise;
    constructor(config: WaSocketConfig, logger?: Logger);
    setHandlers(handlers: WaSocketHandlers): void;
    isOpen(): boolean;
    isConnecting(): boolean;
    open(): Promise<SocketOpenInfo>;
    close(code?: number, reason?: string): Promise<SocketCloseInfo | null>;
    send(data: string | ArrayBuffer | Uint8Array): Promise<void>;
    private openSingle;
    private openConcurrently;
    private releasePendingSocketsAfterSetupFailure;
    private bindRuntimeHandlers;
    private handleMessage;
    private normalizePayload;
    private createPendingSocket;
    private bindPendingSocket;
    private settlePendingSocket;
    private releasePendingSocket;
    private activatePendingSocket;
    private toCloseInfo;
    private handleRuntimeError;
    private handleRuntimeClose;
    private closeSocketSafe;
    private createRawSocket;
    private resolveNodeWsConstructor;
}
