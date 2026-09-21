import type { Readable } from 'node:stream';
export declare const PROTO_STREAM_EVENT_KINDS: Readonly<{
    readonly FIELD: "field";
    readonly ENTER: "enter";
    readonly LEAVE: "leave";
}>;
export type ProtoStreamEventKind = (typeof PROTO_STREAM_EVENT_KINDS)[keyof typeof PROTO_STREAM_EVENT_KINDS];
export interface ProtoStreamFieldEvent {
    readonly kind: typeof PROTO_STREAM_EVENT_KINDS.FIELD;
    readonly fieldNumber: number;
    readonly wireType: number;
    readonly depth: number;
    /** `LEN` payload, empty otherwise. Aliases the reader buffer: copy to retain. */
    readonly value: Uint8Array;
    /** The field as it was on the wire, tag included, for re-emitting a subset. */
    readonly raw: Uint8Array;
    readonly varintValue: number;
}
export interface ProtoStreamEnterEvent {
    readonly kind: typeof PROTO_STREAM_EVENT_KINDS.ENTER;
    readonly fieldNumber: number;
    readonly depth: number;
    readonly byteLength: number;
}
export interface ProtoStreamLeaveEvent {
    readonly kind: typeof PROTO_STREAM_EVENT_KINDS.LEAVE;
    readonly fieldNumber: number;
    readonly depth: number;
}
export type ProtoStreamEvent = ProtoStreamFieldEvent | ProtoStreamEnterEvent | ProtoStreamLeaveEvent;
/** Return nothing to keep the walk synchronous; return a promise only to make it wait. */
export type ProtoStreamHandler = (event: ProtoStreamEvent) => void | Promise<void>;
export interface ProtoStreamOptions {
    /** Recurse into a `LEN` field instead of materializing it; subfields arrive at `depth + 1`. */
    readonly shouldDescend?: (fieldNumber: number, depth: number, byteLength: number) => boolean;
    /** Cap on one materialized payload. Descended fields are exempt. Defaults to 32 MiB. */
    readonly maxFieldBytes?: number;
}
/**
 * Streaming counterpart of `scanProtoFields`: walks a protobuf message as it
 * arrives, calling `onEvent` per field in wire order. Fields chosen by
 * `shouldDescend` are recursed into instead of buffered, so peak memory tracks
 * the largest materialized leaf rather than the message. Unknown fields are
 * skipped by wire type.
 *
 * @throws on a truncated stream, an invalid length, or a payload over `maxFieldBytes`.
 */
export declare function streamProtoFields(source: Readable, onEvent: ProtoStreamHandler, options?: ProtoStreamOptions): Promise<void>;
