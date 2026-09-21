"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaOfflineResumeCoordinator = void 0;
const offline_1 = require("../../transport/node/builders/offline");
const primitives_1 = require("../../util/primitives");
const WA_OFFLINE_RESUME = Object.freeze({
    BATCH_SIZE: 200,
    REQUEST_DEBOUNCE_MS: 100,
    MAX_BATCH_RETRIES: 3,
    STANZA_TIMEOUT_MS: 60000
});
const WA_OFFLINE_RESUME_STATE = Object.freeze({
    INIT: 'init',
    RESUMING: 'resuming',
    COMPLETE: 'complete'
});
class WaOfflineResumeCoordinator {
    constructor(options) {
        this.logger = options.logger;
        this.runtime = options.runtime;
        this.state = WA_OFFLINE_RESUME_STATE.INIT;
        this.totalStanzas = 0;
        this.pendingStanzas = 0;
        this.batchInFlight = false;
        this.batchRetries = 0;
        this.resumeGeneration = 0;
        this.lastBatchRequestMs = 0;
        this.batchTimeout = null;
        this.stanzaTimeout = null;
    }
    get isComplete() {
        return this.state === WA_OFFLINE_RESUME_STATE.COMPLETE;
    }
    get isResuming() {
        return this.state === WA_OFFLINE_RESUME_STATE.RESUMING;
    }
    handleOfflinePreview(stanzaCount) {
        this.clearTimers();
        this.state = WA_OFFLINE_RESUME_STATE.RESUMING;
        this.totalStanzas = stanzaCount;
        this.pendingStanzas = stanzaCount;
        this.batchInFlight = false;
        this.batchRetries = 0;
        this.resumeGeneration += 1;
        this.lastBatchRequestMs = 0;
        this.logger.info('offline resume started', {
            totalStanzas: stanzaCount
        });
        this.runtime.emitOfflineResume({
            status: 'resuming',
            totalStanzas: stanzaCount,
            remainingStanzas: stanzaCount,
            forced: false
        });
        this.requestOfflineBatch();
        this.resetStanzaTimeout();
    }
    handleOfflineComplete(serverStanzaCount) {
        if (this.state !== WA_OFFLINE_RESUME_STATE.RESUMING) {
            return;
        }
        this.completeResume(false, serverStanzaCount);
    }
    trackOfflineStanza() {
        if (this.state !== WA_OFFLINE_RESUME_STATE.RESUMING) {
            return;
        }
        this.pendingStanzas = Math.max(0, this.pendingStanzas - 1);
        this.batchInFlight = false;
        this.resetStanzaTimeout();
        this.scheduleNextBatch();
    }
    reset() {
        this.clearTimers();
        this.state = WA_OFFLINE_RESUME_STATE.INIT;
        this.totalStanzas = 0;
        this.pendingStanzas = 0;
        this.batchInFlight = false;
        this.batchRetries = 0;
        this.resumeGeneration += 1;
        this.lastBatchRequestMs = 0;
    }
    completeResume(forced, serverStanzaCount) {
        this.clearTimers();
        this.state = WA_OFFLINE_RESUME_STATE.COMPLETE;
        this.batchInFlight = false;
        this.logger.info('offline resume complete', {
            totalStanzas: this.totalStanzas,
            remainingStanzas: this.pendingStanzas,
            serverStanzaCount,
            forced
        });
        this.runtime.emitOfflineResume({
            status: 'complete',
            totalStanzas: this.totalStanzas,
            remainingStanzas: this.pendingStanzas,
            forced
        });
    }
    /**
     * Ask the server for the next window of queued stanzas, at most one request
     * per `REQUEST_DEBOUNCE_MS` and never while one is still outstanding. Only a
     * delivered stanza schedules a request, so the loop winds down on its own
     * once the queue dries up; the resume itself ends on the terminal `offline`
     * bulletin or on the stanza timeout, never on the preview counter, which is
     * a progress estimate rather than an authoritative total.
     */
    scheduleNextBatch() {
        if (this.batchInFlight || this.batchTimeout !== null) {
            return;
        }
        const elapsedMs = Date.now() - this.lastBatchRequestMs;
        if (elapsedMs >= WA_OFFLINE_RESUME.REQUEST_DEBOUNCE_MS) {
            this.requestOfflineBatch();
            return;
        }
        this.batchTimeout = setTimeout(() => {
            this.batchTimeout = null;
            if (this.state === WA_OFFLINE_RESUME_STATE.RESUMING) {
                this.scheduleNextBatch();
            }
        }, WA_OFFLINE_RESUME.REQUEST_DEBOUNCE_MS - elapsedMs);
    }
    requestOfflineBatch() {
        this.batchInFlight = true;
        this.lastBatchRequestMs = Date.now();
        this.logger.debug('offline batch requested', {
            batchSize: WA_OFFLINE_RESUME.BATCH_SIZE,
            remainingStanzas: this.pendingStanzas
        });
        void this.sendOfflineBatch(this.resumeGeneration);
    }
    /**
     * A rejected request delivers no stanza, and only a delivered stanza
     * schedules the next one, so without a retry here a single transport blip
     * strands the whole queue until the stanza timeout. `generation` pins the
     * outcome to the resume that issued it: a rejection from a torn-down resume
     * must not clear the current one's in-flight flag or retry on its behalf.
     */
    async sendOfflineBatch(generation) {
        try {
            await this.runtime.sendNode((0, offline_1.buildOfflineBatchNode)(WA_OFFLINE_RESUME.BATCH_SIZE));
            if (generation === this.resumeGeneration) {
                this.batchRetries = 0;
            }
        }
        catch (err) {
            if (generation !== this.resumeGeneration ||
                this.state !== WA_OFFLINE_RESUME_STATE.RESUMING) {
                return;
            }
            this.batchInFlight = false;
            this.batchRetries += 1;
            if (this.batchRetries > WA_OFFLINE_RESUME.MAX_BATCH_RETRIES) {
                this.logger.warn('offline batch request failed, giving up', {
                    attempts: this.batchRetries,
                    remainingStanzas: this.pendingStanzas,
                    message: (0, primitives_1.toError)(err).message
                });
                return;
            }
            this.logger.debug('offline batch request failed, retrying', {
                attempt: this.batchRetries,
                message: (0, primitives_1.toError)(err).message
            });
            this.scheduleNextBatch();
        }
    }
    resetStanzaTimeout() {
        if (this.stanzaTimeout !== null) {
            clearTimeout(this.stanzaTimeout);
        }
        this.stanzaTimeout = setTimeout(() => {
            this.stanzaTimeout = null;
            if (this.state === WA_OFFLINE_RESUME_STATE.RESUMING) {
                this.logger.warn('offline resume forced complete due to stanza timeout', {
                    totalStanzas: this.totalStanzas,
                    remainingStanzas: this.pendingStanzas
                });
                this.completeResume(true);
            }
        }, WA_OFFLINE_RESUME.STANZA_TIMEOUT_MS);
    }
    clearTimers() {
        if (this.stanzaTimeout !== null) {
            clearTimeout(this.stanzaTimeout);
            this.stanzaTimeout = null;
        }
        if (this.batchTimeout !== null) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
    }
}
exports.WaOfflineResumeCoordinator = WaOfflineResumeCoordinator;
