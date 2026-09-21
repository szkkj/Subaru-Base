export function bytesToBigIntLE(bytes) {
    let out = 0n;
    for (let i = bytes.length - 1; i >= 0; i -= 1) {
        out = (out << 8n) + BigInt(bytes[i]);
    }
    return out;
}
export function bigIntToBytesLE(value, length) {
    const out = new Uint8Array(length);
    let current = value;
    for (let i = 0; i < length; i += 1) {
        out[i] = Number(current & 0xffn);
        current >>= 8n;
    }
    return out;
}
