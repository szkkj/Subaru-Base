import type { WaProxyTransport } from './types';
/** Options shared by the Web and Mobile version fetchers. */
export interface WaFetchVersionOptions {
    /**
     * Proxy transport. Only undici-style `WaProxyDispatcher` is honored –
     * the global `fetch` does not consume `http.Agent`.
     */
    readonly proxy?: WaProxyTransport;
    /** Request timeout (ms). Defaults to 10s. */
    readonly timeoutMs?: number;
    /** External abort signal. */
    readonly signal?: AbortSignal;
    /** Override the request user-agent. */
    readonly userAgent?: string;
    /** Extra request headers (merged on top of defaults). */
    readonly headers?: Readonly<Record<string, string>>;
    /**
     * Override the `fetch` implementation. Lets tests inject a stub without
     * monkey-patching `globalThis.fetch`. Defaults to `globalThis.fetch`.
     */
    readonly fetch?: typeof fetch;
}
export type WaFetchLatestWebVersionOptions = WaFetchVersionOptions;
export interface WaFetchLatestMobileVersionOptions extends WaFetchVersionOptions {
    /**
     * Override the page to scrape. Defaults to a public WhatsApp for Android
     * listing. Provide your own mirror if the default layout changes or is
     * unreachable from your network.
     */
    readonly url?: string;
    /**
     * Override the version-extraction regex. Must expose the version string
     * in capture group 1. Defaults to a 4-part WhatsApp `2.x.x.x` matcher
     * whose first hit is the current release.
     */
    readonly versionPattern?: RegExp;
}
export interface WaLatestWebVersion {
    /** Version string in the `2.3000.x` form accepted by `WaClientOptions.version`. */
    readonly version: string;
    /** Parsed numeric parts. */
    readonly parts: readonly [number, number, number];
}
export interface WaLatestMobileVersion {
    /**
     * Version string in the 4-part `2.26.x.y` form accepted by
     * `WaMobileTransportDeviceInfo.appVersion`.
     */
    readonly version: string;
    /** Parsed numeric parts (always four elements). */
    readonly parts: readonly [number, number, number, number];
}
/**
 * Fetches the current WhatsApp Web `client_revision` from the public
 * `sw.js` served by the WhatsApp Web frontend and assembles a
 * `2.3000.x` version string suitable for `WaClientOptions.version`.
 *
 * Use this when the library's hardcoded default starts being rejected by
 * the server with HTTP 405 / `failure_client_too_old`, and you need to
 * refresh the version without waiting for a library bump.
 *
 * Network failures and parse errors throw; wrap in a `try`/`catch` and
 * fall back to the hardcoded default.
 *
 * @example
 * const latest = await fetchLatestWaWebVersion()
 * const client = new WaClient({ store, sessionId, version: latest.version })
 */
export declare function fetchLatestWaWebVersion(options?: WaFetchLatestWebVersionOptions): Promise<WaLatestWebVersion>;
/**
 * Fetches the current WhatsApp for Android app version by scraping a public
 * app-listing page and assembles a `2.26.x.y` version string suitable for
 * `WaMobileTransportDeviceInfo.appVersion` (the mobile login payload).
 *
 * This is the mobile counterpart to {@link fetchLatestWaWebVersion}. The Web
 * client exposes its `client_revision` in a stable JSON blob (`sw.js`); the
 * Android app version is only published on app-listing pages, so this reads
 * HTML and is inherently more layout-dependent. Retarget it with `url` /
 * `versionPattern` if the default source changes.
 *
 * Use this when the app version baked into your `deviceInfo` starts being
 * rejected by the server as too old, and you need to refresh it without
 * waiting for a library bump.
 *
 * Network failures and parse errors throw; wrap in a `try`/`catch` and fall
 * back to a known-good hardcoded version.
 *
 * @example
 * const latest = await fetchLatestWaMobileVersion()
 * const deviceInfo = { ...baseDeviceInfo, appVersion: latest.version }
 */
export declare function fetchLatestWaMobileVersion(options?: WaFetchLatestMobileVersionOptions): Promise<WaLatestMobileVersion>;
