"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_SUPPORTED_DIRTY_TYPES = exports.WA_ACCOUNT_SYNC_PROTOCOLS = exports.WA_DIRTY_PROTOCOLS = exports.WA_DIRTY_TYPES = void 0;
exports.WA_DIRTY_TYPES = Object.freeze({
    ACCOUNT_SYNC: 'account_sync',
    GROUPS: 'groups',
    SYNCD_APP_STATE: 'syncd_app_state',
    NEWSLETTER_METADATA: 'newsletter_metadata'
});
exports.WA_DIRTY_PROTOCOLS = Object.freeze({
    DEVICES: 'devices',
    PICTURE: 'picture',
    PRIVACY: 'privacy',
    BLOCKLIST: 'blocklist',
    NOTICE: 'notice'
});
exports.WA_ACCOUNT_SYNC_PROTOCOLS = Object.freeze([
    exports.WA_DIRTY_PROTOCOLS.DEVICES,
    exports.WA_DIRTY_PROTOCOLS.PICTURE,
    exports.WA_DIRTY_PROTOCOLS.PRIVACY,
    exports.WA_DIRTY_PROTOCOLS.BLOCKLIST,
    exports.WA_DIRTY_PROTOCOLS.NOTICE
]);
exports.WA_SUPPORTED_DIRTY_TYPES = Object.freeze([
    exports.WA_DIRTY_TYPES.ACCOUNT_SYNC,
    exports.WA_DIRTY_TYPES.SYNCD_APP_STATE,
    exports.WA_DIRTY_TYPES.GROUPS,
    exports.WA_DIRTY_TYPES.NEWSLETTER_METADATA
]);
