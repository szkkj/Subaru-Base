import { getWaCompanionPlatformId } from './browser.js';
import { WA_DEFAULTS } from './defaults.js';
import { getRuntimeOsDisplayName, getRuntimeOsVersion } from '../util/runtime.js';
/**
 * Resolves the device identity from raw options, applying the shared defaults:
 * browser falls back to {@link WA_DEFAULTS}.DEVICE_BROWSER, OS name and version
 * to the detected runtime OS, and platform id is inferred from the browser.
 * This is the single source of truth used by both the client factory and the
 * auth client so the pairing payload and any analytics/telemetry agree.
 *
 * Override `deviceOsVersion` together with `deviceOsDisplayName` when
 * advertising an OS the process is not actually running on – otherwise the
 * advertised OS name and version disagree.
 */
export function resolveWaDeviceIdentity(options) {
    const browser = options.deviceBrowser ?? WA_DEFAULTS.DEVICE_BROWSER;
    return Object.freeze({
        browser,
        osDisplayName: options.deviceOsDisplayName ?? getRuntimeOsDisplayName(),
        osVersion: options.deviceOsVersion ?? getRuntimeOsVersion(),
        platform: options.devicePlatform ?? getWaCompanionPlatformId(browser)
    });
}
