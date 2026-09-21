import { type WaPrivacyCategory, type WaPrivacySettingName, type WaPrivacySettingValueMap } from '../../protocol/privacy';
import type { BinaryNode } from '../../transport/types';
/**
 * Snapshot of every privacy category the server reports. Categories the
 * library does not model (or that came back as `error`) are absent instead
 * of being surfaced with a placeholder value.
 */
export type WaPrivacySettings = {
    readonly [K in WaPrivacySettingName]?: WaPrivacySettingValueMap[K];
};
/** `username` is set only when the server identified the entry that way. */
export interface WaPrivacyListEntry {
    readonly jid: string;
    readonly username?: string;
}
/** Per-category deny-list (the JIDs excluded from a `contact_blacklist` setting). */
export interface WaPrivacyDisallowedListResult {
    readonly jids: readonly string[];
    /** Same membership as {@link jids}, with the per-entry handles. */
    readonly entries: readonly WaPrivacyListEntry[];
    readonly dhash?: string;
}
/** Account-wide blocklist. The server always sends the full list, never a delta. */
export interface WaBlocklistResult {
    readonly jids: readonly string[];
    /** Same membership as {@link jids}, with the per-entry handles. */
    readonly entries: readonly WaPrivacyListEntry[];
    readonly dhash?: string;
}
/** Parses the `<privacy>` payload of a privacy `get` IQ result. */
export declare function parsePrivacySettings(result: BinaryNode): WaPrivacySettings;
/**
 * Reads the `dhash` the server echoes back on a privacy `set` result. It is a
 * millisecond timestamp acting as the version stamp of that category's
 * disallowed list, and is only present while the category sits on
 * `contact_blacklist`.
 */
export declare function parsePrivacyCategoryDhash(result: BinaryNode, category: WaPrivacyCategory): string | null;
/**
 * Parses the `<privacy><list>` payload of a disallowed-list `get` IQ result,
 * returning `null` when the reply carries no `<list>` at all. The server omits
 * it to mean "nothing to update" - either the category is not on
 * `contact_blacklist`, or the `dhash` the client sent still matches - which is
 * different from an empty list, so a caller reacting to changes can skip it.
 */
export declare function parseDisallowedListUpdate(result: BinaryNode): WaPrivacyDisallowedListResult | null;
/**
 * Same read as {@link parseDisallowedListUpdate}, flattening the "nothing to
 * update" reply into an empty list for callers that just want the current
 * membership.
 */
export declare function parseDisallowedList(result: BinaryNode): WaPrivacyDisallowedListResult;
/** Parses the `<list>` payload of a blocklist `get` IQ result. */
export declare function parseBlocklist(result: BinaryNode): WaBlocklistResult;
