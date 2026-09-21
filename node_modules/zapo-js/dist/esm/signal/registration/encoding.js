import { asBytes, asNumber, toBoolOrUndef } from '../../util/coercion.js';
/** Decodes a stored signal-registration SQL row into a {@link RegistrationInfo}. */
export function decodeSignalRegistrationRow(row) {
    return {
        registrationId: asNumber(row.registration_id, 'signal_registration.registration_id'),
        identityKeyPair: {
            pubKey: asBytes(row.identity_pub_key, 'signal_registration.identity_pub_key'),
            privKey: asBytes(row.identity_priv_key, 'signal_registration.identity_priv_key')
        }
    };
}
/** Decodes a one-time prekey SQL row into a {@link PreKeyRecord}. */
export function decodeSignalPreKeyRow(row) {
    return {
        keyId: asNumber(row.key_id, 'signal_prekey.key_id'),
        keyPair: {
            pubKey: asBytes(row.pub_key, 'signal_prekey.pub_key'),
            privKey: asBytes(row.priv_key, 'signal_prekey.priv_key')
        },
        uploaded: toBoolOrUndef(row.uploaded)
    };
}
/** Decodes a signed-prekey SQL row into a {@link SignedPreKeyRecord}. */
export function decodeSignalSignedPreKeyRow(row) {
    return {
        keyId: asNumber(row.key_id, 'signal_signed_prekey.key_id'),
        keyPair: {
            pubKey: asBytes(row.pub_key, 'signal_signed_prekey.pub_key'),
            privKey: asBytes(row.priv_key, 'signal_signed_prekey.priv_key')
        },
        signature: asBytes(row.signature, 'signal_signed_prekey.signature'),
        uploaded: toBoolOrUndef(row.uploaded)
    };
}
