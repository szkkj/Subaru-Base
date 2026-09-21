"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaKeepAlive = void 0;
const constants_1 = require("../../protocol/constants");
const primitives_1 = require("../../util/primitives");
const KEEPALIVE_DEFAULT_JITTER_RATIO = 0.1;
const KEEPALIVE_DEFAULT_MIN_JITTER_MS = 250;
const KEEPALIVE_MAX_JITTER_RATIO = 0.5;
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
class WaKeepAlive {
    constructor(options) {
        this.logger = options.logger;
        this.nodeOrchestrator = options.nodeOrchestrator;
        this.getCommsFn = options.getComms;
        this.baseIntervalMs = options.intervalMs ?? constants_1.WA_DEFAULTS.HEALTH_CHECK_INTERVAL_MS;
        this.getIntervalMs = options.getIntervalMs;
        this.timeoutMs = options.timeoutMs ?? constants_1.WA_DEFAULTS.DEAD_SOCKET_TIMEOUT_MS;
        this.hostDomain = options.hostDomain ?? constants_1.WA_DEFAULTS.HOST_DOMAIN;
        this.jitterRatio = this.normalizeJitterRatio(options.jitterRatio);
        this.minJitterMs = (0, primitives_1.normalizeNonNegativeInteger)(options.minJitterMs, KEEPALIVE_DEFAULT_MIN_JITTER_MS);
        this.onClockSkewMs = options.onClockSkewMs;
        this.timer = null;
        this.generation = 0;
        this.inFlight = false;
    }
    start() {
        this.logger.info('keepalive start', {
            intervalMs: this.resolveIntervalMs(),
            timeoutMs: this.timeoutMs,
            jitterRatio: this.jitterRatio,
            minJitterMs: this.minJitterMs
        });
        this.generation += 1;
        this.inFlight = false;
        this.clearTimer();
        this.schedule(this.generation);
    }
    stop() {
        this.logger.info('keepalive stop');
        this.generation += 1;
        this.inFlight = false;
        this.clearTimer();
    }
    schedule(generation) {
        if (generation !== this.generation) {
            return;
        }
        this.clearTimer();
        const nextDelayMs = this.computeNextDelayMs();
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.run(generation);
        }, nextDelayMs);
        this.logger.trace('keepalive scheduled', {
            generation,
            inMs: nextDelayMs,
            baseIntervalMs: this.resolveIntervalMs()
        });
    }
    async run(generation) {
        if (generation !== this.generation) {
            return;
        }
        const comms = this.getCommsFn();
        if (!comms || !comms.getCommsState().connected) {
            this.logger.trace('keepalive skipped: comms not connected');
            this.schedule(generation);
            return;
        }
        if (this.inFlight) {
            this.logger.trace('keepalive skipped: ping already in flight');
            this.schedule(generation);
            return;
        }
        if (this.nodeOrchestrator.hasPending()) {
            const inboundIdleMs = Date.now() - comms.getLastInboundAtMs();
            if (inboundIdleMs < this.timeoutMs) {
                this.logger.trace('keepalive skipped: pending queries with recent inbound', {
                    inboundIdleMs
                });
                this.schedule(generation);
                return;
            }
            this.logger.debug('keepalive pinging despite pending queries: inbound is silent', {
                inboundIdleMs,
                timeoutMs: this.timeoutMs
            });
        }
        this.inFlight = true;
        const startedAt = Date.now();
        try {
            const pingNode = {
                tag: constants_1.WA_NODE_TAGS.IQ,
                attrs: {
                    to: this.hostDomain,
                    type: constants_1.WA_IQ_TYPES.GET,
                    xmlns: constants_1.WA_XMLNS.WHATSAPP_PING
                }
            };
            const response = await this.nodeOrchestrator.query(pingNode, this.timeoutMs);
            const receivedAt = Date.now();
            const latencyMs = receivedAt - startedAt;
            this.logger.debug('keepalive ping success', { latencyMs });
            if (this.onClockSkewMs) {
                const serverT = response.attrs.t ? Number(response.attrs.t) : NaN;
                if (Number.isFinite(serverT) && serverT > 0) {
                    const halfRttMs = Math.round(latencyMs / 2);
                    const clockSkewMs = serverT * 1000 - (startedAt + halfRttMs);
                    this.onClockSkewMs(clockSkewMs);
                }
            }
        }
        catch (error) {
            if (generation !== this.generation) {
                this.logger.trace('keepalive stopped during in-flight ping, not resuming');
                return;
            }
            this.logger.warn('keepalive ping failed, reconnecting socket', {
                message: (0, primitives_1.toError)(error).message
            });
            this.nodeOrchestrator.clearPending(new Error('socket resume requested by keepalive ping failure'));
            try {
                await comms.closeSocketAndResume();
            }
            catch (resumeError) {
                this.logger.warn('keepalive reconnect failed', {
                    message: (0, primitives_1.toError)(resumeError).message
                });
            }
        }
        finally {
            this.inFlight = false;
        }
        this.schedule(generation);
    }
    normalizeJitterRatio(value) {
        if (!Number.isFinite(value)) {
            return KEEPALIVE_DEFAULT_JITTER_RATIO;
        }
        const normalized = value;
        return Math.min(Math.max(normalized, 0), KEEPALIVE_MAX_JITTER_RATIO);
    }
    resolveIntervalMs() {
        const candidate = this.getIntervalMs?.() ?? this.baseIntervalMs;
        if (!Number.isFinite(candidate) || candidate <= 0) {
            return this.baseIntervalMs;
        }
        return candidate;
    }
    computeNextDelayMs() {
        const intervalMs = this.resolveIntervalMs();
        if (intervalMs <= 0) {
            return 0;
        }
        if (this.jitterRatio <= 0 && this.minJitterMs <= 0) {
            return intervalMs;
        }
        const ratioJitterMs = Math.floor(intervalMs * this.jitterRatio);
        const jitterWindowMs = Math.max(this.minJitterMs, ratioJitterMs);
        if (jitterWindowMs <= 0) {
            return intervalMs;
        }
        const offsetMs = Math.floor(Math.random() * (jitterWindowMs * 2 + 1) - jitterWindowMs);
        return Math.max(1, intervalMs + offsetMs);
    }
    clearTimer() {
        if (!this.timer) {
            return;
        }
        clearTimeout(this.timer);
        this.timer = null;
    }
}
exports.WaKeepAlive = WaKeepAlive;
