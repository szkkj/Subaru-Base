import { WA_CONNECTION_REASONS, WA_DISCONNECT_REASONS, WA_STREAM_SIGNALING } from '../../protocol/constants.js';
import { toError } from '../../util/primitives.js';
export function createStreamControlHandler(options) {
    const { logger, getComms, clearPendingQueries, clearMediaConnCache, disconnect, clearStoredCredentials, connect } = options;
    let lifecyclePromise = null;
    const runStreamControlLifecycle = (reason, action) => {
        if (lifecyclePromise) {
            logger.debug('stream-control lifecycle already running', { reason });
            return lifecyclePromise;
        }
        lifecyclePromise = action().finally(() => {
            lifecyclePromise = null;
        });
        return lifecyclePromise;
    };
    const restartBackendAfterStreamControl = async (reason) => {
        logger.info('restarting backend after stream control', { reason });
        try {
            await connect(WA_CONNECTION_REASONS.RECONNECTED);
        }
        catch (error) {
            logger.warn('failed to restart backend after stream control', {
                reason,
                message: toError(error).message
            });
        }
    };
    const resumeSocketDueToStreamError = async (reason) => {
        const comms = getComms();
        if (!comms) {
            return;
        }
        logger.info('resuming socket due to stream control node', { reason });
        clearPendingQueries(new Error(`socket resume requested by ${reason}`));
        clearMediaConnCache();
        try {
            await comms.closeSocketAndResume();
        }
        catch (error) {
            logger.warn('failed to resume socket for stream control node', {
                reason,
                message: toError(error).message
            });
        }
    };
    const stopCommsImmediately = () => {
        void getComms()?.stopComms();
    };
    const forceLoginDueToStreamError = async (code) => {
        const reason = WA_DISCONNECT_REASONS.STREAM_ERROR_FORCE_LOGIN;
        stopCommsImmediately();
        await runStreamControlLifecycle(reason, async () => {
            logger.warn('received forced login stream error; reconnecting, keeping credentials', {
                code
            });
            await disconnect(reason, false, code);
            await restartBackendAfterStreamControl(reason);
        });
    };
    const disconnectDueToStreamError = async (reason, code) => {
        stopCommsImmediately();
        await runStreamControlLifecycle(reason, async () => {
            logger.warn('disconnecting due to stream control node', { reason });
            await disconnect(reason, false, code);
        });
    };
    const logoutDueToStreamError = async (reason, code, shouldRestartBackend) => {
        stopCommsImmediately();
        await runStreamControlLifecycle(reason, async () => {
            logger.warn('logging out due to stream control node', {
                reason,
                shouldRestartBackend
            });
            await disconnect(reason, true, code);
            await clearStoredCredentials();
            if (shouldRestartBackend) {
                await restartBackendAfterStreamControl(reason);
            }
        });
    };
    return {
        handleStreamControlResult: async (result) => {
            switch (result.kind) {
                case WA_STREAM_SIGNALING.XML_STREAM_END_TAG:
                    logger.info('received xmlstreamend stanza');
                    return;
                case 'stream_error_code':
                    logger.warn('received stream:error with code', { code: result.code });
                    if (result.code >= 500 && result.code < 600) {
                        if (result.code === WA_STREAM_SIGNALING.FORCE_LOGIN_CODE) {
                            await forceLoginDueToStreamError(result.code);
                            return;
                        }
                        if (result.code === WA_STREAM_SIGNALING.FORCE_LOGOUT_CODE) {
                            await logoutDueToStreamError(WA_DISCONNECT_REASONS.STREAM_ERROR_FORCE_LOGOUT, result.code, true);
                            return;
                        }
                    }
                    await resumeSocketDueToStreamError(`stream_error_code_${result.code}`);
                    return;
                case WA_DISCONNECT_REASONS.STREAM_ERROR_REPLACED:
                    logger.warn('received stream:error replaced, stopping client');
                    await disconnectDueToStreamError(WA_DISCONNECT_REASONS.STREAM_ERROR_REPLACED, null);
                    return;
                case WA_DISCONNECT_REASONS.STREAM_ERROR_DEVICE_REMOVED:
                    logger.warn('received stream:error device removed, logging out');
                    await logoutDueToStreamError(WA_DISCONNECT_REASONS.STREAM_ERROR_DEVICE_REMOVED, null, false);
                    return;
                case WA_DISCONNECT_REASONS.STREAM_ERROR_ACK:
                    logger.warn('received stream:error ack', { id: result.id });
                    await resumeSocketDueToStreamError(WA_DISCONNECT_REASONS.STREAM_ERROR_ACK);
                    return;
                case WA_DISCONNECT_REASONS.STREAM_ERROR_XML_NOT_WELL_FORMED:
                    logger.warn('received stream:error xml-not-well-formed');
                    await resumeSocketDueToStreamError(WA_DISCONNECT_REASONS.STREAM_ERROR_XML_NOT_WELL_FORMED);
                    return;
                case WA_DISCONNECT_REASONS.STREAM_ERROR_OTHER:
                    logger.warn('received stream:error other');
                    await resumeSocketDueToStreamError(WA_DISCONNECT_REASONS.STREAM_ERROR_OTHER);
                    return;
                default:
                    return;
            }
        }
    };
}
