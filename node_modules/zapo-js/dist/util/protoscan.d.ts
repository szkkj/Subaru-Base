export declare const PROTO_WIRE_TYPES: Readonly<{
    readonly VARINT: 0;
    readonly FIXED64: 1;
    readonly LEN: 2;
    readonly START_GROUP: 3;
    readonly END_GROUP: 4;
    readonly FIXED32: 5;
}>;
export interface ProtoScanField {
    readonly fieldNumber: number;
    readonly wireType: number;
    /** Offset of the field's tag byte, so callers can slice the whole field. */
    readonly headerStart: number;
    /** Decoded value for VARINT fields; `0` for every other wire type. */
    readonly varintValue: number;
    /** Payload bounds for LEN fields; `valueEnd` is the field end for all types. */
    readonly valueStart: number;
    readonly valueEnd: number;
}
interface VarintReadResult {
    readonly value: number;
    readonly next: number;
}
export declare function readProtoVarint(bytes: Uint8Array, start: number, end: number): VarintReadResult;
/**
 * Walks the top-level fields of a protobuf-encoded region without decoding
 * any payload, calling `onField` once per field in wire order. LEN fields
 * report their payload bounds so callers can decode individual records
 * lazily; unknown fields (including deprecated groups) are skipped by wire
 * type, matching generated decoder behavior.
 */
export declare function scanProtoFields(bytes: Uint8Array, start: number, end: number, onField: (field: ProtoScanField) => void): void;
export {};
