"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_HISTORY_FIELDS = void 0;
exports.encodeGroupHistoryBundle = encodeGroupHistoryBundle;
exports.decodeGroupHistoryBundle = decodeGroupHistoryBundle;
exports.streamGroupHistoryBundle = streamGroupHistoryBundle;
const node_util_1 = require("node:util");
const node_zlib_1 = require("node:zlib");
const _proto_1 = require("../../proto");
const bytes_1 = require("../../util/bytes");
const proto_stream_1 = require("../../util/proto-stream");
const protoscan_1 = require("../../util/protoscan");
const deflateAsync = (0, node_util_1.promisify)(node_zlib_1.deflate);
const unzipAsync = (0, node_util_1.promisify)(node_zlib_1.unzip);
exports.GROUP_HISTORY_FIELDS = Object.freeze({
    MESSAGES: 1,
    OUT_OF_WINDOW_PINNED_MESSAGES: 4
});
/**
 * Serializes the messages shared with a member who just joined a group into a
 * `GroupHistory` payload, compressed the way the receiver expects.
 *
 * `outOfWindowPinnedMessages` carries pinned messages older than the shared
 * window, which the receiver injects regardless of the age cutoff.
 *
 * Both arrays are handed to the encoder as-is. The generated type asks for
 * mutable arrays, but encoding only reads them, so the assertion avoids
 * copying every message of the bundle for nothing.
 */
async function encodeGroupHistoryBundle(messages, outOfWindowPinnedMessages) {
    const encoded = _proto_1.proto.GroupHistory.encode({
        messages: messages,
        outOfWindowPinnedMessages: outOfWindowPinnedMessages?.length
            ? outOfWindowPinnedMessages
            : undefined
    }).finish();
    const compressed = (0, bytes_1.toBytesView)(await deflateAsync(encoded));
    return { compressed, encoded };
}
/**
 * Inflates and decodes a downloaded group-history bundle blob.
 *
 * @throws when the blob is not valid zlib or does not decode as `GroupHistory`.
 */
async function decodeGroupHistoryBundle(blob) {
    const inflated = (0, bytes_1.toBytesView)(await unzipAsync(blob));
    return _proto_1.proto.GroupHistory.decode(inflated);
}
/**
 * Streaming counterpart of {@link decodeGroupHistoryBundle}: walks an inflated
 * bundle and hands out one message at a time, so peak memory tracks the largest
 * single message instead of the whole bundle. `GroupHistory` carries its messages
 * as top-level repeated fields, so no record needs descending into.
 *
 * Comment messages and associated-message lists are skipped, matching what the
 * buffered consumer reads.
 *
 * @throws when the stream is truncated or a record exceeds `maxRecordBytes`.
 */
async function streamGroupHistoryBundle(inflated, onMessage, maxRecordBytes) {
    await (0, proto_stream_1.streamProtoFields)(inflated, (event) => {
        if (event.kind !== proto_stream_1.PROTO_STREAM_EVENT_KINDS.FIELD ||
            event.wireType !== protoscan_1.PROTO_WIRE_TYPES.LEN) {
            return undefined;
        }
        if (event.fieldNumber === exports.GROUP_HISTORY_FIELDS.MESSAGES) {
            return onMessage(_proto_1.proto.WebMessageInfo.decode(event.value.slice()), false);
        }
        if (event.fieldNumber === exports.GROUP_HISTORY_FIELDS.OUT_OF_WINDOW_PINNED_MESSAGES) {
            return onMessage(_proto_1.proto.WebMessageInfo.decode(event.value.slice()), true);
        }
        return undefined;
    }, maxRecordBytes !== undefined ? { maxFieldBytes: maxRecordBytes } : {});
}
