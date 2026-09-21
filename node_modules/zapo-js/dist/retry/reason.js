"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRetryReasonFromError = mapRetryReasonFromError;
const constants_1 = require("./constants");
const primitives_1 = require("../util/primitives");
const RETRY_REASON_MATCHERS = [
    {
        matches: ['no session', 'session not found'],
        code: constants_1.RETRY_REASON.SignalErrorNoSession
    },
    { matches: ['invalid key id'], code: constants_1.RETRY_REASON.SignalErrorInvalidKeyId },
    { matches: ['invalid key'], code: constants_1.RETRY_REASON.SignalErrorInvalidKey },
    {
        matches: [
            'invalid signal message',
            'invalid prekey signal message',
            'invalid sender key message'
        ],
        code: constants_1.RETRY_REASON.SignalErrorInvalidMessage
    },
    { matches: ['invalid signature'], code: constants_1.RETRY_REASON.SignalErrorInvalidSignature },
    {
        matches: ['too far in future', 'too many messages in future', 'future message'],
        code: constants_1.RETRY_REASON.SignalErrorFutureMessage
    },
    { matches: ['invalid message mac', 'invalid mac'], code: constants_1.RETRY_REASON.SignalErrorBadMac },
    { matches: ['invalid session'], code: constants_1.RETRY_REASON.SignalErrorInvalidSession },
    { matches: ['invalid message key'], code: constants_1.RETRY_REASON.SignalErrorInvalidMsgKey },
    {
        matches: [['broadcast', 'ephemeral']],
        code: constants_1.RETRY_REASON.BadBroadcastEphemeralSetting
    },
    {
        matches: ['unknown companion', 'unknown device'],
        code: constants_1.RETRY_REASON.UnknownCompanionNoPrekey
    },
    { matches: ['adv'], code: constants_1.RETRY_REASON.AdvFailure },
    {
        matches: [['status', 'revoke', 'delay']],
        code: constants_1.RETRY_REASON.StatusRevokeDelay
    }
];
/**
 * Maps a decryption/Signal error to the appropriate {@link WaRetryReasonCode}
 * so an outbound retry receipt carries the correct `error` attribute.
 * Returns `undefined` when no known reason matches.
 */
function mapRetryReasonFromError(error) {
    const message = (0, primitives_1.toError)(error).message.toLowerCase();
    for (const matcher of RETRY_REASON_MATCHERS) {
        if (matcher.matches.some((candidate) => Array.isArray(candidate)
            ? candidate.every((part) => message.includes(part))
            : message.includes(candidate))) {
            return matcher.code;
        }
    }
    return undefined;
}
