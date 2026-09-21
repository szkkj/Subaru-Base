"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWaDeviceIdentity = resolveWaDeviceIdentity;
const browser_1 = require("./browser");
const defaults_1 = require("./defaults");
const runtime_1 = require("../util/runtime");
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
function resolveWaDeviceIdentity(options) {
    const browser = options.deviceBrowser ?? defaults_1.WA_DEFAULTS.DEVICE_BROWSER;
    return Object.freeze({
        browser,
        osDisplayName: options.deviceOsDisplayName ?? (0, runtime_1.getRuntimeOsDisplayName)(),
        osVersion: options.deviceOsVersion ?? (0, runtime_1.getRuntimeOsVersion)(),
        platform: options.devicePlatform ?? (0, browser_1.getWaCompanionPlatformId)(browser)
    });
}
