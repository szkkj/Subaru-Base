import { type Proto } from '../../proto';
/** AES-GCM nonce size of both media-reupload payloads. */
export declare const MEDIA_RETRY_IV_SIZE = 12;
/** `<enc_p>` / `<enc_iv>` of a media-reupload payload (auth tag appended to the ciphertext). */
export interface WaMediaRetryEncryptedPayload {
    readonly ciphertext: Uint8Array;
    readonly iv: Uint8Array;
}
/** Input for {@link decryptMediaRetryNotification}. */
export interface WaMediaRetryDecryptInput {
    /** Media key of the original message. Sensitive key material - do not log. */
    readonly mediaKey: Uint8Array;
    readonly ciphertext: Uint8Array;
    readonly iv: Uint8Array;
    /** Stanza id of the original message; doubles as the AES-GCM associated data. */
    readonly stanzaId: string;
}
/**
 * Seals the `ServerErrorReceipt` a `server-error` receipt carries. The stanza id
 * is both the payload and the AES-GCM associated data, so the blob cannot be
 * replayed against another message. Leave `iv` unset outside tests.
 */
export declare function encryptServerErrorReceipt(mediaKey: Uint8Array, stanzaId: string, iv?: Uint8Array): Promise<WaMediaRetryEncryptedPayload>;
/**
 * Opens the `<encrypt>` payload of a `mediaretry` notification. Callers must
 * still check the decoded `stanzaId` against the notification's id - a valid
 * auth tag only proves the payload was sealed under this media key.
 */
export declare function decryptMediaRetryNotification(input: WaMediaRetryDecryptInput): Proto.IMediaRetryNotification;
