import type { RawWebSocket, RawWebSocketConstructor, WaRawWebSocketInit, WebSocketEventLike } from '../types';
/**
 * `RawWebSocket`-shaped adapter over a raw Node TCP socket. Used by the
 * mobile transport to speak the WhatsApp Mobile binary protocol over
 * `tcp://host:port` URLs.
 */
export declare class WaMobileTcpSocket implements RawWebSocket {
    binaryType: string;
    readyState: number;
    onopen: ((event: WebSocketEventLike) => void) | null;
    onclose: ((event: WebSocketEventLike) => void) | null;
    onerror: ((event: WebSocketEventLike) => void) | null;
    onmessage: ((event: WebSocketEventLike) => void) | null;
    private readonly socket;
    private closedCode;
    private closedReason;
    private closedClean;
    private forceCloseTimer;
    constructor(url: string, _protocols?: unknown, options?: WaRawWebSocketInit);
    private markOpen;
    private emitMessage;
    send(data: string | ArrayBuffer | Uint8Array): void;
    close(code?: number, reason?: string): void;
}
/** {@link RawWebSocketConstructor} alias for {@link WaMobileTcpSocket} – drop in via `WaCommsConfig.rawWebSocketConstructor`. */
export declare const WaMobileTcpSocketCtor: RawWebSocketConstructor;
