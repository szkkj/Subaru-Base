"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_PRIVACY_DHASH_NONE = exports.WA_PRIVACY_LIST_ACTIONS = exports.WA_PRIVACY_TAGS = exports.WA_PRIVACY_ACCOUNT_SYNC_DISALLOWED_LISTS = exports.WA_PRIVACY_DISALLOWED_LIST_CATEGORIES = exports.WA_PRIVACY_SETTING_VALUES = exports.WA_PRIVACY_SETTING_TO_CATEGORY = exports.WA_PRIVACY_CATEGORY_TO_SETTING = exports.WA_PRIVACY_VALUES = exports.WA_PRIVACY_CATEGORIES = void 0;
exports.WA_PRIVACY_CATEGORIES = Object.freeze({
    READ_RECEIPTS: 'readreceipts',
    LAST_SEEN: 'last',
    ONLINE: 'online',
    PROFILE_PICTURE: 'profile',
    ABOUT: 'status',
    GROUP_ADD: 'groupadd',
    CALL_ADD: 'calladd',
    MESSAGES: 'messages',
    DEFENSE_MODE: 'defense',
    LINKED_PROFILES: 'linked_profiles',
    PIX: 'pix'
});
exports.WA_PRIVACY_VALUES = Object.freeze({
    ALL: 'all',
    CONTACTS: 'contacts',
    CONTACT_BLACKLIST: 'contact_blacklist',
    NONE: 'none',
    MATCH_LAST_SEEN: 'match_last_seen',
    KNOWN: 'known',
    OFF: 'off',
    ON_STANDARD: 'on_standard',
    ERROR: 'error'
});
exports.WA_PRIVACY_CATEGORY_TO_SETTING = Object.freeze({
    [exports.WA_PRIVACY_CATEGORIES.READ_RECEIPTS]: 'readReceipts',
    [exports.WA_PRIVACY_CATEGORIES.LAST_SEEN]: 'lastSeen',
    [exports.WA_PRIVACY_CATEGORIES.ONLINE]: 'online',
    [exports.WA_PRIVACY_CATEGORIES.PROFILE_PICTURE]: 'profilePicture',
    [exports.WA_PRIVACY_CATEGORIES.ABOUT]: 'about',
    [exports.WA_PRIVACY_CATEGORIES.GROUP_ADD]: 'groupAdd',
    [exports.WA_PRIVACY_CATEGORIES.CALL_ADD]: 'callAdd',
    [exports.WA_PRIVACY_CATEGORIES.MESSAGES]: 'messages',
    [exports.WA_PRIVACY_CATEGORIES.DEFENSE_MODE]: 'defenseMode',
    [exports.WA_PRIVACY_CATEGORIES.LINKED_PROFILES]: 'linkedProfiles',
    [exports.WA_PRIVACY_CATEGORIES.PIX]: 'pix'
});
exports.WA_PRIVACY_SETTING_TO_CATEGORY = Object.freeze({
    readReceipts: exports.WA_PRIVACY_CATEGORIES.READ_RECEIPTS,
    lastSeen: exports.WA_PRIVACY_CATEGORIES.LAST_SEEN,
    online: exports.WA_PRIVACY_CATEGORIES.ONLINE,
    profilePicture: exports.WA_PRIVACY_CATEGORIES.PROFILE_PICTURE,
    about: exports.WA_PRIVACY_CATEGORIES.ABOUT,
    groupAdd: exports.WA_PRIVACY_CATEGORIES.GROUP_ADD,
    callAdd: exports.WA_PRIVACY_CATEGORIES.CALL_ADD,
    messages: exports.WA_PRIVACY_CATEGORIES.MESSAGES,
    defenseMode: exports.WA_PRIVACY_CATEGORIES.DEFENSE_MODE,
    linkedProfiles: exports.WA_PRIVACY_CATEGORIES.LINKED_PROFILES,
    pix: exports.WA_PRIVACY_CATEGORIES.PIX
});
const VISIBILITY_VALUES = Object.freeze([
    exports.WA_PRIVACY_VALUES.ALL,
    exports.WA_PRIVACY_VALUES.CONTACTS,
    exports.WA_PRIVACY_VALUES.CONTACT_BLACKLIST,
    exports.WA_PRIVACY_VALUES.NONE
]);
/**
 * Values each setting actually accepts. The server reports categories the
 * library does not model and can answer `error`, so a value has to be checked
 * against its own setting - a globally valid value is not necessarily valid
 * here, and surfacing one would break the type the public API declares.
 */
