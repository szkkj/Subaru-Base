"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaWebSocket = void 0;
const ConsoleLogger_1 = require("../infra/log/ConsoleLogger");
const constants_1 = require("../protocol/constants");
const bytes_1 = require("../util/bytes");
const primitives_1 = require("../util/primitives");
const WS_OPTIONAL_MODULE = 'ws';
function asOptionalNodeWsConstructor(loaded) {
    if (loaded && typeof loaded === 'object') {
        const direct = loaded.WebSocket;
        if (typeof direct === 'function') {
            return direct;
        }
        const fallback = loaded.default;
        if (typeof fallback === 'function') {
            return fallback;
        }
    }
    if (typeof loaded === 'function') {
        return loaded;
    }
    return null;
}
async function loadOptionalNodeWsConstructor() {
    try {
        const loaded = await Promise.resolve(`${WS_OPTIONAL_MODULE}`).then(s => __importStar(require(s)));
        const constructor = asOptionalNodeWsConstructor(loaded);
        if (constructor) {
            return constructor;
        }
        throw new Error('invalid ws module export');
    }
    catch (error) {
        const normalized = (0, primitives_1.toError)(error);
        const code = normalized.code;
        const message = normalized.message ?? '';
        const isModuleNotFound = (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') &&
            (message.includes(`'${WS_OPTIONAL_MODULE}'`) ||
                message.includes(`"${WS_OPTIONAL_MODULE}"`));
        if (isModuleNotFound) {
            throw new Error('optional dependency "ws" is not installed. Install with: npm i ws');
        }
        throw normalized;
    }
}
function resolveWebSocketConstructor() {
    const ctor = globalThis
        .WebSocket;
    if (!ctor) {
        throw new Error('global WebSocket is not available in this runtime');
    }
    return ctor;
}
function resolveSocketUrls(config) {
    const preferredUrls = config.urls;
    if (preferredUrls && preferredUrls.length > 0) {
        const unique = [];
        for (const url of preferredUrls)
            if (unique.indexOf(url) === -1)
                unique.push(url);
        return Object.freeze(unique);
    }
    return config.url ? Object.freeze([config.url]) : constants_1.WA_DEFAULTS.CHAT_SOCKET_URLS;
}
function resolveSocketRuntime() {
    const maybeNodeProcess = globalThis.process;
    if (typeof maybeNodeProcess?.versions?.node === 'string') {
        return 'node';
    }
    return 'browser';
}
/**
 * Thin wrapper around a `RawWebSocket` (or Node `ws` constructor) used by
 * {@link WaComms}. Iterates the configured URL list on failure and applies a
 * connect/idle timeout.
 */
class WaWebSocket {
    constructor(config, logger = new ConsoleLogger_1.ConsoleLogger('info')) {
        this.config = Object.freeze({
            ...config,
            timeoutIntervalMs: config.timeoutIntervalMs ?? 10000
        });
        this.socketUrls = resolveSocketUrls(config);
        this.logger = logger;
        this.webSocketCtor = config.rawWebSocketConstructor ?? resolveWebSocketConstructor();
        this.customWebSocketCtor = Boolean(config.rawWebSocketConstructor);
        this.socketRuntime = resolveSocketRuntime();
        this.connectingSockets = new Set();
        this.handlers = {};
        this.socket = null;
        this.closeWaiter = null;
        this.nodeWsCtorPromise = null;
    }
    setHandlers(handlers) {
        this.handlers = handlers;
    }
    isOpen() {
        return this.socket?.readyState === constants_1.WA_READY_STATES.OPEN;
    }
    isConnecting() {
        return (this.socket?.readyState === constants_1.WA_READY_STATES.CONNECTING ||
            this.connectingSockets.size > 0);
    }
    async open() {
        if (this.isOpen()) {
            this.logger.trace('socket open skipped: already open');
            return { openedAt: Date.now() };
        }
        if (this.isConnecting()) {
            throw new Error('websocket is already connecting');
        }
        this.logger.info('socket open start', { urls: this.socketUrls.length });
        if (this.socketUrls.length === 1) {
            return this.openSingle(this.socketUrls[0]);
        }
        return this.openConcurrently(this.socketUrls);
    }
    async close(code = 1000, reason = '') {
        this.logger.debug('socket close requested', { code, reason });
        const socket = this.socket;
        if (!socket) {
            if (this.connectingSockets.size > 0) {
                for (const connectingSocket of this.connectingSockets) {
                    this.closeSocketSafe(connectingSocket, code, reason);
                }
                this.connectingSockets.clear();
                return {
                    code,
                    reason,
                    wasClean: true
                };
            }
            return null;
        }
        if (socket.readyState === constants_1.WA_READY_STATES.CLOSED) {
            this.socket = null;
            return {
                code,
                reason,
                wasClean: true
            };
        }
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (this.closeWaiter) {
                    this.closeWaiter = null;
                    if (this.socket === socket) {
                        this.socket = null;
                    }
                    resolve({
                        code,
                        reason,
                        wasClean: false
                    });
                }
            }, this.config.timeoutIntervalMs);
            this.closeWaiter = (info) => {
                clearTimeout(timer);
                if (this.socket === socket) {
                    this.socket = null;
                }
                resolve(info);
            };
            try {
                socket.close(code, reason);
            }
            catch (error) {
                clearTimeout(timer);
                this.closeWaiter = null;
                if (this.socket === socket) {
                    this.socket = null;
                }
                resolve({
                    code,
                    reason,
                    wasClean: false
                });
                void this.handlers.onError?.((0, primitives_1.toError)(error));
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async send(data) {
        const socket = this.socket;
        if (!socket || socket.readyState !== constants_1.WA_READY_STATES.OPEN) {
            throw new Error('websocket is not connected');
        }
        socket.send(data);
    }
    async openSingle(url) {
        const pending = await this.createPendingSocket(url);
        return new Promise((resolve, reject) => {
            this.bindPendingSocket(pending, {
                onOpen: () => {
                    if (!this.settlePendingSocket(pending)) {
                        return;
                    }
                    resolve(this.activatePendingSocket(pending, 'socket open success'));
                },
                onFail: (error) => {
                    if (!this.settlePendingSocket(pending)) {
                        return;
                    }
                    if (this.socket === pending.socket) {
                        this.socket = null;
                    }
                    reject(error);
                }
            });
        });
    }
    async openConcurrently(urls) {
        const setupResults = await Promise.allSettled(urls.map((url) => this.createPendingSocket(url)));
        const pendingSockets = [];
        let setupError = null;
        for (const result of setupResults) {
            if (result.status === 'fulfilled') {
                pendingSockets.push(result.value);
                continue;
            }
            setupError = setupError ?? (0, primitives_1.toError)(result.reason);
        }
        if (setupError) {
            this.releasePendingSocketsAfterSetupFailure(pendingSockets);
            throw setupError;
        }
        return new Promise((resolve, reject) => {
            let done = false;
            let failedCount = 0;
            let lastError = null;
            const fail = (entry, error) => {
                if (done || !this.settlePendingSocket(entry)) {
                    return;
                }
                failedCount += 1;
                lastError = error;
                if (failedCount === pendingSockets.length) {
                    done = true;
                    reject(lastError ?? new Error('websocket connect error'));
                }
            };
            const win = (entry) => {
                if (!this.settlePendingSocket(entry)) {
                    return;
                }
                if (done) {
                    this.closeSocketSafe(entry.socket, 1000, 'loser_socket');
                    return;
                }
                done = true;
                for (const other of pendingSockets) {
                    if (other.socket === entry.socket) {
                        continue;
                    }
                    if (!this.settlePendingSocket(other)) {
                        continue;
                    }
                    this.closeSocketSafe(other.socket, 1000, 'loser_socket');
                }
                resolve(this.activatePendingSocket(entry, 'socket open success (race winner)'));
            };
            for (const entry of pendingSockets) {
                this.bindPendingSocket(entry, {
                    onOpen: () => win(entry),
                    onFail: (error) => fail(entry, error)
                });
            }
        });
    }
    releasePendingSocketsAfterSetupFailure(entries) {
        for (const entry of entries) {
            if (!this.settlePendingSocket(entry)) {
                continue;
            }
            this.closeSocketSafe(entry.socket, 1000, 'connect_setup_failed');
        }
    }
    bindRuntimeHandlers(socket) {
        socket.onmessage = (event) => {
            void this.handleMessage(event.data);
        };
        socket.onerror = (event) => {
            this.handleRuntimeError(event);
        };
        socket.onclose = (event) => {
            this.handleRuntimeClose(socket, event);
        };
    }
    async handleMessage(data) {
        try {
            const payload = await this.normalizePayload(data);
            if (!payload) {
                this.logger.trace('socket message ignored: unsupported payload shape');
                return;
            }
            await this.handlers.onMessage?.(payload);
        }
        catch (error) {
            this.logger.error('socket message handling failed', {
                message: (0, primitives_1.toError)(error).message
            });
            void this.handlers.onError?.((0, primitives_1.toError)(error));
        }
    }
    async normalizePayload(data) {
        if (data instanceof Uint8Array) {
            return data;
        }
        if (data instanceof ArrayBuffer) {
            return (0, bytes_1.toBytesView)(data);
        }
        if (ArrayBuffer.isView(data)) {
            return (0, bytes_1.toBytesView)(data);
        }
        if (typeof data === 'string') {
            return bytes_1.TEXT_ENCODER.encode(data);
        }
        if (data && typeof data === 'object' && 'arrayBuffer' in data) {
            const maybeBlob = data;
            const buffer = await maybeBlob.arrayBuffer();
            return (0, bytes_1.toBytesView)(buffer);
        }
        return null;
    }
    async createPendingSocket(url) {
        const socket = await this.createRawSocket(url);
        socket.binaryType = 'arraybuffer';
        this.connectingSockets.add(socket);
        return {
            url,
            socket,
            timer: null,
            settled: false
        };
    }
    bindPendingSocket(entry, handlers) {
        entry.timer = setTimeout(() => {
            this.logger.warn('socket connect timeout', { url: entry.url });
            this.closeSocketSafe(entry.socket, 4000, 'connect_timeout');
            handlers.onFail(new Error(`websocket connect timeout for ${entry.url}`));
        }, this.config.timeoutIntervalMs);
        entry.socket.onopen = () => {
            handlers.onOpen();
        };
        entry.socket.onerror = () => {
            if (entry.settled) {
                this.logger.trace('settled pending socket error', { url: entry.url });
            }
            else {
                this.logger.warn('socket open error', { url: entry.url });
            }
            handlers.onFail(new Error(`websocket connect error for ${entry.url}`));
        };
        entry.socket.onclose = (event) => {
            const info = this.toCloseInfo(event);
            if (entry.settled) {
                this.logger.trace('settled pending socket closed', {
                    url: entry.url,
                    code: info.code,
                    reason: info.reason
                });
            }
            else {
                this.logger.warn('socket closed before open', {
                    url: entry.url,
                    code: info.code,
                    reason: info.reason
                });
            }
            handlers.onFail(new Error(`websocket closed before open (${info.code}:${info.reason}) for ${entry.url}`));
        };
    }
    settlePendingSocket(entry) {
        if (entry.settled) {
            return false;
        }
        entry.settled = true;
        this.releasePendingSocket(entry);
        return true;
    }
    releasePendingSocket(entry) {
        if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
        }
        this.connectingSockets.delete(entry.socket);
    }
    activatePendingSocket(entry, message) {
        const info = { openedAt: Date.now() };
        this.socket = entry.socket;
        this.bindRuntimeHandlers(entry.socket);
        this.logger.info(message, { url: entry.url });
        void this.handlers.onOpen?.(info);
        return info;
    }
    toCloseInfo(event) {
        return {
            code: typeof event.code === 'number' ? event.code : 1000,
            reason: typeof event.reason === 'string' ? event.reason : '',
            wasClean: event.wasClean === true
        };
    }
    handleRuntimeError(event) {
        void event;
        this.logger.warn('socket runtime error event');
        void this.handlers.onError?.(new Error('websocket runtime error'));
    }
    handleRuntimeClose(socket, event) {
        const info = this.toCloseInfo(event);
        this.logger.info('socket runtime closed', {
            code: info.code,
            reason: info.reason,
            wasClean: info.wasClean
        });
        if (this.socket === socket) {
            this.socket = null;
        }
        const waiter = this.closeWaiter;
        this.closeWaiter = null;
        if (waiter) {
            waiter(info);
        }
        void this.handlers.onClose?.(info);
    }
    closeSocketSafe(socket, code, reason) {
        try {
            socket.close(code, reason);
        }
        catch (error) {
            this.logger.trace('socket close ignored', {
                code,
                reason,
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    async createRawSocket(url) {
        const headers = this.config.headers;
        const dispatcher = this.config.dispatcher;
        const agent = this.config.agent;
        if (this.customWebSocketCtor) {
            return new this.webSocketCtor(url, this.config.protocols, {
                headers,
                dispatcher,
                agent
            });
        }
        let hasHeaders = false;
        if (headers) {
            for (const key in headers) {
                if (Object.prototype.hasOwnProperty.call(headers, key)) {
                    hasHeaders = true;
                    break;
                }
            }
        }
        if (this.socketRuntime === 'node' && agent) {
            const nodeWsCtor = await this.resolveNodeWsConstructor();
            return new nodeWsCtor(url, this.config.protocols, {
                headers,
                agent
            });
        }
        if (this.socketRuntime === 'node' && (hasHeaders || dispatcher || agent)) {
            const globalWebSocketCtor = globalThis.WebSocket;
            if (globalWebSocketCtor && this.webSocketCtor === globalWebSocketCtor) {
                const init = {
                    protocols: this.config.protocols,
                    headers,
                    dispatcher,
                    agent
                };
                return new this.webSocketCtor(url, init);
            }
            return new this.webSocketCtor(url, this.config.protocols, {
                headers,
                dispatcher,
                agent
            });
        }
        return new this.webSocketCtor(url, this.config.protocols);
    }
    async resolveNodeWsConstructor() {
        if (!this.nodeWsCtorPromise) {
            this.nodeWsCtorPromise = loadOptionalNodeWsConstructor().catch((error) => {
                this.nodeWsCtorPromise = null;
                throw error;
            });
        }
        return this.nodeWsCtorPromise;
    }
}
exports.WaWebSocket = WaWebSocket;
