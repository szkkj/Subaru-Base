"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrivacyCoordinator = createPrivacyCoordinator;
const privacy_1 = require("../events/privacy");
const PromiseDedup_1 = require("../../infra/perf/PromiseDedup");
const defaults_1 = require("../../protocol/defaults");
const jid_1 = require("../../protocol/jid");
const nodes_1 = require("../../protocol/nodes");
const privacy_2 = require("../../protocol/privacy");
const privacy_3 = require("../../transport/node/builders/privacy");
const query_1 = require("../../transport/node/query");
const primitives_1 = require("../../util/primitives");
/**
 * Adds the identifier fields a migrated write may carry. Only the writes that
 * consume them call it - an unblock addresses by jid alone, and a
 * disallowed-list write with the AB gate closed falls back to `pn_jid`.
 */
async function withContactIdentifiers(options, target) {
    if (target.lidJid === null)
        return target;
    try {
        const contact = await options.contactStore.getByJid(target.lidJid);
        return {
            ...target,
            username: contact?.username ?? null,
            displayName: contact?.displayName ?? null
        };
    }
    catch (error) {
        options.logger.debug('contact identifier lookup failed', {
            jid: target.lidJid,
            message: (0, primitives_1.toError)(error).message
        });
        return target;
    }
}
/**
 * Resolves a blocklist input into both addressing forms via
 * `resolveUserJidPair` (device-list cache first, usync fallback for phone
 * jids). Resolution failures degrade to the single known form instead of
 * throwing - the server then decides whether that form is acceptable.
 */
async function resolveBlocklistTarget(options, jid) {
    const normalized = (0, jid_1.normalizeRecipientJid)(jid);
    if (!(0, jid_1.isLidJid)(normalized) && !(0, jid_1.isUserJid)(normalized)) {
        throw new Error(`blocklist target must be a user jid: ${jid}`);
    }
    const pair = await options.resolveUserJidPair(normalized);
    if (pair.lidJid !== null) {
        return { lidJid: pair.lidJid, pnJid: pair.pnJid };
    }
    return { lidJid: null, pnJid: pair.pnJid ?? normalized };
}
const ACCOUNT_SYNC_REFRESH_KEY = 'account-sync';
/**
 * A `409` on a disallowed-list write means the `dhash` we sent no longer
 * matches the server's: another device changed the list in between.
 */
function isStaleDhashResult(node) {
    if (node.tag !== nodes_1.WA_NODE_TAGS.IQ || node.attrs.type === nodes_1.WA_IQ_TYPES.RESULT) {
        return false;
    }
    const error = (0, query_1.parseIqError)(node);
    return error.numericCode === 409 || error.code === '409';
}
/**
 * Resolves a disallowed-list input into `<user>` entries. Unlike the blocklist
 * the server takes both actions in one stanza, so add/remove are resolved
 * together and keep their relative order.
 */
