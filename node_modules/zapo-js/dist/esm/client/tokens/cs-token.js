import { hmacSha256Sign } from '../../crypto/core/index.js';
import { TEXT_ENCODER } from '../../util/bytes.js';
import { setBoundedMapEntry } from '../../util/collections.js';
const CS_TOKEN_CACHE_MAX = 5;
export class CsTokenGenerator {
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
        const result = hmacSha256Sign(nctSalt, TEXT_ENCODER.encode(accountLid));
        if (!this.isSameSalt(nctSalt)) {
            this.cachedSalt = nctSalt;
            this.cache.clear();
        }
        setBoundedMapEntry(this.cache, accountLid, result, CS_TOKEN_CACHE_MAX);
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
