import type { AppStateCollectionName, WaAppStateSyncKey } from './types';
import type { WaMediaTransferClient } from '../media/transfer/WaMediaTransferClient';
import type { Proto } from '../proto';
/**
 * Returns `value` typed as a known {@link AppStateCollectionName}, or `null`
 * when the string is unrecognized.
 */
export declare function parseCollectionName(value: string | undefined): AppStateCollectionName | null;
/**
 * Reads the 32-bit big-endian epoch encoded in bytes 2..5 of an app-state key id.
 * Returns `-1` when the key id is too short.
 */
export declare function keyEpoch(keyId: Uint8Array): number;
/**
 * Picks the highest-epoch app-state sync key from `keys`. Ties are broken by
 * the lower device id. Returns `null` when the iterable is empty.
 */
export declare function pickActiveSyncKey(keys: Iterable<WaAppStateSyncKey>): WaAppStateSyncKey | null;
/**
 * Downloads and decrypts an external app-state blob via the media transfer
 * client. Throws when the reference is missing required fields.
 */
export declare function downloadExternalBlobReference(mediaTransfer: WaMediaTransferClient, reference: Proto.IExternalBlobReference): Promise<Uint8Array>;