async function resolveDisallowedListEntries(options, input) {
    const entries = [];
    const actions = [
        { action: privacy_2.WA_PRIVACY_LIST_ACTIONS.ADD, jids: input.add ?? [] },
        { action: privacy_2.WA_PRIVACY_LIST_ACTIONS.REMOVE, jids: input.remove ?? [] }
    ];
    const usernameIdentifierAllowed = options.isUsernamePrivacyListIdentifierEnabled();
    for (const { action, jids } of actions) {
        for (const jid of jids) {
            const resolved = await resolveBlocklistTarget(options, jid);
            const target = usernameIdentifierAllowed
                ? await withContactIdentifiers(options, resolved)
                : resolved;
            entries.push({
                action,
                lidJid: target.lidJid,
                pnJid: target.pnJid,
                username: target.username ?? null
            });
        }
    }
    if (entries.length === 0) {
        throw new Error('setDisallowedList requires at least one add/remove entry');
    }
    return entries;
}
/** Builds a {@link WaPrivacyCoordinator} backed by the given IQ query function. */
function createPrivacyCoordinator(options) {
    const { queryWithContext } = options;
    const usesLidAddressing = () => options.getSelfLid() !== null;
    let refreshTimer = null;
    let refreshStopped = false;
    let activeRefresh = null;
    const refreshDedup = new PromiseDedup_1.PromiseDedup();
    const queryDisallowedList = async (category) => {
        const node = (0, privacy_3.buildGetPrivacyDisallowedListIq)(category, usesLidAddressing());
        const result = await queryWithContext('privacy.getDisallowedList', node, undefined, {
            category
        });
        (0, query_1.assertIqResult)(result, 'privacy.getDisallowedList');
        return result;
    };
    const readDisallowedList = async (category) => (0, privacy_1.parseDisallowedList)(await queryDisallowedList(category));
    const runAccountSyncRefresh = async () => {
        const settingsNode = await queryWithContext('privacy.getSettings', (0, privacy_3.buildGetPrivacySettingsIq)());
        (0, query_1.assertIqResult)(settingsNode, 'privacy.getSettings');
        const listNodes = await Promise.all(privacy_2.WA_PRIVACY_ACCOUNT_SYNC_DISALLOWED_LISTS.map(async (setting) => ({
            setting,
            node: await queryDisallowedList(privacy_2.WA_PRIVACY_SETTING_TO_CATEGORY[setting])
        })));
        const disallowedLists = [];
        for (const { setting, node } of listNodes) {
            const update = (0, privacy_1.parseDisallowedListUpdate)(node);
            if (update) {
                disallowedLists.push({ setting, ...update });
            }
        }
        const result = {
            settings: (0, privacy_1.parsePrivacySettings)(settingsNode),
            disallowedLists
        };
        options.emitPrivacy(result);
        return result;
    };
    /**
     * Joins a refresh already in flight instead of racing it, so concurrent
     * callers share one round of queries and one emit.
     */
    const dedupedRefresh = () => {
        const running = refreshDedup.run(ACCOUNT_SYNC_REFRESH_KEY, runAccountSyncRefresh);
        activeRefresh = running;
        return running;
    };
    /**
     * Refresh for a change the server just announced. It must not join a
     * refresh already in flight: that one's queries went out before the
     * change landed, so joining it would emit a snapshot without the new
     * value and nothing would refetch. Waiting for it first guarantees a read
     * issued after the notification.
     */
    const followUpRefresh = async () => {
        if (refreshStopped) {
            return;
        }
        await activeRefresh?.catch(() => undefined);
        if (refreshStopped) {
            return;
        }
        await dedupedRefresh();
    };
    const writeDisallowedList = async (category, entries, dhash) => {
        const node = (0, privacy_3.buildSetPrivacyDisallowedListIq)(category, entries, dhash, usesLidAddressing());
        return queryWithContext('privacy.setDisallowedList', node, undefined, {
            category,
            entries: entries.length
        });
    };
    return {
        getPrivacySettings: async () => {
            const node = (0, privacy_3.buildGetPrivacySettingsIq)();
            const result = await queryWithContext('privacy.getSettings', node);
            (0, query_1.assertIqResult)(result, 'privacy.getSettings');
            return (0, privacy_1.parsePrivacySettings)(result);
        },
        setPrivacySetting: async (setting, value) => {
            const category = privacy_2.WA_PRIVACY_SETTING_TO_CATEGORY[setting];
            const node = (0, privacy_3.buildSetPrivacyCategoryIq)(category, value);
            const result = await queryWithContext('privacy.setSetting', node, undefined, {
                category,
                value
            });
            (0, query_1.assertIqResult)(result, 'privacy.setSetting');
            return (0, privacy_1.parsePrivacyCategoryDhash)(result, category);
        },
        getDisallowedList: async (setting) => readDisallowedList(privacy_2.WA_PRIVACY_SETTING_TO_CATEGORY[setting]),
        setDisallowedList: async (setting, input) => {
            const category = privacy_2.WA_PRIVACY_SETTING_TO_CATEGORY[setting];
            const entries = await resolveDisallowedListEntries(options, input);
            const current = await readDisallowedList(category);
            let result = await writeDisallowedList(category, entries, current.dhash ?? null);
            if (isStaleDhashResult(result)) {
                const refreshed = await readDisallowedList(category);
                result = await writeDisallowedList(category, entries, refreshed.dhash ?? null);
            }
            (0, query_1.assertIqResult)(result, 'privacy.setDisallowedList');
            return (0, privacy_1.parsePrivacyCategoryDhash)(result, category);
        },
        refreshFromAccountSync: () => dedupedRefresh(),
        scheduleAccountSyncRefresh: () => {
            refreshStopped = false;
            if (refreshTimer !== null) {
                clearTimeout(refreshTimer);
            }
            refreshTimer = setTimeout(() => {
                refreshTimer = null;
                void followUpRefresh().catch((error) => {
                    options.logger.warn('account_sync privacy refresh failed', {
                        message: (0, primitives_1.toError)(error).message
                    });
                });
            }, defaults_1.WA_DEFAULTS.PRIVACY_ACCOUNT_SYNC_DEBOUNCE_MS);
            refreshTimer.unref?.();
        },
        stopAccountSyncRefresh: () => {
            refreshStopped = true;
            if (refreshTimer !== null) {
                clearTimeout(refreshTimer);
                refreshTimer = null;
            }
        },
        getBlocklist: async () => {
            const node = (0, privacy_3.buildGetBlocklistIq)();
            const result = await queryWithContext('privacy.getBlocklist', node);
            (0, query_1.assertIqResult)(result, 'privacy.getBlocklist');
            return (0, privacy_1.parseBlocklist)(result);
        },
        blockUser: async (jid) => {
            const target = await withContactIdentifiers(options, await resolveBlocklistTarget(options, jid));
            const node = (0, privacy_3.buildBlocklistBlockIq)(target);
            const result = await queryWithContext('privacy.blockUser', node, undefined, {
                jid: target.lidJid ?? target.pnJid
            });
            (0, query_1.assertIqResult)(result, 'privacy.blockUser');
        },
        unblockUser: async (jid) => {
            const target = await resolveBlocklistTarget(options, jid);
            const unblockJid = target.lidJid ?? target.pnJid;
            const node = (0, privacy_3.buildBlocklistUnblockIq)(unblockJid);
            const result = await queryWithContext('privacy.unblockUser', node, undefined, {
                jid: unblockJid
            });
            (0, query_1.assertIqResult)(result, 'privacy.unblockUser');
        }
    };
}
