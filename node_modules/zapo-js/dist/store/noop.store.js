"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOOP_DEVICE_LIST_STORE = exports.NOOP_GROUP_METADATA_STORE = exports.NOOP_CHAT_METADATA_STORE = exports.NOOP_RETRY_STORE = exports.NOOP_CONTACT_STORE = exports.NOOP_THREAD_STORE = exports.NOOP_MESSAGE_STORE = exports.NOOP_MESSAGE_SECRET_STORE = void 0;
const EMPTY_STORE_LIST = Object.freeze([]);
exports.NOOP_MESSAGE_SECRET_STORE = Object.freeze({
    get: async (_messageId) => null,
    getBatch: async (messageIds) => new Array(messageIds.length).fill(null),
    set: async (_messageId, _entry) => { },
    setBatch: async (_entries) => { },
    cleanupExpired: async (_nowMs) => 0,
    clear: async () => { }
});
exports.NOOP_MESSAGE_STORE = Object.freeze({
    upsert: async (_record) => { },
    upsertBatch: async (_records) => { },
    getById: async (_id) => null,
    listByThread: async (_threadJid, _limit, _beforeTimestampMs) => EMPTY_STORE_LIST,
    deleteById: async (_id) => 0,
    clear: async () => { }
});
exports.NOOP_THREAD_STORE = Object.freeze({
    upsert: async (_record) => { },
    upsertBatch: async (_records) => { },
    getByJid: async (_jid) => null,
    list: async (_limit) => EMPTY_STORE_LIST,
    deleteByJid: async (_jid) => 0,
    clear: async () => { }
});
exports.NOOP_CONTACT_STORE = Object.freeze({
    upsert: async (_record) => { },
    upsertBatch: async (_records) => { },
    getByJid: async (_jid) => null,
    getByPhoneNumber: async (_pn) => null,
    deleteByJid: async (_jid) => 0,
    clear: async () => { }
});
exports.NOOP_RETRY_STORE = Object.freeze({
    getOutboundRequesterStatus: async () => null,
    upsertOutboundMessage: async (_record) => { },
    deleteOutboundMessage: async (_messageId) => 0,
    getOutboundMessage: async (_messageId) => null,
    updateOutboundMessageState: async () => { },
    markOutboundRequesterDelivered: async () => { },
    incrementInboundCounter: async () => 0,
    cleanupExpired: async (_nowMs) => 0,
    clear: async () => { },
    destroy: async () => { }
});
exports.NOOP_CHAT_METADATA_STORE = Object.freeze({
    upsertChatMetadata: async (_snapshot) => { },
    getChatMetadata: async (_chatJid, _nowMs) => null,
    deleteChatMetadata: async (_chatJid) => 0,
    cleanupExpired: async (_nowMs) => 0,
    clear: async () => { },
    destroy: async () => { }
});
exports.NOOP_GROUP_METADATA_STORE = Object.freeze({
    upsertGroupMetadata: async (_snapshot) => { },
    getGroupMetadata: async (_groupJid, _nowMs) => null,
    deleteGroupMetadata: async (_groupJid) => 0,
    cleanupExpired: async (_nowMs) => 0,
    clear: async () => { },
    destroy: async () => { }
});
exports.NOOP_DEVICE_LIST_STORE = Object.freeze({
    upsertUserDevicesBatch: async (_snapshots) => { },
    getUserDevicesBatch: async (userJids, _nowMs) => new Array(userJids.length).fill(null),
    findByAnyUserJid: async (_jid, _nowMs) => null,
    deleteUserDevices: async (_userJid) => 0,
    cleanupExpired: async (_nowMs) => 0,
    clear: async () => { },
    destroy: async () => { }
});
