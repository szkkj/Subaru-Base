"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERGED_TOKEN_MAP = exports.MERGED_TOKEN_DICTIONARY_FLAG = exports.DICTIONARY_TOKEN_MAPS = exports.SINGLE_BYTE_TOKEN_MAP = exports.HEX_ALPHABET = exports.NIBBLE_ALPHABET = exports.JID_U_DOMAIN_TYPE_LID_MASK = exports.JID_U_DOMAIN_TYPE_HOSTED_MASK = exports.JID_U_DOMAIN_TYPE_HOSTED_LID = exports.JID_U_DOMAIN_TYPE_HOSTED = exports.JID_U_DOMAIN_TYPE_LID = exports.JID_U_DOMAIN_TYPE_PN = exports.NIBBLE_8 = exports.BINARY_32 = exports.BINARY_20 = exports.BINARY_8 = exports.HEX_8 = exports.JID_PAIR = exports.LIST_16 = exports.LIST_8 = exports.JID_U = exports.JID_FB = exports.JID_INTEROP = exports.DICTIONARY_3 = exports.DICTIONARY_0 = exports.STREAM_END = exports.LIST_EMPTY = void 0;
const tokens_1 = require("../binary/tokens");
exports.LIST_EMPTY = 0;
exports.STREAM_END = 2;
exports.DICTIONARY_0 = 236;
exports.DICTIONARY_3 = 239;
exports.JID_INTEROP = 245;
exports.JID_FB = 246;
exports.JID_U = 247;
exports.LIST_8 = 248;
exports.LIST_16 = 249;
exports.JID_PAIR = 250;
exports.HEX_8 = 251;
exports.BINARY_8 = 252;
exports.BINARY_20 = 253;
exports.BINARY_32 = 254;
exports.NIBBLE_8 = 255;
exports.JID_U_DOMAIN_TYPE_PN = 0x00;
exports.JID_U_DOMAIN_TYPE_LID = 0x01;
exports.JID_U_DOMAIN_TYPE_HOSTED = 0x80;
exports.JID_U_DOMAIN_TYPE_HOSTED_LID = 0x81;
exports.JID_U_DOMAIN_TYPE_HOSTED_MASK = 0x80;
exports.JID_U_DOMAIN_TYPE_LID_MASK = 0x01;
exports.NIBBLE_ALPHABET = Object.freeze([
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '-',
    '.',
    '\uFFFD',
    '\uFFFD',
    '\uFFFD',
    '\uFFFD'
]);
exports.HEX_ALPHABET = Object.freeze([
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F'
]);
exports.SINGLE_BYTE_TOKEN_MAP = (() => {
    const map = new Map();
    for (let i = 0; i < tokens_1.SINGLE_BYTE_TOKENS.length; i += 1) {
        map.set(tokens_1.SINGLE_BYTE_TOKENS[i], i + 1);
    }
    return map;
})();
exports.DICTIONARY_TOKEN_MAPS = tokens_1.DICTIONARIES.map((dictionary) => {
    const map = new Map();
    for (let i = 0; i < dictionary.length; i += 1) {
        map.set(dictionary[i], i);
    }
    return map;
});
exports.MERGED_TOKEN_DICTIONARY_FLAG = 65536;
/**
 * Single lookup table for the encoder: single-byte tokens map to their code
 * (< 256), dictionary tokens to `MERGED_TOKEN_DICTIONARY_FLAG | (dict << 8) |
 * token`. Built dictionary-last-to-first then single-byte so precedence
 * matches the sequential lookup order (single byte, then dictionary 0..3).
 */
exports.MERGED_TOKEN_MAP = (() => {
    const map = new Map();
    for (let i = exports.DICTIONARY_TOKEN_MAPS.length - 1; i >= 0; i -= 1) {
        for (const [value, token] of exports.DICTIONARY_TOKEN_MAPS[i]) {
            map.set(value, exports.MERGED_TOKEN_DICTIONARY_FLAG | (i << 8) | token);
        }
    }
    for (const [value, token] of exports.SINGLE_BYTE_TOKEN_MAP) {
        map.set(value, token);
    }
    return map;
})();
