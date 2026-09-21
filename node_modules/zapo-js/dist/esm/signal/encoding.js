import { WA_DEFAULTS } from '../protocol/constants.js';
import { asNumber } from '../util/coercion.js';
/** Flattens a {@link SignalAddress} into plain fields, defaulting `server` to the host domain. */
export function toSignalAddressParts(address) {
    return {
        user: address.user,
        server: address.server ?? WA_DEFAULTS.HOST_DOMAIN,
        device: address.device
    };
}
/**
 * Reads the `count` field of a single-row SQL `COUNT(*)` result, returning
 * `0` when the row is missing.
 */
export function decodeStoreCount(row, field) {
    return row ? asNumber(row.count, field) : 0;
}
