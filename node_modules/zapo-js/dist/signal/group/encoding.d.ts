import type { SenderKeyDistributionRecord, SenderKeyRecord, SignalAddress } from '../types';
export interface SenderKeyRow extends Record<string, unknown> {
    readonly group_id: unknown;
    readonly sender_user: unknown;
    readonly sender_server: unknown;
    readonly sender_device: unknown;
    readonly record: unknown;
}
export interface SenderKeyDistributionRow extends Record<string, unknown> {
    readonly group_id: unknown;
    readonly sender_user: unknown;
    readonly sender_server: unknown;
    readonly sender_device: unknown;
    readonly key_id: unknown;
    readonly timestamp_ms: unknown;
}
/** Serializes a {@link SenderKeyRecord} into the Signal `SenderKeyRecordStructure` protobuf. */
export declare function encodeSenderKeyRecord(record: SenderKeyRecord): Uint8Array;
/**
 * Decodes a stored sender-key blob into a {@link SenderKeyRecord}.
 * `groupId`/`sender` are re-attached from the row key (not in the protobuf).
 */
export declare function decodeSenderKeyRecord(raw: unknown, groupId: string, sender: SignalAddress): SenderKeyRecord;
/** Decodes a sender-key-distribution SQL row into a {@link SenderKeyDistributionRecord}. */
export declare function decodeSenderKeyDistributionRow(row: SenderKeyDistributionRow): SenderKeyDistributionRecord;
