"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerParsedResultByRawAndCanonicalKey = registerParsedResultByRawAndCanonicalKey;
function mergePreferredParsedResult(target, key, next, isPreferred) {
    const current = target.get(key);
    if (!current || !isPreferred(current)) {
        target.set(key, next);
    }
}
function registerParsedResultByRawAndCanonicalKey(parsedByRawKey, parsedByCanonicalKey, rawKey, canonicalKey, result, isPreferred) {
    mergePreferredParsedResult(parsedByRawKey, rawKey, result, isPreferred);
    mergePreferredParsedResult(parsedByCanonicalKey, canonicalKey, result, isPreferred);
}
