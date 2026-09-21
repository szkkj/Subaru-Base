/**
 * Converts a 32-byte raw public key to 33-byte serialized format (with 0x05 prefix)
 */
export declare function toSerializedPubKey(key: Uint8Array): Uint8Array;
/**
 * Converts a 33-byte serialized public key to 32-byte raw format
 */
export declare function toRawPubKey(key: Uint8Array): Uint8Array;
/**
 * Prepends a version byte to content
 */
export declare function prependVersion(content: Uint8Array, version: number): Uint8Array;
/**
 * Reads versioned content, validating the version and extracting the body
 */
export declare function readVersionedContent(versionContent: Uint8Array, expectedVersion: number, suffixLength: number): Uint8Array;
