export const WA_DIRTY_TYPES = Object.freeze({
    ACCOUNT_SYNC: 'account_sync',
    GROUPS: 'groups',
    SYNCD_APP_STATE: 'syncd_app_state',
    NEWSLETTER_METADATA: 'newsletter_metadata'
});
export const WA_DIRTY_PROTOCOLS = Object.freeze({
    DEVICES: 'devices',
    PICTURE: 'picture',
    PRIVACY: 'privacy',
    BLOCKLIST: 'blocklist',
    NOTICE: 'notice'
});
export const WA_ACCOUNT_SYNC_PROTOCOLS = Object.freeze([
    WA_DIRTY_PROTOCOLS.DEVICES,
    WA_DIRTY_PROTOCOLS.PICTURE,
    WA_DIRTY_PROTOCOLS.PRIVACY,
    WA_DIRTY_PROTOCOLS.BLOCKLIST,
    WA_DIRTY_PROTOCOLS.NOTICE
]);
export const WA_SUPPORTED_DIRTY_TYPES = Object.freeze([
    WA_DIRTY_TYPES.ACCOUNT_SYNC,
    WA_DIRTY_TYPES.SYNCD_APP_STATE,
    WA_DIRTY_TYPES.GROUPS,
    WA_DIRTY_TYPES.NEWSLETTER_METADATA
]);
