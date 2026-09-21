"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pkcs8FromRawPrivate = pkcs8FromRawPrivate;
function pkcs8FromRawPrivate(prefix, raw) {
    const out = new Uint8Array(prefix.length + raw.length);
    out.set(prefix, 0);
    out.set(raw, prefix.length);
    return out;
}
