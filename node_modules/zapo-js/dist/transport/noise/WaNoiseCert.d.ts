export interface WaNoiseRootCa {
    /** Raw 32-byte X25519 public key (without version prefix). */
    readonly publicKey: Uint8Array;
    /** Serial number that intermediate certs issued by this root must claim. */
    readonly serial: number;
}
/**
 * Validates a WhatsApp noise certificate chain against `rootCa` (defaults to
 * the production root) and confirms the leaf binds `serverStatic`. Throws on
 * any structural mismatch, bad signature, or unexpected issuer serial.
 */
export declare function verifyNoiseCertificateChain(certificateChain: Uint8Array, serverStatic: Uint8Array, rootCa?: WaNoiseRootCa): Promise<void>;
