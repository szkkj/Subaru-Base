import type { Logger } from '../infra/log/types';
import type { WaCommsConfig, WaCommsState } from './types';
type StanzaHandler = (payload: Uint8Array) => void | Promise<void>;
type InflateFrame = (compressed: Uint8Array) => Uint8Array | Promise<Uint8Array>;
/**
 * Owns the WebSocket + Noise handshake lifecycle: opens the socket, drives
 * the noise pairing/login exchange, persists routing-info/server-static
 * updates, and delivers post-handshake binary frames to the caller.
 */
export declare class WaComms {
    private readonly config;
    private readonly logger;
    private readonly socket;
    private started;
    private connected;
    private handlingRequests;
    private preventRetry;
    private reconnectAttempts;
    private reconnectTimer;
    private waiters;
    private stanzaHandler;
    private inflateFrame;
    private pendingFrames;
    private pendingFramesByteLength;
    private readonly pendingFramesMaxCount;
    private readonly pendingFramesMaxBytes;
    private pendingFramesOverflowClosing;
    private resumeInFlight;
    private resumeHandshakeFailures;
    private usedResumeHandshake;
    private noiseSession;
    private lastServerStaticKey;
    private lastInboundAtMs;
    private frameProcessingQueue;
    private readonly frameHandlerQueue;
    constructor(config: WaCommsConfig, logger?: Logger);
    private applyRoutingInfoToSocketConfig;
    startComms(handleStanza: StanzaHandler, inflateFrame?: InflateFrame): void;
    waitForConnection(timeoutMs?: number): Promise<void>;
    startHandlingRequests(): void;
    stopComms(): Promise<void>;
    closeSocketAndResume(): Promise<void>;
    closeSocketAndPreventRetry(): Promise<void>;
    sendFrame(payload: Uint8Array): Promise<void>;
    /** Timestamp (`Date.now()` ms) of the last raw payload received from the socket; `0` before any inbound. */
    getLastInboundAtMs(): number;
    getCommsState(): Readonly<WaCommsState>;
    getServerStaticKey(): Uint8Array | null;
    private openSocket;
    private onSocketClosed;
    private onSocketMessage;
    private processSocketPayload;
    private onDecodedFrame;
    private onSocketOpened;
    private flushPendingFrames;
    private routeDecodedFrames;
    private clearPendingFrames;
    private tryQueuePendingFrames;
    private schedulePendingFramesOverflowClose;
    private scheduleDecodedFrame;
    private scheduleReconnect;
    private clearReconnectTimer;
    private removeWaiter;
    private withStickyRoutingCookie;
    private buildNoiseConfigForAttempt;
    private resetConnectionState;
    private drainWaiters;
}
export {};
