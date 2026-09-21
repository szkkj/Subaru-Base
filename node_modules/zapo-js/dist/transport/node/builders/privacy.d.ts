import { type WaPrivacyCategory, type WaPrivacyListAction, type WaPrivacyValue } from '../../../protocol/privacy';
import type { BinaryNode } from '../../types';
export declare function buildGetPrivacySettingsIq(): BinaryNode;
export declare function buildSetPrivacyCategoryIq(category: WaPrivacyCategory, value: WaPrivacyValue): BinaryNode;
/**
 * Builds the disallowed-list `get` IQ. Pass `lidAddressing` for LID-migrated
 * accounts - see {@link buildPrivacyEnvelopeAttrs}.
 */
export declare function buildGetPrivacyDisallowedListIq(category: WaPrivacyCategory, lidAddressing: boolean): BinaryNode;
/**
 * One `<user>` entry of a disallowed-list mutation, already resolved into both
 * addressing forms. Under LID addressing the server keys the entry by
 * `lidJid` and takes `pnJid` as the identifier hint; otherwise the phone jid
 * addresses it alone.
 */
export interface WaPrivacyDisallowedListEntry {
    readonly action: WaPrivacyListAction;
    readonly lidJid: string | null;
    readonly pnJid: string | null;
    /** Accepted in place of `pn_jid` for a migrated contact. */
    readonly username?: string | null;
}
/**
 * Builds the disallowed-list `set` IQ. The category value and the list
 * entries travel in the same stanza - the deny-list is not a separate
 * endpoint - and `dhash` is the version stamp the server handed out on the
 * last write/read (`'none'` when the client holds none). A stale stamp is
 * rejected with `409`, which the caller resolves by refetching the list and
 * retrying.
 */
export declare function buildSetPrivacyDisallowedListIq(category: WaPrivacyCategory, entries: readonly WaPrivacyDisallowedListEntry[], dhash: string | null, lidAddressing: boolean): BinaryNode;
export declare function buildGetBlocklistIq(): BinaryNode;
/**
 * Blocklist target in both addressing forms. At least one side is always
 * present: LID-migrated accounts carry `lidJid` (plus `pnJid` when known),
 * non-migrated accounts carry only `pnJid`. `username` / `displayName` come
 * from the stored contact record.
 */
export type WaBlocklistTarget = ({
    readonly lidJid: string;
    readonly pnJid: string | null;
} | {
    readonly lidJid: null;
    readonly pnJid: string;
}) & {
    readonly username?: string | null;
    readonly displayName?: string | null;
};
/**
 * Builds the blocklist `set` IQ for a block action. LID-migrated targets are
 * addressed by the LID jid plus one identifier attribute (see
 * {@link resolveBlocklistIdentifierAttrs}). Non-migrated targets are addressed
 * by the phone jid alone. The server rejects a block that addresses a migrated
 * account by phone jid or omits the identifier (`400: bad-request`).
 */
export declare function buildBlocklistBlockIq(target: WaBlocklistTarget): BinaryNode;
/**
 * Builds the blocklist `set` IQ for an unblock action. The server keys
 * migrated entries by LID, so `jid` must be the LID jid when one exists.
 */
export declare function buildBlocklistUnblockIq(jid: string): BinaryNode;
