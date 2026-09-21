"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProxyDispatcher = isProxyDispatcher;
exports.isProxyAgent = isProxyAgent;
exports.isProxyTransport = isProxyTransport;
exports.toProxyDispatcher = toProxyDispatcher;
exports.toProxyAgent = toProxyAgent;
exports.toTcpProxyEndpoint = toTcpProxyEndpoint;
exports.assertTcpProxySupported = assertTcpProxySupported;
const bytes_1 = require("../util/bytes");
/** Type guard for an undici-style proxy dispatcher (has `dispatch` method). */
function isProxyDispatcher(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'dispatch' in value &&
        typeof value.dispatch === 'function');
}
/** Type guard for a Node http.Agent-style proxy (has `addRequest` method). */
function isProxyAgent(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'addRequest' in value &&
        typeof value.addRequest === 'function');
}
/** Type guard accepting either {@link isProxyDispatcher} or {@link isProxyAgent} shapes. */
function isProxyTransport(value) {
    return isProxyDispatcher(value) || isProxyAgent(value);
}
/** Narrows `proxy` to {@link WaProxyDispatcher} or returns `undefined`. */
function toProxyDispatcher(proxy) {
    if (!proxy || !isProxyDispatcher(proxy)) {
        return undefined;
    }
    return proxy;
}
/** Narrows `proxy` to {@link WaProxyAgent} or returns `undefined`. */
function toProxyAgent(proxy) {
    if (!proxy || !isProxyAgent(proxy)) {
        return undefined;
    }
    return proxy;
}
const TCP_PROXY_HINT = 'socketOptions.proxy.ws must hold an http.Agent-style proxy pointing at an http: url (e.g. new HttpProxyAgent("http://host:port")) to tunnel raw TCP';
/**
 * Resolves the proxy endpoint a raw TCP transport tunnels through with HTTP
 * CONNECT.
 *
 * Returns `undefined` only when no proxy is configured. Proxy shapes the tunnel
 * cannot honour throw instead of resolving to `undefined`, because dropping one
 * silently would dial the destination directly – the opposite of what a
 * deployment that pins its egress to a proxy asked for.
 */
function toTcpProxyEndpoint(proxy) {
    if (!proxy) {
        return undefined;
    }
    if (!isProxyAgent(proxy)) {
        if (isProxyDispatcher(proxy)) {
            throw new Error(`undici-style proxy dispatchers cannot tunnel raw TCP – ${TCP_PROXY_HINT}`);
        }
        throw new Error(`unsupported proxy transport – ${TCP_PROXY_HINT}`);
    }
    const url = readAgentProxyUrl(proxy);
    if (url.protocol !== 'http:') {
        throw new Error(`proxy protocol ${url.protocol} is not supported by the raw TCP tunnel – ${TCP_PROXY_HINT}`);
    }
    const username = decodeProxyUserInfo(url.username, 'username');
    const password = decodeProxyUserInfo(url.password, 'password');
    return {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 80,
        authorization: username || password
            ? `Basic ${(0, bytes_1.bytesToBase64)(bytes_1.TEXT_ENCODER.encode(`${username}:${password}`))}`
            : undefined
    };
}
/** Throws when {@link toTcpProxyEndpoint} cannot honour `proxy`. */
function assertTcpProxySupported(proxy) {
    toTcpProxyEndpoint(proxy);
}
/**
 * Decodes one userinfo component of a proxy url. `new URL()` keeps invalid
 * percent escapes verbatim, so a credential holding a literal `%` would reach
 * `decodeURIComponent` and throw a bare `URIError`. The value never reaches the
 * message – only the field name does.
 */
function decodeProxyUserInfo(value, field) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        throw new Error(`proxy url ${field} contains a malformed percent escape`);
    }
}
/**
 * Reads the proxy url an `http.Agent`-style proxy exposes. Every `*-proxy-agent`
 * package keeps it on `.proxy`, but only the http/https ones store a `URL`
 * there – `socks-proxy-agent` stores a parsed `{ host, port, type }` endpoint.
 */
function readAgentProxyUrl(agent) {
    const value = agent.proxy;
    if (value instanceof URL) {
        return value;
    }
    if (typeof value === 'string') {
        try {
            return new URL(value);
        }
        catch {
            throw new Error(`proxy agent exposes an unparseable proxy url ${JSON.stringify(value)}`);
        }
    }
    if (isSocksProxyEndpoint(value)) {
        throw new Error(`socks proxy agents cannot tunnel raw TCP – ${TCP_PROXY_HINT}`);
    }
    throw new Error(`proxy agent exposes no proxy url – ${TCP_PROXY_HINT}`);
}
/** Matches the `{ host, port, type }` endpoint `socks-proxy-agent` keeps on `.proxy`. */
function isSocksProxyEndpoint(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.host === 'string' &&
        typeof value.port === 'number');
}
