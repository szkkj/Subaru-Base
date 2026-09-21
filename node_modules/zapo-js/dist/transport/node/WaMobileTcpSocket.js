"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaMobileTcpSocketCtor = exports.WaMobileTcpSocket = void 0;
const node_net_1 = require("node:net");
const constants_1 = require("../../protocol/constants");
const proxy_1 = require("../proxy");
const bytes_1 = require("../../util/bytes");
/**
 * `RawWebSocket`-shaped adapter over a raw Node TCP socket. Used by the
 * mobile transport to speak the WhatsApp Mobile binary protocol over
 * `tcp://host:port` URLs.
 */
class WaMobileTcpSocket {
    constructor(url, _protocols, options) {
        this.binaryType = 'arraybuffer';
        this.readyState = constants_1.WA_READY_STATES.CONNECTING;
        this.onopen = null;
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
        this.closedCode = 1000;
        this.closedReason = '';
        this.closedClean = true;
        this.forceCloseTimer = null;
        const { host, port } = parseTcpUrl(url);
        const proxy = (0, proxy_1.toTcpProxyEndpoint)(options?.agent);
        this.socket = proxy
            ? (0, node_net_1.connect)({ host: proxy.hostname, port: proxy.port })
            : (0, node_net_1.connect)({ host, port });
        let tunnelReady = !proxy;
        let proxyResponse = new Uint8Array(0);
        this.socket.on('connect', () => {
            if (this.readyState !== constants_1.WA_READY_STATES.CONNECTING)
                return;
            if (proxy) {
                const authority = `${host}:${port}`;
                const lines = [
                    `CONNECT ${authority} HTTP/1.1`,
                    `Host: ${authority}`,
                    'Proxy-Connection: Keep-Alive'
                ];
                if (proxy.authorization)
                    lines.push(`Proxy-Authorization: ${proxy.authorization}`);
                this.socket.write(bytes_1.TEXT_ENCODER.encode(`${lines.join('\r\n')}\r\n\r\n`));
                return;
            }
            this.markOpen();
        });
        this.socket.on('data', (chunk) => {
            if (!tunnelReady && proxy) {
                proxyResponse = (0, bytes_1.concatBytes)([proxyResponse, chunk]);
                const headerEnd = findHttpHeaderEnd(proxyResponse);
                const scanned = headerEnd === -1 ? proxyResponse.byteLength : headerEnd;
                if (scanned > MAX_PROXY_HEADER_BYTES) {
                    this.socket.destroy(new Error('WaMobileTcpSocket: proxy response headers too large'));
                    return;
                }
                if (headerEnd === -1) {
                    return;
                }
                const statusLine = bytes_1.TEXT_DECODER.decode(proxyResponse.subarray(0, headerEnd)).split('\r\n')[0];
                if (!/^HTTP\/1\.[01] 2\d\d(?:\s|$)/.test(statusLine)) {
                    this.socket.destroy(new Error(`WaMobileTcpSocket: proxy CONNECT failed (${statusLine})`));
                    return;
                }
                const remaining = proxyResponse.subarray(headerEnd + 4);
                proxyResponse = new Uint8Array(0);
                tunnelReady = true;
                this.markOpen();
                if (remaining.byteLength > 0)
                    this.emitMessage(remaining);
                return;
            }
            this.emitMessage(chunk);
        });
        this.socket.on('error', (err) => {
            this.closedClean = false;
            this.closedReason = err.message;
            this.onerror?.({ reason: err.message });
        });
        this.socket.on('close', (hadError) => {
            this.readyState = constants_1.WA_READY_STATES.CLOSED;
            if (this.forceCloseTimer) {
                clearTimeout(this.forceCloseTimer);
                this.forceCloseTimer = null;
            }
            if (hadError)
                this.closedClean = false;
            this.onclose?.({
                code: this.closedCode,
                reason: this.closedReason,
                wasClean: this.closedClean
            });
        });
    }
    markOpen() {
        if (this.readyState !== constants_1.WA_READY_STATES.CONNECTING)
            return;
        this.readyState = constants_1.WA_READY_STATES.OPEN;
        this.onopen?.({});
    }
    emitMessage(chunk) {
        if (!this.onmessage || this.readyState !== constants_1.WA_READY_STATES.OPEN)
            return;
        const copy = new Uint8Array(chunk.byteLength);
        copy.set(chunk);
        this.onmessage({ data: copy });
    }
    send(data) {
        if (this.readyState !== constants_1.WA_READY_STATES.OPEN) {
            throw new Error('WaMobileTcpSocket: send() called on non-OPEN socket');
        }
        let bytes;
        if (typeof data === 'string') {
            bytes = bytes_1.TEXT_ENCODER.encode(data);
        }
        else if (data instanceof Uint8Array) {
            bytes = data;
        }
        else {
            bytes = new Uint8Array(data);
        }
        this.socket.write(bytes);
    }
    close(code, reason) {
        if (this.readyState === constants_1.WA_READY_STATES.CLOSED)
            return;
        this.readyState = constants_1.WA_READY_STATES.CLOSING;
        this.closedCode = code ?? 1000;
        this.closedReason = reason ?? '';
        this.socket.end();
        this.forceCloseTimer = setTimeout(() => {
            this.forceCloseTimer = null;
            if (this.readyState !== constants_1.WA_READY_STATES.CLOSED) {
                this.socket.destroy();
            }
        }, 5000);
        this.forceCloseTimer.unref();
    }
}
exports.WaMobileTcpSocket = WaMobileTcpSocket;
/** Cap on the CONNECT response headers buffered before the tunnel is rejected. */
const MAX_PROXY_HEADER_BYTES = 65536;
function findHttpHeaderEnd(bytes) {
    for (let i = 3; i < bytes.byteLength; i += 1) {
        if (bytes[i - 3] === 13 && bytes[i - 2] === 10 && bytes[i - 1] === 13 && bytes[i] === 10) {
            return i - 3;
        }
    }
    return -1;
}
function parseTcpUrl(url) {
    let work = url;
    if (work.startsWith('tcp://')) {
        work = work.slice('tcp://'.length);
    }
    const queryIdx = work.indexOf('?');
    if (queryIdx >= 0) {
        work = work.slice(0, queryIdx);
    }
    const slash = work.indexOf('/');
    if (slash >= 0) {
        work = work.slice(0, slash);
    }
    const colon = work.lastIndexOf(':');
    const host = colon === -1 ? work : work.slice(0, colon);
    if (host.length === 0) {
        throw new Error(`WaMobileTcpSocket: invalid host in ${JSON.stringify(url)}`);
    }
    if (colon === -1) {
        return { host, port: 443 };
    }
    const portText = work.slice(colon + 1);
    if (!/^\d+$/.test(portText)) {
        throw new Error(`WaMobileTcpSocket: invalid port in ${JSON.stringify(url)}`);
    }
    const port = Number(portText);
    if (port < 1 || port > 65535) {
        throw new Error(`WaMobileTcpSocket: port out of range in ${JSON.stringify(url)}`);
    }
    return { host, port };
}
/** {@link RawWebSocketConstructor} alias for {@link WaMobileTcpSocket} – drop in via `WaCommsConfig.rawWebSocketConstructor`. */
exports.WaMobileTcpSocketCtor = WaMobileTcpSocket;
