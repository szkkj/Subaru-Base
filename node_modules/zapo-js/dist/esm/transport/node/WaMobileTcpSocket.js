import { connect as netConnect } from 'node:net';
import { WA_READY_STATES } from '../../protocol/constants.js';
import { toTcpProxyEndpoint } from '../proxy.js';
import { concatBytes, TEXT_DECODER, TEXT_ENCODER } from '../../util/bytes.js';
/**
 * `RawWebSocket`-shaped adapter over a raw Node TCP socket. Used by the
 * mobile transport to speak the WhatsApp Mobile binary protocol over
 * `tcp://host:port` URLs.
 */
export class WaMobileTcpSocket {
    constructor(url, _protocols, options) {
        this.binaryType = 'arraybuffer';
        this.readyState = WA_READY_STATES.CONNECTING;
        this.onopen = null;
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
        this.closedCode = 1000;
        this.closedReason = '';
        this.closedClean = true;
        this.forceCloseTimer = null;
        const { host, port } = parseTcpUrl(url);
        const proxy = toTcpProxyEndpoint(options?.agent);
        this.socket = proxy
            ? netConnect({ host: proxy.hostname, port: proxy.port })
            : netConnect({ host, port });
        let tunnelReady = !proxy;
        let proxyResponse = new Uint8Array(0);
        this.socket.on('connect', () => {
            if (this.readyState !== WA_READY_STATES.CONNECTING)
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
                this.socket.write(TEXT_ENCODER.encode(`${lines.join('\r\n')}\r\n\r\n`));
                return;
            }
            this.markOpen();
        });
        this.socket.on('data', (chunk) => {
            if (!tunnelReady && proxy) {
                proxyResponse = concatBytes([proxyResponse, chunk]);
                const headerEnd = findHttpHeaderEnd(proxyResponse);
                const scanned = headerEnd === -1 ? proxyResponse.byteLength : headerEnd;
                if (scanned > MAX_PROXY_HEADER_BYTES) {
                    this.socket.destroy(new Error('WaMobileTcpSocket: proxy response headers too large'));
                    return;
                }
                if (headerEnd === -1) {
                    return;
                }
                const statusLine = TEXT_DECODER.decode(proxyResponse.subarray(0, headerEnd)).split('\r\n')[0];
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
            this.readyState = WA_READY_STATES.CLOSED;
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
        if (this.readyState !== WA_READY_STATES.CONNECTING)
            return;
        this.readyState = WA_READY_STATES.OPEN;
        this.onopen?.({});
    }
    emitMessage(chunk) {
        if (!this.onmessage || this.readyState !== WA_READY_STATES.OPEN)
            return;
        const copy = new Uint8Array(chunk.byteLength);
        copy.set(chunk);
        this.onmessage({ data: copy });
    }
    send(data) {
        if (this.readyState !== WA_READY_STATES.OPEN) {
            throw new Error('WaMobileTcpSocket: send() called on non-OPEN socket');
        }
        let bytes;
        if (typeof data === 'string') {
            bytes = TEXT_ENCODER.encode(data);
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
        if (this.readyState === WA_READY_STATES.CLOSED)
            return;
        this.readyState = WA_READY_STATES.CLOSING;
        this.closedCode = code ?? 1000;
        this.closedReason = reason ?? '';
        this.socket.end();
        this.forceCloseTimer = setTimeout(() => {
            this.forceCloseTimer = null;
            if (this.readyState !== WA_READY_STATES.CLOSED) {
                this.socket.destroy();
            }
        }, 5000);
        this.forceCloseTimer.unref();
    }
}
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
export const WaMobileTcpSocketCtor = WaMobileTcpSocket;
