import type { SignalAddress } from './types';
export interface SignalAddressParts {
    readonly user: string;
    readonly server: string;
    readonly device: number;
}
export interface StoreCountRow extends Record<string, unknown> {
    readonly count: unknown;
}
/** Flattens a {@link SignalAddress} into plain fields, defaulting `server` to the host domain. */
export declare function toSignalAddressParts(address: SignalAddress): SignalAddressParts;
/**
 * Reads the `count` field of a single-row SQL `COUNT(*)` result, returning
 * `0` when the row is missing.
 */
export declare function decodeStoreCount(row: StoreCountRow | null, field: string): number;
