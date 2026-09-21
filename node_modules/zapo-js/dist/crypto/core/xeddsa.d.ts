/**
 * Verifies an XEdDSA signature over `message` against an X25519 (Montgomery)
 * public key, converting to the Edwards form internally. Returns `false`
 * on shape mismatch instead of throwing.
 */
export declare function xeddsaVerify(curvePublicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean>;
/**
 * Signs `message` with an X25519 (Montgomery) private key using the XEdDSA
 * construction. Returns a 64-byte signature.
 */
export declare function xeddsaSign(privateKey: Uint8Array, message: Uint8Array): Promise<Uint8Array>;
