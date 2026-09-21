import type { Logger } from '../infra/log/types';
import type { WaMessagePublishResult } from '../message/types';
import type { WaRetryReplayPayload } from './types';
import type { WaRetryStore } from '../store/contracts/retry.store';
export type OutboundRetryTrackHint = {
    readonly messageIdHint?: string;
    readonly toJid?: string;
    readonly replayPayload: WaRetryReplayPayload;
    readonly eligibleRequesterDeviceJids?: readonly string[];
};
/**
 * Wraps message publishes and persists a replay record so the
 * {@link WaRetryReplayService} can re-send the message later if a retry
 * receipt arrives.
 */
export type OutboundRetryTracker = {
    /**
     * Runs `publish`, then upserts a retry-outbound record built from the
     * tracking `hint`. Returns the publish result unchanged.
     */
    track(hint: OutboundRetryTrackHint, publish: () => Promise<WaMessagePublishResult>): Promise<WaMessagePublishResult>;
};
/** Builds an {@link OutboundRetryTracker} backed by a {@link WaRetryStore}. */
export declare function createOutboundRetryTracker(options: {
    readonly retryStore: WaRetryStore;
    readonly logger: Logger;
}): OutboundRetryTracker;
