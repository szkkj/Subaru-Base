export function computeBucket(unixTimeS, durationS) {
    return Math.floor(unixTimeS / durationS);
}
export function tokenExpirationCutoffS(nowS, durationS, numBuckets) {
    const currentBucket = computeBucket(nowS, durationS);
    const cutoffBucket = currentBucket - numBuckets;
    return cutoffBucket * durationS;
}
export function isTokenExpired(tokenTimestampS, nowS, durationS, numBuckets) {
    const cutoff = tokenExpirationCutoffS(nowS, durationS, numBuckets);
    return tokenTimestampS < cutoff;
}
export function shouldSendNewToken(senderTimestampS, nowS, senderDurationS) {
    return computeBucket(senderTimestampS, senderDurationS) !== computeBucket(nowS, senderDurationS);
}
export function clampDuration(durationS, maxDurationS) {
    return Math.min(durationS, maxDurationS);
}
