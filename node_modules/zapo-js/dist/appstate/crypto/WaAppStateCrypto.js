"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaAppStateCrypto = void 0;
const constants_1 = require("../constants");
const hkdf_1 = require("../../crypto/core/hkdf");
const primitives_1 = require("../../crypto/core/primitives");
const random_1 = require("../../crypto/core/random");
const _proto_1 = require("../../proto");
const constants_2 = require("../../protocol/constants");
const bytes_1 = require("../../util/bytes");
const collections_1 = require("../../util/collections");
const primitives_2 = require("../../util/primitives");
const DEFAULT_DERIVED_KEYS_CACHE_MAX_SIZE = 256;
/**
 * Implements the app-state mutation cryptography: HKDF key derivation (with
 * a bounded LRU cache), per-mutation encrypt/decrypt, snapshot/patch MAC
 * generation, and the LT-hash arithmetic used to track collection state.
 */
class WaAppStateCrypto {
    constructor(derivedKeysCacheMaxSize = DEFAULT_DERIVED_KEYS_CACHE_MAX_SIZE, skipMacVerification = false) {
        this.derivedKeysCache = new Map();
        this.derivedKeysCacheMaxSize = (0, primitives_2.normalizeNonNegativeInteger)(derivedKeysCacheMaxSize, DEFAULT_DERIVED_KEYS_CACHE_MAX_SIZE);
        this.skipMacVerification = skipMacVerification;
    }
    get isMacVerificationSkipped() {
        return this.skipMacVerification;
    }
    /** Empties the derived-keys LRU cache (e.g. after a session reset). */
    clearCache() {
        this.derivedKeysCache.clear();
    }
    /**
     * Derives the index/value/snapshot/patch keys from an app-state sync key.
     * Cached by base64 of `keyData` (LRU-bounded).
     */
    deriveKeys(keyData) {
        const cacheKey = (0, bytes_1.bytesToBase64)(keyData);
        const cached = this.derivedKeysCache.get(cacheKey);
        if (cached) {
            this.touchDerivedKeysCacheEntry(cacheKey, cached);
            return cached;
        }
        const derived = (0, hkdf_1.hkdf)(keyData, null, constants_2.WA_APP_STATE_KDF_INFO.MUTATION_KEYS, constants_1.APP_STATE_DERIVED_KEY_LENGTH);
        const keys = {
            indexHmacKey: derived.subarray(0, constants_1.APP_STATE_DERIVED_INDEX_KEY_END),
            valueEncryptionAesKey: derived.subarray(constants_1.APP_STATE_DERIVED_INDEX_KEY_END, constants_1.APP_STATE_DERIVED_VALUE_ENCRYPTION_KEY_END),
            valueMacHmacKey: derived.subarray(constants_1.APP_STATE_DERIVED_VALUE_ENCRYPTION_KEY_END, constants_1.APP_STATE_DERIVED_VALUE_MAC_KEY_END),
            snapshotMacHmacKey: derived.subarray(constants_1.APP_STATE_DERIVED_VALUE_MAC_KEY_END, constants_1.APP_STATE_DERIVED_SNAPSHOT_MAC_KEY_END),
            patchMacHmacKey: derived.subarray(constants_1.APP_STATE_DERIVED_SNAPSHOT_MAC_KEY_END, constants_1.APP_STATE_DERIVED_PATCH_MAC_KEY_END)
        };
        this.touchDerivedKeysCacheEntry(cacheKey, keys);
        return keys;
    }
    /** Computes the HMAC-SHA-256 index MAC over `indexBytes`. */
    generateIndexMac(indexHmacKey, indexBytes) {
        return (0, primitives_1.hmacSha256Sign)(indexHmacKey, indexBytes);
    }
    /** Encrypts a single mutation value with AES-CBC + HMAC value-MAC. */
    async encryptMutation(args) {
        const derivedKeys = this.deriveKeys(args.keyData);
        const indexBytes = bytes_1.TEXT_ENCODER.encode(args.index);
        const encoded = _proto_1.proto.SyncActionData.encode({
            index: indexBytes,
            value: args.value ?? undefined,
            padding: bytes_1.EMPTY_BYTES,
            version: args.version
        }).finish();
        const iv = args.iv ?? (await (0, random_1.randomBytesAsync)(constants_1.APP_STATE_IV_LENGTH));
        if (iv.byteLength !== constants_1.APP_STATE_IV_LENGTH) {
            throw new Error(`invalid IV length ${iv.byteLength}`);
        }
        const indexMac = this.generateIndexMac(derivedKeys.indexHmacKey, indexBytes);
        const cipherText = (0, primitives_1.aesCbcEncrypt)(derivedKeys.valueEncryptionAesKey, iv, encoded);
        const associatedData = this.generateAssociatedData(args.operation, args.keyId);
        const valueMac = this.generateValueMac(derivedKeys.valueMacHmacKey, associatedData, iv, cipherText);
        return {
            indexMac,
            valueBlob: (0, bytes_1.concatBytes)([iv, cipherText, valueMac]),
            valueMac
        };
    }
    /** Verifies and decrypts a single app-state mutation. */
    // eslint-disable-next-line @typescript-eslint/require-await
    async decryptMutation(args) {
        if (args.valueBlob.byteLength < constants_1.APP_STATE_IV_LENGTH + constants_1.APP_STATE_VALUE_MAC_LENGTH) {
            throw new Error('invalid mutation value blob');
        }
        const derivedKeys = this.deriveKeys(args.keyData);
        const iv = args.valueBlob.subarray(0, constants_1.APP_STATE_IV_LENGTH);
        const mac = args.valueBlob.subarray(args.valueBlob.byteLength - constants_1.APP_STATE_VALUE_MAC_LENGTH);
        const cipherText = args.valueBlob.subarray(constants_1.APP_STATE_IV_LENGTH, args.valueBlob.byteLength - constants_1.APP_STATE_VALUE_MAC_LENGTH);
        if (!this.skipMacVerification) {
            const associatedData = this.generateAssociatedData(args.operation, args.keyId);
            const expectedMac = this.generateValueMac(derivedKeys.valueMacHmacKey, associatedData, iv, cipherText);
            if (!(0, bytes_1.uint8TimingSafeEqual)(mac, expectedMac)) {
                throw new Error('mutation value MAC mismatch');
            }
        }
        const plaintext = (0, primitives_1.aesCbcDecrypt)(derivedKeys.valueEncryptionAesKey, iv, cipherText);
        const syncActionData = _proto_1.proto.SyncActionData.decode(plaintext);
        if (!syncActionData.index) {
            throw new Error('missing sync action index');
        }
        if (syncActionData.version === null || syncActionData.version === undefined) {
            throw new Error('missing sync action version');
        }
        if (!this.skipMacVerification) {
            const generatedIndexMac = this.generateIndexMac(derivedKeys.indexHmacKey, syncActionData.index);
            if (!(0, bytes_1.uint8TimingSafeEqual)(generatedIndexMac, args.indexMac)) {
                throw new Error('mutation index MAC mismatch');
            }
        }
        return {
            index: bytes_1.TEXT_DECODER.decode(syncActionData.index),
            value: syncActionData.value ?? null,
            version: syncActionData.version,
            indexMac: args.indexMac,
            valueMac: mac
        };
    }
    /** Generates the HMAC-SHA-512 snapshot MAC over the LT-hash + version + collection name. */
    // eslint-disable-next-line @typescript-eslint/require-await
    async generateSnapshotMac(keyData, ltHash, version, collectionName) {
        const derivedKeys = this.deriveKeys(keyData);
        return (0, primitives_1.hmacSha256Sign)(derivedKeys.snapshotMacHmacKey, [
            ltHash,
            (0, bytes_1.intToBytes)(8, version),
            bytes_1.TEXT_ENCODER.encode(collectionName)
        ]);
    }
    /** Generates the HMAC-SHA-512 patch MAC binding mutations to a collection version. */
    // eslint-disable-next-line @typescript-eslint/require-await
    async generatePatchMac(keyData, snapshotMac, valueMacs, version, collectionName) {
        const derivedKeys = this.deriveKeys(keyData);
        return (0, primitives_1.hmacSha256Sign)(derivedKeys.patchMacHmacKey, [
            snapshotMac,
            ...valueMacs,
            (0, bytes_1.intToBytes)(8, version),
            bytes_1.TEXT_ENCODER.encode(collectionName)
        ]);
    }
    /** Adds value MACs into the running LT-hash digest for a collection. */
    // eslint-disable-next-line @typescript-eslint/require-await
    async ltHashAdd(base, addValues) {
        return this.ltHashApply(base, addValues, (left, right) => left + right);
    }
    /** Removes value MACs from the running LT-hash digest (for `remove` operations). */
    // eslint-disable-next-line @typescript-eslint/require-await
    async ltHashSubtract(base, removeValues) {
        return this.ltHashApply(base, removeValues, (left, right) => left - right);
    }
    /** Combined subtract+add LT-hash update used when a key's value MAC changes in place. */
    async ltHashSubtractThenAdd(base, addValues, removeValues) {
        const subtractResult = await this.ltHashSubtract(base, removeValues);
        const hash = await this.ltHashAdd(subtractResult, addValues);
        return { hash, subtractResult };
    }
    ltHashApply(base, values, combine) {
        if (values.length === 0) {
            return base;
        }
        const expandedValues = values.map((value) => (0, hkdf_1.hkdf)(value, null, constants_2.WA_APP_STATE_KDF_INFO.PATCH_INTEGRITY, constants_1.APP_STATE_EMPTY_LT_HASH.byteLength));
        const out = new Uint8Array(base.byteLength);
        this.pointwiseWithOverflow(base, expandedValues[0], combine, out);
        for (let index = 1; index < expandedValues.length; index += 1) {
            this.pointwiseWithOverflow(out, expandedValues[index], combine, out);
        }
        return out;
    }
    pointwiseWithOverflow(left, right, combine, out = new Uint8Array(left.byteLength)) {
        if (left.byteLength !== right.byteLength) {
            throw new Error('lt hash input length mismatch');
        }
        if (left.byteLength % constants_1.APP_STATE_POINT_SIZE !== 0) {
            throw new Error('lt hash input alignment mismatch');
        }
        if (out.byteLength !== left.byteLength) {
            throw new Error('lt hash output length mismatch');
        }
        for (let offset = 0; offset < left.byteLength; offset += constants_1.APP_STATE_POINT_SIZE) {
            const value = combine(left[offset] | (left[offset + 1] << 8), right[offset] | (right[offset + 1] << 8));
            out[offset] = value & 0xff;
            out[offset + 1] = (value >>> 8) & 0xff;
        }
        return out;
    }
    generateAssociatedData(operation, keyId) {
        if (operation !== _proto_1.proto.SyncdMutation.SyncdOperation.SET &&
            operation !== _proto_1.proto.SyncdMutation.SyncdOperation.REMOVE) {
            throw new Error(`unsupported syncd operation ${operation}`);
        }
        const out = new Uint8Array(1 + keyId.byteLength);
        out[0] = operation + 1;
        out.set(keyId, 1);
        return out;
    }
    generateValueMac(valueMacHmacKey, associatedData, iv, cipherText) {
        const octetLength = new Uint8Array(constants_1.APP_STATE_MAC_OCTET_LENGTH);
        octetLength[octetLength.length - 1] = associatedData.byteLength & 0xff;
        const full = (0, primitives_1.hmacSha512Sign)(valueMacHmacKey, [associatedData, iv, cipherText, octetLength]);
        return full.subarray(0, constants_1.APP_STATE_VALUE_MAC_LENGTH);
    }
    touchDerivedKeysCacheEntry(cacheKey, keys) {
        if (this.derivedKeysCacheMaxSize <= 0) {
            return;
        }
        (0, collections_1.setBoundedMapEntry)(this.derivedKeysCache, cacheKey, keys, this.derivedKeysCacheMaxSize);
    }
}
exports.WaAppStateCrypto = WaAppStateCrypto;
