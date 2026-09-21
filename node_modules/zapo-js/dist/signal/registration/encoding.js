"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeSignalRegistrationRow = decodeSignalRegistrationRow;
exports.decodeSignalPreKeyRow = decodeSignalPreKeyRow;
exports.decodeSignalSignedPreKeyRow = decodeSignalSignedPreKeyRow;
const coercion_1 = require("../../util/coercion");
/** Decodes a stored signal-registration SQL row into a {@link RegistrationInfo}. */
function decodeSignalRegistrationRow(row) {
    return {
        registrationId: (0, coercion_1.asNumber)(row.registration_id, 'signal_registration.registration_id'),
        identityKeyPair: {
            pubKey: (0, coercion_1.asBytes)(row.identity_pub_key, 'signal_registration.identity_pub_key'),
            privKey: (0, coercion_1.asBytes)(row.identity_priv_key, 'signal_registration.identity_priv_key')
        }
    };
}
/** Decodes a one-time prekey SQL row into a {@link PreKeyRecord}. */
function decodeSignalPreKeyRow(row) {
    return {
        keyId: (0, coercion_1.asNumber)(row.key_id, 'signal_prekey.key_id'),
        keyPair: {
            pubKey: (0, coercion_1.asBytes)(row.pub_key, 'signal_prekey.pub_key'),
            privKey: (0, coercion_1.asBytes)(row.priv_key, 'signal_prekey.priv_key')
        },
        uploaded: (0, coercion_1.toBoolOrUndef)(row.uploaded)
    };
}
/** Decodes a signed-prekey SQL row into a {@link SignedPreKeyRecord}. */
function decodeSignalSignedPreKeyRow(row) {
    return {
        keyId: (0, coercion_1.asNumber)(row.key_id, 'signal_signed_prekey.key_id'),
        keyPair: {
            pubKey: (0, coercion_1.asBytes)(row.pub_key, 'signal_signed_prekey.pub_key'),
            privKey: (0, coercion_1.asBytes)(row.priv_key, 'signal_signed_prekey.priv_key')
        },
        signature: (0, coercion_1.asBytes)(row.signature, 'signal_signed_prekey.signature'),
        uploaded: (0, coercion_1.toBoolOrUndef)(row.uploaded)
    };
}
