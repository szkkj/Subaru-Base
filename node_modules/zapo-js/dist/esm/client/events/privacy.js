import { WA_NODE_TAGS } from '../../protocol/nodes.js';
import { WA_PRIVACY_CATEGORY_TO_SETTING, WA_PRIVACY_SETTING_VALUES, WA_PRIVACY_TAGS } from '../../protocol/privacy.js';
import { normalizeUsername } from '../../protocol/username.js';
import { findNodeChild, getNodeChildren, getNodeChildrenByTag } from '../../transport/node/helpers.js';
function parsePrivacyListEntries(nodes) {
    const entries = new Array(nodes.length);
    let count = 0;
    for (let i = 0; i < nodes.length; i += 1) {
        const attrs = nodes[i].attrs;
        const jid = attrs.jid;
        if (!jid)
            continue;
        const username = attrs.username;
        entries[count] =
            username !== undefined ? { jid, username: normalizeUsername(username) } : { jid };
        count += 1;
    }
    entries.length = count;
    return entries;
}
function toJids(entries) {
    const jids = new Array(entries.length);
    for (let i = 0; i < entries.length; i += 1) {
        jids[i] = entries[i].jid;
    }
    return jids;
}
/**
 * Server categories the library intentionally drops: they are either
 * region/product specific or not part of the modeled privacy surface.
 */
const IGNORED_SERVER_CATEGORIES = new Set([
    'stickers',
    'dependentaccountmessages',
    'cover_photo',
    'dependent_account_calling',
    'groupcreation'
]);
const SETTING_VALUES = WA_PRIVACY_SETTING_VALUES;
/** Parses the `<privacy>` payload of a privacy `get` IQ result. */
export function parsePrivacySettings(result) {
    const privacyNode = findNodeChild(result, WA_NODE_TAGS.PRIVACY);
    if (!privacyNode) {
        return {};
    }
    const settings = {};
    const categories = getNodeChildrenByTag(privacyNode, WA_PRIVACY_TAGS.CATEGORY);
    for (let i = 0; i < categories.length; i += 1) {
        const node = categories[i];
        const name = node.attrs.name;
        const value = node.attrs.value;
        if (!name || !value) {
            continue;
        }
        if (IGNORED_SERVER_CATEGORIES.has(name)) {
            continue;
        }
        const settingName = WA_PRIVACY_CATEGORY_TO_SETTING[name];
        if (!settingName) {
            continue;
        }
        if (SETTING_VALUES[settingName]?.includes(value) !== true) {
            continue;
        }
        settings[settingName] = value;
    }
    return settings;
}
/**
 * Reads the `dhash` the server echoes back on a privacy `set` result. It is a
 * millisecond timestamp acting as the version stamp of that category's
 * disallowed list, and is only present while the category sits on
 * `contact_blacklist`.
 */
export function parsePrivacyCategoryDhash(result, category) {
    const privacyNode = findNodeChild(result, WA_NODE_TAGS.PRIVACY);
    if (!privacyNode) {
        return null;
    }
    const categories = getNodeChildrenByTag(privacyNode, WA_PRIVACY_TAGS.CATEGORY);
    for (let i = 0; i < categories.length; i += 1) {
        const node = categories[i];
        if (node.attrs.name !== category) {
            continue;
        }
        return node.attrs.dhash ?? null;
    }
    return null;
}
/**
 * Parses the `<privacy><list>` payload of a disallowed-list `get` IQ result,
 * returning `null` when the reply carries no `<list>` at all. The server omits
 * it to mean "nothing to update" - either the category is not on
 * `contact_blacklist`, or the `dhash` the client sent still matches - which is
 * different from an empty list, so a caller reacting to changes can skip it.
 */
export function parseDisallowedListUpdate(result) {
    const privacyNode = findNodeChild(result, WA_NODE_TAGS.PRIVACY);
    if (!privacyNode) {
        return null;
    }
    const listNode = findNodeChild(privacyNode, WA_PRIVACY_TAGS.LIST);
    if (!listNode) {
        return null;
    }
    const dhash = listNode.attrs.dhash;
    const entries = parsePrivacyListEntries(getNodeChildrenByTag(listNode, WA_PRIVACY_TAGS.USER));
    return { jids: toJids(entries), entries, dhash };
}
/**
 * Same read as {@link parseDisallowedListUpdate}, flattening the "nothing to
 * update" reply into an empty list for callers that just want the current
 * membership.
 */
export function parseDisallowedList(result) {
    return parseDisallowedListUpdate(result) ?? { jids: [], entries: [] };
}
/** Parses the `<list>` payload of a blocklist `get` IQ result. */
export function parseBlocklist(result) {
    const listNode = findNodeChild(result, WA_NODE_TAGS.LIST);
    if (!listNode) {
        return { jids: [], entries: [] };
    }
    const dhash = listNode.attrs.dhash;
    const entries = parsePrivacyListEntries(getNodeChildren(listNode));
    return { jids: toJids(entries), entries, dhash };
}
