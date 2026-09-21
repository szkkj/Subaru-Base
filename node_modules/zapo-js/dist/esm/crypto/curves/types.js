export function pkcs8FromRawPrivate(prefix, raw) {
    const out = new Uint8Array(prefix.length + raw.length);
    out.set(prefix, 0);
    out.set(raw, prefix.length);
    return out;
}
