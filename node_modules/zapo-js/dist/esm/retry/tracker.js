import { isGroupOrBroadcastJid, toUserJid } from '../protocol/jid.js';
import { encodeRetryReplayPayload } from './codec.js';
import { RETRY_OUTBOUND_TTL_MS } from './constants.js';
import { toError } from '../util/primitives.js';
/** Builds an {@link OutboundRetryTracker} backed by a {@link WaRetryStore}. */
export function createOutboundRetryTracker(options) {
    const { retryStore, logger } = options;
    const retryTtlMs = retryStore.getTtlMs?.() ?? RETRY_OUTBOUND_TTL_MS;
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
                deduped.add(toUserJid(raw));
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
                message: toError(error).message
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
                : encodeRetryReplayPayload(hint.replayPayload);
            let eligibleRequesterDeviceJids = normalizeEligibleRequesterDeviceJids(hint.eligibleRequesterDeviceJids);
            if (!eligibleRequesterDeviceJids &&
                resolvedToJid &&
                !isGroupOrBroadcastJid(resolvedToJid)) {
                try {
                    eligibleRequesterDeviceJids = [toUserJid(resolvedToJid)];
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
