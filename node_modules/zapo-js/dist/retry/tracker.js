"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOutboundRetryTracker = createOutboundRetryTracker;
const jid_1 = require("../protocol/jid");
const codec_1 = require("./codec");
const constants_1 = require("./constants");
const primitives_1 = require("../util/primitives");
/** Builds an {@link OutboundRetryTracker} backed by a {@link WaRetryStore}. */
function createOutboundRetryTracker(options) {
    const { retryStore, logger } = options;
    const retryTtlMs = retryStore.getTtlMs?.() ?? constants_1.RETRY_OUTBOUND_TTL_MS;
    const supportsRawReplayPayload = retryStore.supportsRawReplayPayload?.() ?? false;
    const normalizeEligibleRequesterDeviceJids = (values) => {
        if (!values || values.length === 0) {
            return undefined;
        }
        const deduped = new Set();
        for (let index = 0; index < values.length; index += 1) {
            const raw = values[index]?.trim();
            if (!raw) {
                continue;
            }
            try {
                deduped.add((0, jid_1.toUserJid)(raw));
            }
            catch {
                continue;
            }
        }
        if (deduped.size === 0) {
            return undefined;
        }
        return Array.from(deduped);
    };
    const safeUpsertRetryOutboundRecord = async (record) => {
        try {
            await retryStore.upsertOutboundMessage(record);
        }
        catch (error) {
            logger.warn('failed to persist retry outbound message record', {
                messageId: record.messageId,
                to: record.toJid,
                mode: record.replayMode,
                message: (0, primitives_1.toError)(error).message
            });
            return false;
        }
        return true;
    };
    return {
        track: async (hint, publish) => {
            const replayMode = hint.replayPayload.mode;
            const resolvedToJid = hint.toJid ?? (replayMode === 'opaque_node' ? '' : hint.replayPayload.to);
            const replayPayload = supportsRawReplayPayload
                ? hint.replayPayload
                : (0, codec_1.encodeRetryReplayPayload)(hint.replayPayload);
            let eligibleRequesterDeviceJids = normalizeEligibleRequesterDeviceJids(hint.eligibleRequesterDeviceJids);
            if (!eligibleRequesterDeviceJids &&
                resolvedToJid &&
                !(0, jid_1.isGroupOrBroadcastJid)(resolvedToJid)) {
                try {
                    eligibleRequesterDeviceJids = [(0, jid_1.toUserJid)(resolvedToJid)];
                }
                catch {
                    eligibleRequesterDeviceJids = undefined;
                }
            }
            const createRetryOutboundRecord = (messageId, updatedAtMs, expiresAtMs) => ({
                messageId,
                toJid: resolvedToJid,
                eligibleRequesterDeviceJids,
                deliveredRequesterDeviceJids: [],
                replayMode,
                replayPayload,
                state: 'pending',
                updatedAtMs,
                expiresAtMs
            });
            const result = await publish();
            const persistedMessageId = result.id.trim();
            if (!persistedMessageId) {
                logger.warn('retry outbound record skipped: publish returned empty message id', {
                    to: resolvedToJid,
                    mode: replayMode
                });
                return result;
            }
            const persistedNowMs = Date.now();
            await safeUpsertRetryOutboundRecord(createRetryOutboundRecord(persistedMessageId, persistedNowMs, persistedNowMs + retryTtlMs));
            return result;
        }
    };
}