exports.WA_PRIVACY_SETTING_VALUES = Object.freeze({
    readReceipts: Object.freeze([exports.WA_PRIVACY_VALUES.ALL, exports.WA_PRIVACY_VALUES.NONE]),
    lastSeen: VISIBILITY_VALUES,
    online: Object.freeze([
        exports.WA_PRIVACY_VALUES.ALL,
        exports.WA_PRIVACY_VALUES.NONE,
        exports.WA_PRIVACY_VALUES.MATCH_LAST_SEEN
    ]),
    profilePicture: VISIBILITY_VALUES,
    about: VISIBILITY_VALUES,
    groupAdd: Object.freeze([
        exports.WA_PRIVACY_VALUES.ALL,
        exports.WA_PRIVACY_VALUES.CONTACTS,
        exports.WA_PRIVACY_VALUES.CONTACT_BLACKLIST
    ]),
    callAdd: Object.freeze([
        exports.WA_PRIVACY_VALUES.ALL,
        exports.WA_PRIVACY_VALUES.KNOWN,
        exports.WA_PRIVACY_VALUES.CONTACTS
    ]),
    messages: Object.freeze([exports.WA_PRIVACY_VALUES.ALL, exports.WA_PRIVACY_VALUES.CONTACTS]),
    defenseMode: Object.freeze([exports.WA_PRIVACY_VALUES.OFF, exports.WA_PRIVACY_VALUES.ON_STANDARD]),
    linkedProfiles: VISIBILITY_VALUES,
    pix: VISIBILITY_VALUES
});
exports.WA_PRIVACY_DISALLOWED_LIST_CATEGORIES = Object.freeze({
    ABOUT: exports.WA_PRIVACY_CATEGORIES.ABOUT,
    GROUP_ADD: exports.WA_PRIVACY_CATEGORIES.GROUP_ADD,
    LAST_SEEN: exports.WA_PRIVACY_CATEGORIES.LAST_SEEN,
    PROFILE_PICTURE: exports.WA_PRIVACY_CATEGORIES.PROFILE_PICTURE,
    LINKED_PROFILES: exports.WA_PRIVACY_CATEGORIES.LINKED_PROFILES,
    PIX: exports.WA_PRIVACY_CATEGORIES.PIX
});
/**
 * Disallowed lists refreshed alongside the categories whenever an
 * account-sync privacy update lands. Mirrors the set WhatsApp Web resyncs;
 * the remaining deny-list categories are only read on demand.
 */
exports.WA_PRIVACY_ACCOUNT_SYNC_DISALLOWED_LISTS = Object.freeze([
    'about',
    'groupAdd',
    'lastSeen',
    'profilePicture'
]);
exports.WA_PRIVACY_TAGS = Object.freeze({
    CATEGORY: 'category',
    LIST: 'list',
    USER: 'user'
});
/** `action` attr of a `<user>` node inside a disallowed-list mutation. */
exports.WA_PRIVACY_LIST_ACTIONS = Object.freeze({
    ADD: 'add',
    REMOVE: 'remove'
});
/**
 * Placeholder sent as `dhash` when the client holds no version stamp for a
 * category's disallowed list (first write, or after a failed sync).
 */
exports.WA_PRIVACY_DHASH_NONE = 'none';
