"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeBucket = computeBucket;
exports.tokenExpirationCutoffS = tokenExpirationCutoffS;
exports.isTokenExpired = isTokenExpired;
exports.shouldSendNewToken = shouldSendNewToken;
exports.clampDuration = clampDuration;
function computeBucket(unixTimeS, durationS) {
    return Math.floor(unixTimeS / durationS);
}
function tokenExpirationCutoffS(nowS, durationS, numBuckets) {
    const currentBucket = computeBucket(nowS, durationS);
    const cutoffBucket = currentBucket - numBuckets;
    return cutoffBucket * durationS;
}
function isTokenExpired(tokenTimestampS, nowS, durationS, numBuckets) {
    const cutoff = tokenExpirationCutoffS(nowS, durationS, numBuckets);
    return tokenTimestampS < cutoff;
}
function shouldSendNewToken(senderTimestampS, nowS, senderDurationS) {
    return computeBucket(senderTimestampS, senderDurationS) !== computeBucket(nowS, senderDurationS);
}
function clampDuration(durationS, maxDurationS) {
    return Math.min(durationS, maxDurationS);
}
