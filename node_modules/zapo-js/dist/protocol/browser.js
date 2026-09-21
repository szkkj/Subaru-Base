"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_COMPANION_PLATFORM_IDS = exports.WA_BROWSERS = void 0;
exports.getWaCompanionPlatformId = getWaCompanionPlatformId;
exports.getWaBrowserDisplayName = getWaBrowserDisplayName;
exports.WA_BROWSERS = Object.freeze({
    CHROME: 'chrome',
    CHROMIUM: 'chromium',
    FIREFOX: 'firefox',
    SAFARI: 'safari',
    IE: 'ie',
    OPERA: 'opera',
    EDGE: 'edge'
});
// Distinct from proto.DeviceProps.PlatformType: these are the string IDs sent
// as companionPlatformId in the pairing link_code XML stanza, not the proto enum.
exports.WA_COMPANION_PLATFORM_IDS = Object.freeze({
    UNKNOWN: '0',
    CHROME: '1',
    EDGE: '2',
    FIREFOX: '3',
    IE: '4',
    OPERA: '5',
    SAFARI: '6',
    ELECTRON: '7',
    UWP: '8',
    OTHER_WEB_CLIENT: '9'
});
const BROWSER_TO_PLATFORM_ID = {
    [exports.WA_BROWSERS.CHROME]: exports.WA_COMPANION_PLATFORM_IDS.CHROME,
    [exports.WA_BROWSERS.FIREFOX]: exports.WA_COMPANION_PLATFORM_IDS.FIREFOX,
    [exports.WA_BROWSERS.IE]: exports.WA_COMPANION_PLATFORM_IDS.IE,
    [exports.WA_BROWSERS.OPERA]: exports.WA_COMPANION_PLATFORM_IDS.OPERA,
    [exports.WA_BROWSERS.SAFARI]: exports.WA_COMPANION_PLATFORM_IDS.SAFARI,
    [exports.WA_BROWSERS.EDGE]: exports.WA_COMPANION_PLATFORM_IDS.EDGE
};
const BROWSER_TO_DISPLAY_NAME = {
    [exports.WA_BROWSERS.CHROME]: 'Chrome',
    [exports.WA_BROWSERS.CHROMIUM]: 'Chromium',
    [exports.WA_BROWSERS.FIREFOX]: 'Firefox',
    [exports.WA_BROWSERS.IE]: 'IE',
    [exports.WA_BROWSERS.OPERA]: 'Opera',
    [exports.WA_BROWSERS.SAFARI]: 'Safari',
    [exports.WA_BROWSERS.EDGE]: 'Edge'
};
/**
 * Maps a {@link WA_BROWSERS} value to the companion platform id sent in the
 * pairing `link_code` stanza. Unknown inputs fall back to `OTHER_WEB_CLIENT`.
 */
function getWaCompanionPlatformId(browser) {
    return (BROWSER_TO_PLATFORM_ID[browser.trim().toLowerCase()] ??
        exports.WA_COMPANION_PLATFORM_IDS.OTHER_WEB_CLIENT);
}
/**
 * Returns the human-readable browser name advertised during pairing.
 * Unknown inputs are echoed back unchanged.
 */
function getWaBrowserDisplayName(browser) {
    return BROWSER_TO_DISPLAY_NAME[browser.trim().toLowerCase()] ?? browser;
}
