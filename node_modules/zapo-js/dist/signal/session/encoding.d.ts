import { type Proto } from '../../proto';
import type { SignalMessageKey, SignalRecvChain, SignalSessionRecord, SignalSessionSnapshot } from '../types';
export interface SignalSessionRow extends Record<string, unknown> {
    readonly user: unknown;
    readonly server: unknown;
    readonly device: unknown;
    readonly record: unknown;
}
export interface SignalIdentityRow extends Record<string, unknown> {
    readonly identity_key: unknown;
}
export declare function encodeSignalSessionSnapshot(session: SignalSessionSnapshot): Proto.ISessionStructure;
export declare function encodeSignalRecvChain(chain: SignalRecvChain): Proto.SessionStructure.IChain;
export declare function decodeSignalMessageKey(messageKey: Proto.SessionStructure.Chain.IMessageKey, field: string): SignalMessageKey;
export declare function decodeSignalRecvChain(chain: Proto.SessionStructure.IChain, field: string): SignalRecvChain;
export declare function decodeSignalSessionSnapshot(session: Proto.ISessionStructure, field: string): SignalSessionSnapshot;
/**
 * Serializes a {@link SignalSessionRecord} (current + previous sessions) into
 * the Signal `RecordStructure` protobuf encoding used by the session stores.
 *
 * The `previousSessions` segment only depends on the `prevSessions` array,
 * which every mutation path replaces wholesale (never edits in place), so its
 * encoded bytes are cached per array instance and only the current session is
 * re-encoded on the per-message write path.
 */
export declare function encodeSignalSessionRecord(record: SignalSessionRecord): Uint8Array;
/**
 * Decodes a Signal `RecordStructure` payload (as stored on disk) back into a
 * {@link SignalSessionRecord}. Throws when the current session is missing.
 */
export declare function decodeSignalSessionRecord(raw: unknown): SignalSessionRecord;
/** Reads a stored remote identity blob into a Uint8Array (validates byte-shape). */
export declare function decodeSignalRemoteIdentity(raw: unknown): Uint8Array;
