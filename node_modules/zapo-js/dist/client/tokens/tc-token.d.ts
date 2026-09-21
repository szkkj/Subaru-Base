export declare function computeBucket(unixTimeS: number, durationS: number): number;
export declare function tokenExpirationCutoffS(nowS: number, durationS: number, numBuckets: number): number;
export declare function isTokenExpired(tokenTimestampS: number, nowS: number, durationS: number, numBuckets: number): boolean;
export declare function shouldSendNewToken(senderTimestampS: number, nowS: number, senderDurationS: number): boolean;
export declare function clampDuration(durationS: number, maxDurationS: number): number;
