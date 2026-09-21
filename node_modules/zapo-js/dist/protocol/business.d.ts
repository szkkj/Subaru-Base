export declare const WA_BUSINESS_HOURS_DAYS: Readonly<{
    readonly SUN: "sun";
    readonly MON: "mon";
    readonly TUE: "tue";
    readonly WED: "wed";
    readonly THU: "thu";
    readonly FRI: "fri";
    readonly SAT: "sat";
}>;
export type WaBusinessHoursDay = (typeof WA_BUSINESS_HOURS_DAYS)[keyof typeof WA_BUSINESS_HOURS_DAYS];
/**
 * Per-day open mode accepted by the `business_profile` edit IQ. A closed day is
 * expressed by omitting it from the config entirely, not by a dedicated mode.
 * `open_time` / `close_time` are only meaningful for `specific_hours`.
 */
export declare const WA_BUSINESS_HOURS_MODES: Readonly<{
    readonly OPEN_24H: "open_24h";
    readonly SPECIFIC_HOURS: "specific_hours";
    readonly APPOINTMENT_ONLY: "appointment_only";
}>;
export type WaBusinessHoursMode = (typeof WA_BUSINESS_HOURS_MODES)[keyof typeof WA_BUSINESS_HOURS_MODES];
