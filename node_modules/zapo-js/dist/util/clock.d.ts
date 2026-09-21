export type GetClockSkewMs = () => number | null | undefined;
export interface ServerClock {
    nowMs(): number;
    nowSeconds(): number;
}
export declare function createServerClock(getClockSkewMs: GetClockSkewMs): ServerClock;
