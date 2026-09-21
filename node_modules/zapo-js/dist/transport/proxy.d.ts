import type { WaProxyAgent, WaProxyDispatcher, WaProxyTransport } from './types';
/** Type guard for an undici-style proxy dispatcher (has `dispatch` method). */
export declare function isProxyDispatcher(value: unknown): value is WaProxyDispatcher;
/** Type guard for a Node http.Agent-style proxy (has `addRequest` method). */
export declare function isProxyAgent(value: unknown): value is WaProxyAgent;
/** Type guard accepting either {@link isProxyDispatcher} or {@link isProxyAgent} shapes. */
export declare function isProxyTransport(value: unknown): value is WaProxyTransport;
/** Narrows `proxy` to {@link WaProxyDispatcher} or returns `undefined`. */
export declare function toProxyDispatcher(proxy: WaProxyTransport | undefined): WaProxyDispatcher | undefined;
/** Narrows `proxy` to {@link WaProxyAgent} or returns `undefined`. */
export declare function toProxyAgent(proxy: WaProxyTransport | undefined): WaProxyAgent | undefined;
/**
 * HTTP CONNECT endpoint a raw TCP transport dials to reach its destination.
 *
 * @sensitive Contains proxy credentials (`authorization`). Never log, serialize
 * via `JSON.stringify`, or transmit unencrypted. Persist with encryption-at-rest.
 */
export interface WaTcpProxyEndpoint {
    readonly hostname: string;
    readonly port: number;
    /** Ready-to-send `Proxy-Authorization` value when the proxy url carries credentials. */
    readonly authorization?: string;
}
/**
 * Resolves the proxy endpoint a raw TCP transport tunnels through with HTTP
 * CONNECT.
 *
 * Returns `undefined` only when no proxy is configured. Proxy shapes the tunnel
 * cannot honour throw instead of resolving to `undefined`, because dropping one
 * silently would dial the destination directly – the opposite of what a
 * deployment that pins its egress to a proxy asked for.
 */
export declare function toTcpProxyEndpoint(proxy: WaProxyTransport | undefined): WaTcpProxyEndpoint | undefined;
/** Throws when {@link toTcpProxyEndpoint} cannot honour `proxy`. */
export declare function assertTcpProxySupported(proxy: WaProxyTransport | undefined): void;
