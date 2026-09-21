"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerClock = createServerClock;
function createServerClock(getClockSkewMs) {
    return {
        nowMs() {
            const skewMs = getClockSkewMs();
            const nowMs = Date.now();
            return Number.isFinite(skewMs) ? nowMs + skewMs : nowMs;
        },
        nowSeconds() {
            const skewMs = getClockSkewMs();
            const nowMs = Date.now();
            const correctedMs = Number.isFinite(skewMs) ? nowMs + skewMs : nowMs;
            return Math.floor(correctedMs / 1000);
        }
    };
}
