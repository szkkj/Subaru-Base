export declare const LIST_EMPTY = 0;
export declare const STREAM_END = 2;
export declare const DICTIONARY_0 = 236;
export declare const DICTIONARY_3 = 239;
export declare const JID_INTEROP = 245;
export declare const JID_FB = 246;
export declare const JID_U = 247;
export declare const LIST_8 = 248;
export declare const LIST_16 = 249;
export declare const JID_PAIR = 250;
export declare const HEX_8 = 251;
export declare const BINARY_8 = 252;
export declare const BINARY_20 = 253;
export declare const BINARY_32 = 254;
export declare const NIBBLE_8 = 255;
export declare const JID_U_DOMAIN_TYPE_PN = 0;
export declare const JID_U_DOMAIN_TYPE_LID = 1;
export declare const JID_U_DOMAIN_TYPE_HOSTED = 128;
export declare const JID_U_DOMAIN_TYPE_HOSTED_LID = 129;
export declare const JID_U_DOMAIN_TYPE_HOSTED_MASK = 128;
export declare const JID_U_DOMAIN_TYPE_LID_MASK = 1;
export declare const NIBBLE_ALPHABET: readonly ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-", ".", "�", "�", "�", "�"];
export declare const HEX_ALPHABET: readonly ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
export declare const SINGLE_BYTE_TOKEN_MAP: ReadonlyMap<string, number>;
export declare const DICTIONARY_TOKEN_MAPS: readonly ReadonlyMap<string, number>[];
export declare const MERGED_TOKEN_DICTIONARY_FLAG = 65536;
/**
 * Single lookup table for the encoder: single-byte tokens map to their code
 * (< 256), dictionary tokens to `MERGED_TOKEN_DICTIONARY_FLAG | (dict << 8) |
 * token`. Built dictionary-last-to-first then single-byte so precedence
 * matches the sequential lookup order (single byte, then dictionary 0..3).
 */
export declare const MERGED_TOKEN_MAP: ReadonlyMap<string, number>;
