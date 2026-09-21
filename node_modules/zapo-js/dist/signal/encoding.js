"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSignalAddressParts = toSignalAddressParts;
exports.decodeStoreCount = decodeStoreCount;
const constants_1 = require("../protocol/constants");
const coercion_1 = require("../util/coercion");
/** Flattens a {@link SignalAddress} into plain fields, defaulting `server` to the host domain. */
function toSignalAddressParts(address) {
    return {
        user: address.user,
        server: address.server ?? constants_1.WA_DEFAULTS.HOST_DOMAIN,
        device: address.device
    };
}
/**
 * Reads the `count` field of a single-row SQL `COUNT(*)` result, returning
 * `0` when the row is missing.
 */
function decodeStoreCount(row, field) {
    return row ? (0, coercion_1.asNumber)(row.count, field) : 0;
}
