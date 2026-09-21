/**
 * Returns a human-friendly OS name (`Windows` / `Mac OS` / `Linux`) for the
 * current process, falling back to `process.platform` for other OSes.
 */
export declare function getRuntimeOsDisplayName(): string;
/**
 * Returns the marketing OS version (`10`, `11`, `14.6`, ...) for the current
 * process, or `null` when it cannot be determined.
 *
 * WhatsApp Web fills `DeviceProps.version` from the browser's parsed
 * user-agent, which reports the OS as a user sees it – `10` for Windows 10,
 * `14.6` for macOS Sonoma. Node's `os.release()` instead reports the kernel
 * build (`10.0.26200` on Windows, the Darwin version on macOS), so the two
 * families are translated here and every other platform falls back to the raw
 * release string. Callers may bypass this entirely with an explicit option.
 */
export declare function getRuntimeOsVersion(): string | null;
/** Returns `true` when running under the Bun runtime. */
export declare function isBunRuntime(): boolean;
