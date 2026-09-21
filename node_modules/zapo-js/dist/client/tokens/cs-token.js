"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsTokenGenerator = void 0;
const core_1 = require("../../crypto/core");
const bytes_1 = require("../../util/bytes");
const collections_1 = require("../../util/collections");
const CS_TOKEN_CACHE_MAX = 5;
class CsTokenGenerator {
    constructor() {
        this.cachedSalt = null;
        this.cache = new Map();
    }
    generate(nctSalt, accountLid) {
        if (this.isSameSalt(nctSalt)) {
            const cached = this.cache.get(accountLid);
            if (cached) {
                return cached;
            }
        }
        const result = (0, core_1.hmacSha256Sign)(nctSalt, bytes_1.TEXT_ENCODER.encode(accountLid));
        if (!this.isSameSalt(nctSalt)) {
            this.cachedSalt = nctSalt;
            this.cache.clear();
        }
        (0, collections_1.setBoundedMapEntry)(this.cache, accountLid, result, CS_TOKEN_CACHE_MAX);
        return result;
    }
    invalidate() {
        this.cachedSalt = null;
        this.cache.clear();
    }
    isSameSalt(salt) {
        if (!this.cachedSalt || this.cachedSalt.length !== salt.length) {
            return false;
        }
        for (let i = 0; i < salt.length; i += 1) {
            if (this.cachedSalt[i] !== salt[i]) {
                return false;
            }
        }
        return true;
    }
}
exports.CsTokenGenerator = CsTokenGenerator;
