import type { PreKeyRecord, RegistrationInfo, SignedPreKeyRecord } from '../types';
export interface SignalRegistrationRow extends Record<string, unknown> {
    readonly registration_id: unknown;
    readonly identity_pub_key: unknown;
    readonly identity_priv_key: unknown;
}
export interface SignalSignedPreKeyRow extends Record<string, unknown> {
    readonly key_id: unknown;
    readonly pub_key: unknown;
    readonly priv_key: unknown;
    readonly signature: unknown;
    readonly uploaded: unknown;
}
export interface SignalPreKeyRow extends Record<string, unknown> {
    readonly key_id: unknown;
    readonly pub_key: unknown;
    readonly priv_key: unknown;
    readonly uploaded: unknown;
}
export interface SignalMetaRow extends Record<string, unknown> {
    readonly server_has_prekeys: unknown;
    readonly next_prekey_id: unknown;
    readonly signed_prekey_rotation_ts: unknown;
}
/** Decodes a stored signal-registration SQL row into a {@link RegistrationInfo}. */
export declare function decodeSignalRegistrationRow(row: SignalRegistrationRow): RegistrationInfo;
/** Decodes a one-time prekey SQL row into a {@link PreKeyRecord}. */
export declare function decodeSignalPreKeyRow(row: SignalPreKeyRow): PreKeyRecord;
/** Decodes a signed-prekey SQL row into a {@link SignedPreKeyRecord}. */
export declare function decodeSignalSignedPreKeyRow(row: SignalSignedPreKeyRow): SignedPreKeyRecord;
