"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeHistorySync = encodeHistorySync;
exports.buildInlineHistorySyncNotification = buildInlineHistorySyncNotification;
exports.buildHistorySyncBootstrapMessage = buildHistorySyncBootstrapMessage;
const node_util_1 = require("node:util");
const node_zlib_1 = require("node:zlib");
const _proto_1 = require("../../proto");
const deflateAsync = (0, node_util_1.promisify)(node_zlib_1.deflate);
/**
 * Serializes a `HistorySync` and zlib-deflates it. The phone uses DEFLATE
 * level 1; any zlib-framed level inflates identically, so it is only a
 * size/speed tradeoff.
 */
async function encodeHistorySync(content) {
    const serialized = _proto_1.proto.HistorySync.encode(content).finish();
    const compressed = await deflateAsync(serialized, { level: 1 });
    return new Uint8Array(compressed);
}
/**
 * Wraps a deflated `HistorySync` inline in a `HISTORY_SYNC_NOTIFICATION` protocol
 * message. Only small syncs are inlined; larger ones ride an external
 * `md-msg-hist` MMS blob referenced by the same notification.
 */
function buildInlineHistorySyncNotification(syncType, deflatedPayload, options = {}) {
    return {
        type: _proto_1.proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION,
        historySyncNotification: {
            syncType,
            chunkOrder: options.chunkOrder ?? 0,
            progress: options.progress ?? 100,
            initialHistBootstrapInlinePayload: deflatedPayload
        }
    };
}
/**
 * Builds the `INITIAL_BOOTSTRAP` `HISTORY_SYNC_NOTIFICATION` a mobile-primary
 * pushes to a freshly-linked companion: a deflated `HistorySync` wrapped in a
 * protocol message for delivery as an encrypted peer message. Note
 * `HistorySync.syncType` and `HistorySyncNotification.syncType` are distinct
 * enum types with shared values, so each field uses its own.
 */
async function buildHistorySyncBootstrapMessage(input = {}) {
    const historySync = {
        syncType: _proto_1.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP,
        chunkOrder: 0,
        progress: 100,
        conversations: input.conversations ? [...input.conversations] : [],
        pushnames: input.pushnames ? [...input.pushnames] : [],
        phoneNumberToLidMappings: (input.phoneNumberToLidMappings ?? []).map((mapping) => ({
            pnJid: mapping.pnJid,
            lidJid: mapping.lidJid
        })),
        ...(input.companionMetaNonce !== undefined
            ? { companionMetaNonce: input.companionMetaNonce }
            : {})
    };
    const payload = await encodeHistorySync(historySync);
    const message = buildInlineHistorySyncNotification(_proto_1.proto.Message.HistorySyncType.INITIAL_BOOTSTRAP, payload);
    return { message, payloadBytes: payload.byteLength };
}
