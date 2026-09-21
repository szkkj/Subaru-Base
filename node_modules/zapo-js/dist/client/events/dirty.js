"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDirtyBits = parseDirtyBits;
exports.handleDirtyBits = handleDirtyBits;
const privacy_1 = require("../events/privacy");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const account_sync_1 = require("../../transport/node/builders/account-sync");
const usync_1 = require("../../transport/node/builders/usync");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
const usync_2 = require("../../transport/node/usync");
const primitives_1 = require("../../util/primitives");
const SUPPORTED_DIRTY_TYPES = new Set(constants_1.WA_SUPPORTED_DIRTY_TYPES);
const ACCOUNT_SYNC_PROTOCOL_SET = new Set(constants_1.WA_ACCOUNT_SYNC_PROTOCOLS);
function parseDirtyBitNode(node, logger) {
    const type = node.attrs.type;
    const timestamp = (0, primitives_1.parseOptionalInt)(node.attrs.timestamp);
    if (!type || timestamp === undefined) {
        logger.warn('received invalid dirty bit node', {
            type,
            timestamp: node.attrs.timestamp
        });
        return null;
    }
    const protocols = (0, helpers_1.getNodeChildrenTags)(node);
    return {
        type,
        timestamp,
        protocols
    };
}
function resolveAccountSyncProtocols(protocols) {
    const selected = [];
    for (let index = 0; index < protocols.length; index += 1) {
        const protocol = protocols[index];
        if (ACCOUNT_SYNC_PROTOCOL_SET.has(protocol)) {
            selected.push(protocol);
        }
    }
    if (selected.length > 0) {
        return selected;
    }
    return constants_1.WA_ACCOUNT_SYNC_PROTOCOLS;
}
function parseDirtyBits(nodes, logger) {
    const parsed = [];
    for (const node of nodes) {
        const dirtyBit = parseDirtyBitNode(node, logger);
        if (!dirtyBit) {
            continue;
        }
        parsed.push(dirtyBit);
    }
    return parsed;
}
async function handleDirtyBits(runtime, dirtyBits) {
    const meJid = runtime.getCurrentCredentials()?.meJid ?? null;
    if (!meJid) {
        runtime.logger.trace('dirty bits skipped: session is not registered');
        return;
    }
    const supported = [];
    const unsupported = [];
    for (const dirtyBit of dirtyBits) {
        if (SUPPORTED_DIRTY_TYPES.has(dirtyBit.type)) {
            supported.push(dirtyBit);
            continue;
        }
        unsupported.push(dirtyBit);
    }
    const supportedTypes = new Array(supported.length);
    for (let index = 0; index < supported.length; index += 1) {
        supportedTypes[index] = supported[index].type;
    }
    const unsupportedTypes = new Array(unsupported.length);
    for (let index = 0; index < unsupported.length; index += 1) {
        unsupportedTypes[index] = unsupported[index].type;
    }
    runtime.logger.info('handling dirty bits from info bulletin', {
        supported: supportedTypes.join(','),
        unsupported: unsupportedTypes.join(',')
    });
    const clearableDirtyBits = [...unsupported];
    const supportedPromises = new Array(supported.length);
    for (let index = 0; index < supported.length; index += 1) {
        supportedPromises[index] = handleDirtyBit(runtime, supported[index]);
    }
    const settledSupported = await Promise.allSettled(supportedPromises);
    for (let index = 0; index < settledSupported.length; index += 1) {
        const result = settledSupported[index];
        if (result.status === 'fulfilled') {
            clearableDirtyBits.push(supported[index]);
            continue;
        }
        runtime.logger.warn('failed handling dirty bit', {
            type: supported[index].type,
            message: (0, primitives_1.toError)(result.reason).message
        });
    }
    await clearDirtyBits(runtime, clearableDirtyBits);
}
async function handleDirtyBit(runtime, dirtyBit) {
    switch (dirtyBit.type) {
        case constants_1.WA_DIRTY_TYPES.ACCOUNT_SYNC:
            await handleAccountSyncDirtyBit(runtime, dirtyBit.protocols);
            return;
        case constants_1.WA_DIRTY_TYPES.SYNCD_APP_STATE:
            await handleSyncdAppStateDirtyBit(runtime);
            return;
        case constants_1.WA_DIRTY_TYPES.GROUPS:
            await syncGroupsDirtyBit(runtime);
            return;
        case constants_1.WA_DIRTY_TYPES.NEWSLETTER_METADATA:
            await syncNewsletterMetadataDirtyBit(runtime);
            return;
        default:
            runtime.logger.debug('received unsupported dirty bit', {
                type: dirtyBit.type
            });
    }
}
async function handleAccountSyncDirtyBit(runtime, protocols) {
    const selectedProtocols = resolveAccountSyncProtocols(protocols);
    runtime.logger.debug('received account_sync dirty bit', {
        protocols: selectedProtocols.join(',')
    });
    const failures = [];
    const protocolPromises = new Array(selectedProtocols.length);
    for (let index = 0; index < selectedProtocols.length; index += 1) {
        const protocol = selectedProtocols[index];
        protocolPromises[index] = (async () => {
            try {
                await runAccountSyncProtocol(runtime, protocol);
            }
            catch (error) {
                failures.push(protocol);
                runtime.logger.warn('account_sync protocol failed', {
                    protocol,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        })();
    }
    await Promise.all(protocolPromises);
    if (failures.length > 0) {
        throw new Error(`account_sync protocols failed: ${failures.join(',')}`);
    }
}
async function runAccountSyncProtocol(runtime, protocol) {
    switch (protocol) {
        case constants_1.WA_DIRTY_PROTOCOLS.DEVICES:
            await syncAccountDevicesDirtyBit(runtime);
            return;
        case constants_1.WA_DIRTY_PROTOCOLS.PICTURE:
            await syncAccountPictureDirtyBit(runtime);
            return;
        case constants_1.WA_DIRTY_PROTOCOLS.PRIVACY:
            await syncAccountPrivacyDirtyBit(runtime);
            return;
        case constants_1.WA_DIRTY_PROTOCOLS.BLOCKLIST:
            await syncAccountBlocklistDirtyBit(runtime);
            return;
        case constants_1.WA_DIRTY_PROTOCOLS.NOTICE:
            runtime.logger.debug('account_sync notice protocol received (no GraphQL/MEX job configured)');
            return;
        default:
            runtime.logger.debug('unsupported account_sync protocol', {
                protocol
            });
    }
}
async function handleSyncdAppStateDirtyBit(runtime) {
    runtime.logger.debug('received syncd_app_state dirty bit, starting sync');
    await runtime.syncAppState();
}
async function syncAccountDevicesDirtyBit(runtime) {
    const credentials = runtime.getCurrentCredentials();
    const meJid = credentials?.meJid ?? null;
    if (!meJid) {
        runtime.logger.trace('account_sync devices skipped: meJid is missing');
        return;
    }
    const userJids = resolveAccountSyncDeviceTargets(credentials);
    if (userJids.length === 0) {
        runtime.logger.trace('account_sync devices skipped: no valid account_sync targets');
        return;
    }
    await runSyncQuery(runtime, {
        queryContext: 'account_sync.devices',
        node: (0, account_sync_1.buildAccountDevicesSyncIq)(userJids, await runtime.generateUsyncSid()),
        logMessage: 'account_sync devices synchronized',
        contextData: { meJid, targets: userJids.join(',') }
    });
}
async function syncAccountPictureDirtyBit(runtime) {
    const meJid = runtime.getCurrentCredentials()?.meJid ?? null;
    if (!meJid) {
        runtime.logger.trace('account_sync picture skipped: meJid is missing');
        return;
    }
    const targetJid = (0, jid_1.toUserJid)(meJid);
    const response = await runtime.queryWithContext('account_sync.picture', (0, account_sync_1.buildAccountPictureSyncIq)(targetJid), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS, { meJid, target: targetJid });
    if (response.tag !== constants_1.WA_NODE_TAGS.IQ) {
        throw new Error(`account_sync.picture returned non-iq node (${response.tag})`);
    }
    if (response.attrs.type === constants_1.WA_IQ_TYPES.RESULT) {
        runtime.logger.debug('account_sync picture synchronized', {
            meJid,
            target: targetJid
        });
        return;
    }
    const iqError = (0, query_1.parseIqError)(response);
    const isPictureMissing = (iqError.numericCode === 404 || iqError.code === '404') &&
        iqError.text.toLowerCase() === 'item-not-found';
    if (isPictureMissing) {
        runtime.logger.debug('account_sync picture skipped: no profile picture found', {
            meJid,
            target: targetJid
        });
        return;
    }
    throw new Error(`account_sync.picture iq failed (${iqError.code}: ${iqError.text})`);
}
/**
 * Catch-up path for a session that was offline while another device changed a
 * setting. Runs the same refresh the live `account_sync` notification
 * triggers: the whole category set plus the disallowed lists.
 */
async function syncAccountPrivacyDirtyBit(runtime) {
    await runtime.syncAccountPrivacy();
    runtime.logger.debug('account_sync privacy synchronized');
}
/** The reply carries the full blocklist, not a delta. */
async function syncAccountBlocklistDirtyBit(runtime) {
    const response = await runSyncQuery(runtime, {
        queryContext: 'account_sync.blocklist',
        node: (0, account_sync_1.buildAccountBlocklistSyncIq)(),
        logMessage: 'account_sync blocklist synchronized'
    });
    runtime.emitBlocklist((0, privacy_1.parseBlocklist)(response));
}
async function syncGroupsDirtyBit(runtime) {
    await runSyncQuery(runtime, {
        queryContext: 'dirty.groups',
        assertContext: 'groups',
        node: (0, account_sync_1.buildListParticipatingGroupsIq)(),
        logMessage: 'groups dirty sync completed'
    });
}
async function syncNewsletterMetadataDirtyBit(runtime) {
    await runtime.queryWithContext('dirty.newsletter_metadata', (0, account_sync_1.buildNewsletterMetadataSyncIq)(), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
    if (runtime.newsletterListSubscribed) {
        try {
            await runtime.newsletterListSubscribed();
        }
        catch (error) {
            runtime.logger.warn('newsletter_metadata MEX sync failed', {
                message: (0, primitives_1.toError)(error).message
            });
            throw error;
        }
    }
}
function resolveAccountSyncDeviceTargets(credentials) {
    if (!credentials?.meJid) {
        return [];
    }
    const dedup = new Set();
    dedup.add((0, jid_1.toUserJid)(credentials.meJid));
    if (credentials.meLid && credentials.meLid.includes('@')) {
        dedup.add((0, jid_1.toUserJid)(credentials.meLid));
    }
    return [...dedup];
}
async function runSyncQuery(runtime, args) {
    const response = await runtime.queryWithContext(args.queryContext, args.node, constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS, args.contextData);
    (0, query_1.assertIqResult)(response, args.assertContext ?? args.queryContext);
    (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(response), runtime.logger, args.queryContext);
    runtime.logger.debug(args.logMessage, args.contextData);
    return response;
}
async function clearDirtyBits(runtime, dirtyBits) {
    try {
        await runtime.queryWithContext('dirty.clear', (0, account_sync_1.buildClearDirtyBitsIq)(dirtyBits), constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS, {
            count: dirtyBits.length
        }, { useSystemId: true });
        runtime.logger.debug('dirty bits cleared', {
            count: dirtyBits.length
        });
    }
    catch (error) {
        runtime.logger.warn('failed to clear dirty bits', {
            count: dirtyBits.length,
            message: (0, primitives_1.toError)(error).message
        });
    }
}
