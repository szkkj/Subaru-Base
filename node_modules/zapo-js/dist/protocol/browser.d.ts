export declare const WA_BROWSERS: Readonly<{
    readonly CHROME: "chrome";
    readonly CHROMIUM: "chromium";
    readonly FIREFOX: "firefox";
    readonly SAFARI: "safari";
    readonly IE: "ie";
    readonly OPERA: "opera";
    readonly EDGE: "edge";
}>;
export declare const WA_COMPANION_PLATFORM_IDS: Readonly<{
    readonly UNKNOWN: "0";
    readonly CHROME: "1";
    readonly EDGE: "2";
    readonly FIREFOX: "3";
    readonly IE: "4";
    readonly OPERA: "5";
    readonly SAFARI: "6";
    readonly ELECTRON: "7";
    readonly UWP: "8";
    readonly OTHER_WEB_CLIENT: "9";
}>;
/**
 * Maps a {@link WA_BROWSERS} value to the companion platform id sent in the
 * pairing `link_code` stanza. Unknown inputs fall back to `OTHER_WEB_CLIENT`.
 */
export declare function getWaCompanionPlatformId(browser: string): string;
/**
 * Returns the human-readable browser name advertised during pairing.
 * Unknown inputs are echoed back unchanged.
 */
export declare function getWaBrowserDisplayName(browser: string): string;
