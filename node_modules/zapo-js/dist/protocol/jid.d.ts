import type { SignalAddress } from '../signal/types';
/**
 * Splits a JID into `user` and `server` parts at the `@` separator.
 * Throws if the input does not contain a valid `user@server` shape.
 */
export declare function splitJid(jid: string): {
    readonly user: string;
    readonly server: string;
};
/**
 * Normalizes a user-supplied recipient (phone number, group id, or full JID)
 * into a canonical JID. Strings already containing `@` are returned as-is;
 * dashed inputs map to `<input>@g.us` (group); pure-digit inputs map to
 * `<digits>@s.whatsapp.net`.
 */
export declare function normalizeRecipientJid(to: string): string;
/** Returns `true` for JIDs in the `@lid` server (linked-device identity). */
export declare function isLidJid(jid: string): boolean;
/** Returns `true` for JIDs in the `@s.whatsapp.net` server (phone-number user JIDs). */
export declare function isUserJid(jid: string): boolean;
/** Returns `true` for JIDs in the `@bot` server. */
export declare function isBotJid(jid: string): boolean;
/** Returns `true` for JIDs in the `@g.us` server (groups). */
export declare function isGroupJid(jid: string): boolean;
/** Returns `true` for JIDs in the `@broadcast` server (broadcast lists). */
export declare function isBroadcastJid(jid: string): boolean;
/** Returns `true` for the special `status@broadcast` JID. */
export declare function isStatusBroadcastJid(jid: string): boolean;
/** Returns `true` for JIDs in the `@newsletter` server. */
export declare function isNewsletterJid(jid: string): boolean;
/** Returns `true` for any group or broadcast JID. */
export declare function isGroupOrBroadcastJid(jid: string): boolean;
export interface ParsedJid {
    readonly address: SignalAddress;
    readonly userJid: string;
    readonly normalizedJid: string;
}
/**
 * Parses a JID into a Signal-style `{ user, server, device }` address.
 * `device` is `0` when the JID has no `:device` segment.
 */
export declare function parseSignalAddressFromJid(jid: string): SignalAddress;
/**
 * Parses a JID and returns the Signal address plus the user-only and
 * fully-normalized device JID forms in a single pass.
 */
export declare function parseJidFull(jid: string): ParsedJid;
/**
 * Maps the hosted-account server variants (`hosted` / `hosted.lid`) back to
 * their canonical Signal server (`hostDomain` / `lid`). Other servers are
 * returned unchanged.
 */
export declare function canonicalizeSignalServer(server: string, hostDomain?: string): string;
/**
 * Returns the JID rewritten with its server canonicalized via
 * {@link canonicalizeSignalServer} – used to derive the address Signal
 * sessions are keyed by.
 */
export declare function canonicalizeSignalJid(jid: string, hostDomain?: string): string;
/**
 * Strips the `:device` segment from a JID, returning the bare `user@server`
 * form. Set `options.canonicalizeSignalServer` to also rewrite hosted servers
 * via {@link canonicalizeSignalServer}.
 */
export declare function toUserJid(jid: string, options?: {
    readonly canonicalizeSignalServer?: boolean;
    readonly hostDomain?: string;
}): string;
/**
 * True when `jid` is the account's own user, matching the `meJid` (pn) or
 * `meLid` (lid) identity device-insensitively. Mirrors WhatsApp Web's
 * `isMeAccount`, including its addressing-mode equivalence: a hosted device of
 * the account (`<user>@hosted` / `<user>@hosted.lid`) is the same account as
 * `<user>@s.whatsapp.net` / `<user>@lid`, so both sides are canonicalized
 * before comparison.
 */
export declare function isOwnAccountJid(jid: string, meJid: string | null | undefined, meLid: string | null | undefined): boolean;
/**
 * Rewrites the account's own PN device JID to its LID equivalent so self traffic
 * keys one LID session instead of forking into separate PN and LID ratchets.
 * No-op for other users, already-LID/unparseable JIDs, or unknown identity.
 */
export declare function canonicalizeOwnAccountJid(jid: string, meJid: string | null | undefined, meLid: string | null | undefined): string;
/**
 * Returns the JID in its full device form. JIDs with `device === 0` lose the
 * device segment (`user@server`); all others keep `user:device@server`.
 */
export declare function normalizeDeviceJid(jid: string): string;
/**
 * Appends `:device` to a bare user JID. A falsy `device` returns the input
 * unchanged.
 */
export declare function applyDeviceToJid(userJid: string, device: number | undefined): string;
/** Returns `true` when `deviceId` matches the WhatsApp hosted-device id. */
export declare function isHostedDeviceId(deviceId: number): boolean;
/** Returns `true` for the hosted server variants (`hosted` and `hosted.lid`). */
export declare function isHostedServer(server: string): boolean;
/**
 * Returns `true` when the JID refers to a hosted device – either by server
 * (`@hosted` / `@hosted.lid`) or by a `:HOSTED_DEVICE_ID@…` device segment.
 */
export declare function isHostedDeviceJid(jid: string): boolean;
/**
 * Builds a device JID from its parts. When `options.isHosted` is set, the
 * hosted-server variant is selected (preserving LID vs phone) and the canonical
 * hosted device id is used.
 */
export declare function buildDeviceJid(user: string, normalizedServer: string, deviceId: number, options?: {
    readonly rawServer?: string;
    readonly isHosted?: boolean;
}): string;
/**
 * Extracts the numeric username and device id from the authenticated user's
 * own JID. Throws when either segment is missing, non-numeric, or out of the
 * safe-integer range.
 */
export declare function getLoginIdentity(meJid: string): {
    readonly username: number;
    readonly device: number;
};
/**
 * Builds a `<digits>@s.whatsapp.net` JID from a free-form phone number,
 * stripping non-digit characters. Throws when no digits are found.
 */
export declare function parsePhoneJid(input: string): string;
/**
 * Returns a stable `user|server|device` key for a Signal address, suitable
 * as a Map/Set key.
 */
export declare function signalAddressKey(address: SignalAddress): string;
