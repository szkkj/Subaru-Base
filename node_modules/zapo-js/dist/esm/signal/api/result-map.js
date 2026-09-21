function mergePreferredParsedResult(target, key, next, isPreferred) {
    const current = target.get(key);
    if (!current || !isPreferred(current)) {
        target.set(key, next);
    }
}
export function registerParsedResultByRawAndCanonicalKey(parsedByRawKey, parsedByCanonicalKey, rawKey, canonicalKey, result, isPreferred) {
    mergePreferredParsedResult(parsedByRawKey, rawKey, result, isPreferred);
    mergePreferredParsedResult(parsedByCanonicalKey, canonicalKey, result, isPreferred);
}
