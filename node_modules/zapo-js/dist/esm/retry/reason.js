import { RETRY_REASON } from './constants.js';
import { toError } from '../util/primitives.js';
const RETRY_REASON_MATCHERS = [
    {
        matches: ['no session', 'session not found'],
        code: RETRY_REASON.SignalErrorNoSession
    },
    { matches: ['invalid key id'], code: RETRY_REASON.SignalErrorInvalidKeyId },
    { matches: ['invalid key'], code: RETRY_REASON.SignalErrorInvalidKey },
    {
        matches: [
            'invalid signal message',
            'invalid prekey signal message',
            'invalid sender key message'
        ],
        code: RETRY_REASON.SignalErrorInvalidMessage
    },
    { matches: ['invalid signature'], code: RETRY_REASON.SignalErrorInvalidSignature },
    {
        matches: ['too far in future', 'too many messages in future', 'future message'],
        code: RETRY_REASON.SignalErrorFutureMessage
    },
    { matches: ['invalid message mac', 'invalid mac'], code: RETRY_REASON.SignalErrorBadMac },
    { matches: ['invalid session'], code: RETRY_REASON.SignalErrorInvalidSession },
    { matches: ['invalid message key'], code: RETRY_REASON.SignalErrorInvalidMsgKey },
    {
        matches: [['broadcast', 'ephemeral']],
        code: RETRY_REASON.BadBroadcastEphemeralSetting
    },
    {
        matches: ['unknown companion', 'unknown device'],
        code: RETRY_REASON.UnknownCompanionNoPrekey
    },
    { matches: ['adv'], code: RETRY_REASON.AdvFailure },
    {
        matches: [['status', 'revoke', 'delay']],
        code: RETRY_REASON.StatusRevokeDelay
    }
];
/**
 * Maps a decryption/Signal error to the appropriate {@link WaRetryReasonCode}
 * so an outbound retry receipt carries the correct `error` attribute.
 * Returns `undefined` when no known reason matches.
 */
export function mapRetryReasonFromError(error) {
    const message = toError(error).message.toLowerCase();
    for (const matcher of RETRY_REASON_MATCHERS) {
        if (matcher.matches.some((candidate) => Array.isArray(candidate)
            ? candidate.every((part) => message.includes(part))
            : message.includes(candidate))) {
            return matcher.code;
        }
    }
    return undefined;
}
