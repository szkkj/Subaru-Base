"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_APP_STATE_KDF_INFO = exports.WA_APP_STATE_KEY_TYPES = exports.WA_APP_STATE_SYNC_DATA_TYPE = exports.WA_APP_STATE_ERROR_CODES = exports.WA_APP_STATE_COLLECTION_STATES = exports.WA_APP_STATE_COLLECTIONS = void 0;
const bytes_1 = require("../util/bytes");
exports.WA_APP_STATE_COLLECTIONS = Object.freeze({
    REGULAR: 'regular',
    REGULAR_LOW: 'regular_low',
    REGULAR_HIGH: 'regular_high',
    CRITICAL_BLOCK: 'critical_block',
    CRITICAL_UNBLOCK_LOW: 'critical_unblock_low'
});
exports.WA_APP_STATE_COLLECTION_STATES = Object.freeze({
    SUCCESS: 'success',
    SUCCESS_HAS_MORE: 'success_has_more',
    CONFLICT: 'conflict',
    CONFLICT_HAS_MORE: 'conflict_has_more',
    ERROR_RETRY: 'error_retry',
    ERROR_FATAL: 'error_fatal',
    BLOCKED: 'blocked'
});
exports.WA_APP_STATE_ERROR_CODES = Object.freeze({
    CONFLICT: '409',
    BAD_REQUEST: '400',
    NOT_FOUND: '404',
    NOT_ALLOWED: '405',
    NOT_ACCEPTABLE: '406'
});
exports.WA_APP_STATE_SYNC_DATA_TYPE = Object.freeze({
    PATCH: 'Patch',
    SNAPSHOT: 'Snapshot',
    LOCAL: 'Local'
});
exports.WA_APP_STATE_KEY_TYPES = Object.freeze({
    MD_APP_STATE: 'md-app-state',
    MD_MSG_HIST: 'md-msg-hist'
});
exports.WA_APP_STATE_KDF_INFO = Object.freeze({
    MUTATION_KEYS: bytes_1.TEXT_ENCODER.encode('WhatsApp Mutation Keys'),
    PATCH_INTEGRITY: bytes_1.TEXT_ENCODER.encode('WhatsApp Patch Integrity')
});
