"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaMobileCoordinator = void 0;
const companion_host_1 = require("../../auth/pairing/companion-host");
const companion_host_2 = require("../messaging/companion-host");
const _crypto_1 = require("../../crypto");
const jid_1 = require("../../protocol/jid");
const nodes_1 = require("../../protocol/nodes");
const _transport_1 = require("../../transport");
const mobile_1 = require("../../transport/node/builders/mobile");
const async_1 = require("../../util/async");
const primitives_1 = require("../../util/primitives");
const PAIR_DEVICE_TIMEOUT_MS = 32000;
const KEY_INDEX_TIMEOUT_MS = 32000;
const REMOVE_DEVICE_TIMEOUT_MS = 32000;
const PRIMARY_HELLO_TIMEOUT_MS = 120000;
const LINK_CODE_FINISH_TIMEOUT_MS = 120000;
const PEM_TTL_SECONDS = 5 * 24 * 60 * 60;
const COMPANION_PROVISION_ATTEMPTS = 8;
const COMPANION_PROVISION_RETRY_MS = 1500;
/**
 * Hosts companion devices from a mobile-primary session: signs a companion's
 * device identity, uploads `pair-device`, tracks the linked set, and can revoke
 * a device. Exposed at `client.mobile`; requires a registered primary session.
 * Supports the QR ({@link linkCompanion}) and pairing-code
 * ({@link linkCompanionByCode}) flows.
 */
class WaMobileCoordinator {
    constructor(deps) {
        this.epoch = null;
        this.pendingCompanionHello = null;
        this.pendingFinish = null;
        this.accountKeyIndexes = new Set([0]);
        this.pushNameSeeded = false;
        this.authClient = deps.authClient;
        this.messageDispatch = deps.messageDispatch;
        this.chatCoordinator = deps.chatCoordinator;
        this.deviceSync = deps.deviceSync;
        this.appStateStore = deps.appStateStore;
        this.queryWithContext = deps.queryWithContext;
        this.emitEvent = deps.emitEvent;
        this.isMobilePrimary = deps.isMobilePrimary;
        this.logger = deps.logger.child({ scope: 'mobile' });
        this.persistence = deps.persistence;
        this.includePem = deps.includePem ?? false;
        deps.registerIncomingHandler({
            tag: nodes_1.WA_NODE_TAGS.NOTIFICATION,
            prepend: true,
            handler: (node) => this.handleNotification(node)
        });
    }
    /**
     * Links the companion from its pairing QR: signs the device identity, uploads
     * `pair-device`, and returns the server-assigned device jid.
     *
     * @throws when there is no primary session or the server rejects the upload
     * (e.g. the linked-device cap is reached).
     */
    async linkCompanion(qr) {
        try {
            const parsed = (0, companion_host_1.parseCompanionQr)(qr);
            return await this.completeLink({
                ref: parsed.ref,
                companionIdentityPublicKey: parsed.identityPublicKey,
                companionNoisePublicKey: parsed.noisePublicKey,
                advSecretKey: parsed.advSecretKey,
                platform: parsed.platform
            });
        }
        catch (error) {
            const normalized = (0, primitives_1.toError)(error);
            this.logger.warn('companion link failed', { message: normalized.message });
            this.emitEvent('companion_host_error', normalized);
            throw normalized;
        }
    }
    /**
     * Links a companion via its 8-character pairing code (the "link with phone
     * number" flow). The companion must have requested a code for this account
     * first (its `companion_hello` is recorded); this drives `primary_hello`,
     * awaits `companion_finish`, and completes the same `pair-device` upload as
     * the QR path.
     *
     * @throws when there is no primary session, no companion is pending, the code
     * is wrong, or the handshake times out.
     */
    async linkCompanionByCode(pairingCode) {
        try {
            const accountIdentityKeyPair = this.requirePrimaryIdentityKeyPair();
            const hello = this.pendingCompanionHello;
            if (!hello) {
                throw new Error('no pending companion; a companion must request a pairing code for this account first');
            }
            const prepared = await (0, companion_host_1.preparePrimaryHello)({
                pairingCode: pairingCode.replace(/[^0-9A-Za-z]/g, '').toUpperCase(),
                wrappedCompanionEphemeralPub: hello.wrappedCompanionEphemeralPub
            });
            let finishTimeout;
            const finishPromise = new Promise((resolve, reject) => {
                this.pendingFinish = { ref: hello.ref, resolve };
                finishTimeout = setTimeout(() => {
                    if (this.pendingFinish?.ref === hello.ref) {
                        this.pendingFinish = null;
                        reject(new Error('link-code companion_finish timed out'));
                    }
                }, LINK_CODE_FINISH_TIMEOUT_MS);
            });
            finishPromise.catch(() => undefined);
            let finish;
            try {
                const helloResult = await this.queryWithContext('companion-host.primary-hello', (0, mobile_1.buildPrimaryHelloIq)({
                    ref: hello.ref,
                    wrappedPrimaryEphemeralPub: prepared.wrappedPrimaryEphemeralPub,
                    primaryIdentityPub: (0, _crypto_1.toRawPubKey)(accountIdentityKeyPair.pubKey)
                }), PRIMARY_HELLO_TIMEOUT_MS);
                (0, _transport_1.assertIqResult)(helloResult, 'companion-host.primary-hello');
                finish = await finishPromise;
            }
            finally {
                clearTimeout(finishTimeout);
                if (this.pendingFinish?.ref === hello.ref) {
                    this.pendingFinish = null;
                }
            }
            const advSecretKey = await (0, companion_host_1.completePrimaryHandshake)({
                sharedEphemeral: prepared.sharedEphemeral,
                wrappedKeyBundle: finish.wrappedKeyBundle,
                companionIdentityPub: finish.companionIdentityPub,
                primaryIdentityKeyPair: accountIdentityKeyPair
            });
            this.pendingCompanionHello = null;
            return await this.completeLink({
                ref: hello.ref,
                companionIdentityPublicKey: (0, _crypto_1.toRawPubKey)(finish.companionIdentityPub),
                companionNoisePublicKey: hello.companionServerAuthKeyPub,
                advSecretKey,
                platform: 'link-code'
            });
        }
        catch (error) {
            const normalized = (0, primitives_1.toError)(error);
            this.logger.warn('companion link-by-code failed', { message: normalized.message });
            this.emitEvent('companion_host_error', normalized);
            throw normalized;
        }
    }
    /** Re-signs and republishes the key-index list for the current device set. */
    async publishKeyIndexList() {
        const accountIdentityKeyPair = this.requirePrimaryIdentityKeyPair();
        const epoch = await this.ensureEpoch();
        const timestampSeconds = Math.floor(Date.now() / 1000);
        const validIndexes = this.validKeyIndexes(epoch);
        const currentIndex = validIndexes[validIndexes.length - 1];
        const keyIndexListBytes = await (0, companion_host_1.buildSignedKeyIndexList)({
            accountIdentityKeyPair,
            rawId: epoch.rawId,
            currentIndex,
            timestampSeconds,
            validIndexes
        });
        const iq = (0, mobile_1.buildKeyIndexListPublishIq)({ keyIndexListBytes, timestampSeconds });
        const result = await this.queryWithContext('companion-host.key-index-list', iq, KEY_INDEX_TIMEOUT_MS);
        (0, _transport_1.assertIqResult)(result, 'companion-host.key-index-list');
        this.logger.debug('key-index list published', { currentIndex, validIndexes });
    }
    /**
     * Unlinks a companion this primary linked: sends the `remove-companion-device`
     * IQ, drops it from the tracked set, and republishes the key-index list for
     * the reduced device set.
     *
     * @throws when there is no registered primary session, the companion is not
     * tracked, or the server rejects the removal.
     */
    async revokeCompanion(companionDeviceJid, reason = 'user_initiated') {
        this.requirePrimaryIdentityKeyPair();
        const epoch = await this.ensureEpoch();
        if (!epoch.companions.some((companion) => companion.deviceJid === companionDeviceJid)) {
            throw new Error(`companion ${companionDeviceJid} is not tracked by this primary`);
        }
        const result = await this.queryWithContext('companion-host.remove-device', (0, mobile_1.buildRemoveCompanionDeviceIq)({ deviceJid: companionDeviceJid, reason }), REMOVE_DEVICE_TIMEOUT_MS);
        (0, _transport_1.assertIqResult)(result, 'companion-host.remove-device');
        this.epoch = {
            rawId: epoch.rawId,
            currentKeyIndex: epoch.currentKeyIndex,
            companions: epoch.companions.filter((companion) => companion.deviceJid !== companionDeviceJid)
        };
        this.forgetAccountKeyIndex((0, jid_1.parseSignalAddressFromJid)(companionDeviceJid).device);
        await this.persist(this.epoch);
        await this.publishKeyIndexList().catch((error) => {
            this.logger.warn('key-index list republish failed after companion revoke', {
                deviceJid: companionDeviceJid,
                message: (0, primitives_1.toError)(error).message
            });
        });
        this.logger.info('companion revoked', { deviceJid: companionDeviceJid, reason });
        this.emitEvent('companion_host_revoked', { deviceJid: companionDeviceJid });
    }
    /**
     * Unlinks EVERY companion from the account in a single `remove-companion-device`
     * `all="true"` stanza (the phone's "log out all companion devices"), clears the
     * tracked set, and republishes the key-index list for the primary alone.
     * `excludeHostedCompanion` spares companions this account itself hosts.
     *
     * @throws when there is no registered primary session or the server rejects
     * the removal.
     */
    async revokeAllCompanions(reason = 'user_initiated', options = {}) {
        this.requirePrimaryIdentityKeyPair();
        const epoch = await this.ensureEpoch();
        const result = await this.queryWithContext('companion-host.remove-all-devices', (0, mobile_1.buildRemoveAllCompanionDevicesIq)({
            reason,
            excludeHostedCompanion: options.excludeHostedCompanion
        }), REMOVE_DEVICE_TIMEOUT_MS);
        (0, _transport_1.assertIqResult)(result, 'companion-host.remove-all-devices');
        if (options.excludeHostedCompanion) {
            this.logger.info('revoked non-hosted companions; hosted set kept', {
                kept: epoch.companions.length,
                reason
            });
            return;
        }
        const removed = epoch.companions.map((companion) => companion.deviceJid);
        this.epoch = { rawId: epoch.rawId, currentKeyIndex: epoch.currentKeyIndex, companions: [] };
        this.accountKeyIndexes = new Set([0]);
        await this.persist(this.epoch);
        await this.publishKeyIndexList().catch((error) => {
            this.logger.warn('key-index list republish failed after revoke-all', {
                message: (0, primitives_1.toError)(error).message
            });
        });
        this.logger.info('all companions revoked', { count: removed.length, reason });
        for (const deviceJid of removed) {
            this.emitEvent('companion_host_revoked', { deviceJid });
        }
    }
    /** Returns the companions this primary has linked in the current epoch. */
    async listCompanions() {
        const epoch = await this.ensureEpoch();
        return epoch.companions;
    }
    /**
     * Reconciles the tracked companion set against the account's live device list
     * on the server (`usync`). Drops companions the server no longer lists - one
     * the user unlinked, or one that self-removed while the primary was offline -
     * then persists and emits `companion_host_revoked` for each. Runs on connect
     * and on `account_sync`; safe to call manually. A no-op (no server query, no
     * epoch created) when no companions are tracked. Returns the removed jids.
     */
    async reconcileCompanions() {
        if (!this.isMobilePrimary()) {
            return [];
        }
        const meJid = this.authClient.getCurrentCredentials()?.meJid;
        if (!meJid) {
            return [];
        }
        const epoch = this.epoch ?? (this.persistence ? await this.persistence.load() : null);
        if (!epoch || epoch.companions.length === 0) {
            return [];
        }
        this.epoch = epoch;
        const [synced] = await this.deviceSync.syncDeviceList([meJid]);
        const serverJids = synced?.deviceJids;
        if (!serverJids || serverJids.length === 0) {
            return [];
        }
        return this.pruneCompanionsToDevices(epoch, new Set(serverJids.map((jid) => (0, jid_1.parseSignalAddressFromJid)(jid).device)));
    }
    /**
     * Prunes tracked companions to those whose device slot is still in
     * `serverDeviceIndexes`, persisting + emitting `companion_host_revoked` for
     * each drop. Shared by the connect-time (`usync`) and `account_sync` paths.
     */
    async pruneCompanionsToDevices(epoch, serverDeviceIndexes) {
        const kept = epoch.companions.filter((companion) => serverDeviceIndexes.has((0, jid_1.parseSignalAddressFromJid)(companion.deviceJid).device));
        if (kept.length === epoch.companions.length) {
            return [];
        }
        const removed = epoch.companions
            .filter((companion) => !serverDeviceIndexes.has((0, jid_1.parseSignalAddressFromJid)(companion.deviceJid).device))
            .map((companion) => companion.deviceJid);
        this.epoch = {
            rawId: epoch.rawId,
            currentKeyIndex: epoch.currentKeyIndex,
            companions: kept
        };
        await this.persist(this.epoch);
        this.logger.info('reconciled companions with server device list', {
            kept: kept.length,
            removed: removed.length
        });
        for (const deviceJid of removed) {
            this.emitEvent('companion_host_revoked', { deviceJid });
        }
        return removed;
    }
    /**
     * Reconciles from an `account_sync` notification's `<devices>` payload - the
     * fresh, authoritative device set - so a companion the user just unlinked is
     * pruned immediately (no `usync` round-trip, which would read a stale cache).
     */
    async reconcileFromAccountSync(node) {
        if (!this.isMobilePrimary()) {
            return;
        }
        const devices = (0, _transport_1.findNodeChild)(node, nodes_1.WA_NODE_TAGS.DEVICES);
        if (!devices) {
            return;
        }
        const epoch = this.epoch ?? (this.persistence ? await this.persistence.load() : null);
        if (!epoch || epoch.companions.length === 0) {
            return;
        }
        this.epoch = epoch;
        const serverDeviceIndexes = new Set([0]);
        for (const child of (0, _transport_1.getNodeChildren)(devices)) {
            if (child.tag !== nodes_1.WA_NODE_TAGS.DEVICE) {
                continue;
            }
            const jid = child.attrs.jid;
            if (jid) {
                serverDeviceIndexes.add((0, jid_1.parseSignalAddressFromJid)(jid).device);
            }
        }
        await this.pruneCompanionsToDevices(epoch, serverDeviceIndexes);
    }
    /**
     * Shares the primary's active app-state sync key with a linked companion via
     * an `APP_STATE_SYNC_KEY_SHARE` peer message so it can decrypt app-state.
     * Establishes the outbound Signal session on demand, so call it once the
     * companion is online (prekeys uploaded), not at link time.
     *
     * @throws when there is no primary session or no active sync key.
     */
    async shareAppStateSyncKeys(companionDeviceJid) {
        this.requirePrimaryIdentityKeyPair();
        const activeKey = await this.appStateStore.getActiveSyncKey();
        if (!activeKey) {
            throw new Error('no active app-state sync key to share; the primary session is not initialized');
        }
        await this.messageDispatch.sendAppStateSyncKeyShare(companionDeviceJid, [activeKey]);
        this.logger.info('shared app-state sync key with companion', {
            deviceJid: companionDeviceJid
        });
    }
    /**
     * Pushes the `INITIAL_BOOTSTRAP` history sync to a linked companion as a
     * `HISTORY_SYNC_NOTIFICATION` peer message. Flips the companion's
     * `initialChatHistory` bootstrap flag; without it the companion self-removes
     * with `HistorySyncTimeout`. Requires the companion online with prekeys.
     *
     * @throws when there is no registered primary session.
     */
    async sendHistorySyncBootstrap(companionDeviceJid, options = {}) {
        this.requirePrimaryIdentityKeyPair();
        const { message, payloadBytes } = await (0, companion_host_2.buildHistorySyncBootstrapMessage)({
            phoneNumberToLidMappings: options.phoneNumberToLidMappings
        });
        await this.messageDispatch.publishProtocolMessageToDevice(companionDeviceJid, message);
        this.logger.info('companion-host history sync bootstrap sent', {
            deviceJid: companionDeviceJid,
            mappings: options.phoneNumberToLidMappings?.length ?? 0,
            payloadBytes
        });
    }
    /**
     * `ClientPairingProps` for the `<client-props>` pair-device element. A
     * LID-native primary declares the chat DB LID-migrated + pure-LID session so
     * the companion runs `setIsLidMigrated` at pair time and does not self-remove
     * on its LID-addressed blocklist.
     */
    buildClientPairingProps() {
        const meLid = this.authClient.getCurrentCredentials()?.meLid;
        const lidNative = typeof meLid === 'string' && meLid.length > 0;
        return {
            isChatDbLidMigrated: lidNative,
            isSyncdPureLidSession: lidNative,
            isSyncdSnapshotRecoveryEnabled: false
        };
    }
    /**
     * Seeds the primary's own `setting_pushName` into the `critical_block`
     * app-state collection, once per session. The companion's critical bootstrap
     * completes only when it finds an applied `SettingPushName` action; without
     * one it self-removes with `syncd_timeout`. Falls back to the account phone
     * number when no push name is set. Idempotent and best-effort.
     */
    async ensureAccountPushNameAppState() {
        if (this.pushNameSeeded) {
            return;
        }
        const credentials = this.authClient.getCurrentCredentials();
        const meJidUser = credentials?.meJid?.split('@')[0]?.split(':')[0];
        const name = credentials?.pushName?.trim() || meJidUser;
        if (!name) {
            throw new Error('cannot seed setting_pushName: primary has no pushName or meJid');
        }
        await this.chatCoordinator.set({ schema: 'SettingPushName', name });
        this.pushNameSeeded = true;
        this.logger.info('seeded primary setting_pushName into critical_block app-state', {
            name
        });
    }
    async completeLink(input) {
        const accountIdentityKeyPair = this.requirePrimaryIdentityKeyPair();
        await this.ensureAccountPushNameAppState().catch((error) => {
            this.logger.warn('failed to seed primary setting_pushName app-state', {
                message: (0, primitives_1.toError)(error).message
            });
        });
        const epoch = await this.ensureEpoch();
        const keyIndex = this.nextKeyIndex(epoch);
        const validIndexes = [...this.validKeyIndexes(epoch), keyIndex].sort((a, b) => a - b);
        const timestampSeconds = Math.floor(Date.now() / 1000);
        const record = {
            deviceJid: '',
            keyIndex,
            companionIdentityPublicKey: input.companionIdentityPublicKey,
            addedAtSeconds: timestampSeconds
        };
        const signed = await (0, companion_host_1.buildSignedCompanionIdentity)({
            accountIdentityKeyPair,
            companionIdentityPublicKey: input.companionIdentityPublicKey,
            advSecretKey: input.advSecretKey,
            rawId: epoch.rawId,
            keyIndex,
            timestampSeconds,
            validIndexes
        });
        const iq = (0, mobile_1.buildPairDeviceIq)({
            ref: input.ref,
            companionNoisePublicKey: input.companionNoisePublicKey,
            deviceIdentityBytes: signed.deviceIdentityBytes,
            keyIndexListBytes: signed.keyIndexListBytes,
            keyIndexListTimestampSeconds: timestampSeconds,
            clientProps: this.buildClientPairingProps(),
            pem: this.includePem
                ? {
                    aesGcmKeyBytes: (0, companion_host_1.derivePemKey)(input.advSecretKey, input.companionNoisePublicKey),
                    ttlSeconds: PEM_TTL_SECONDS
                }
                : undefined
        });
        this.logger.info('linking companion', { platform: input.platform, keyIndex });
        const result = await this.queryWithContext('companion-host.pair-device', iq, PAIR_DEVICE_TIMEOUT_MS);
        (0, _transport_1.assertIqResult)(result, 'companion-host.pair-device');
        const wrapper = (0, _transport_1.getFirstNodeChild)(result);
        const deviceNode = (0, _transport_1.findNodeChild)(result, nodes_1.WA_NODE_TAGS.DEVICE) ??
            (wrapper ? (0, _transport_1.findNodeChild)(wrapper, nodes_1.WA_NODE_TAGS.DEVICE) : undefined);
        const deviceJid = deviceNode?.attrs.jid;
        if (!deviceJid) {
            throw new Error('pair-device result missing <device jid>');
        }
        this.epoch = {
            rawId: epoch.rawId,
            currentKeyIndex: keyIndex,
            companions: [...epoch.companions, { ...record, deviceJid }]
        };
        await this.persist(this.epoch);
        const linked = { deviceJid, keyIndex };
        this.logger.info('companion linked', { deviceJid, keyIndex });
        this.emitEvent('companion_host_linked', linked);
        this.provisionLinkedCompanion(deviceJid);
        return linked;
    }
    /**
     * Best-effort background provisioning after a companion links: pushes the
     * history-sync bootstrap and shares the app-state sync key. Fire-and-forget
     * and retried, because the companion needs a moment to upload prekeys before
     * the outbound Signal session these peer messages ride on can be established.
     */
    provisionLinkedCompanion(deviceJid) {
        void this.provisionLinkedCompanionWithRetry(deviceJid).catch((error) => {
            const normalized = (0, primitives_1.toError)(error);
            this.logger.warn('companion provisioning failed', {
                deviceJid,
                message: normalized.message
            });
            this.emitEvent('companion_host_error', normalized);
        });
    }
    async provisionLinkedCompanionWithRetry(deviceJid) {
        let lastError;
        for (let attempt = 1; attempt <= COMPANION_PROVISION_ATTEMPTS; attempt += 1) {
            if (attempt > 1) {
                await (0, async_1.delay)(COMPANION_PROVISION_RETRY_MS);
            }
            try {
                await this.sendHistorySyncBootstrap(deviceJid);
                await this.shareAppStateSyncKeys(deviceJid).catch((error) => {
                    this.logger.debug('companion app-state key share (best-effort) failed', {
                        deviceJid,
                        message: (0, primitives_1.toError)(error).message
                    });
                });
                this.logger.info('companion provisioned', { deviceJid, attempts: attempt });
                return;
            }
            catch (error) {
                lastError = error;
                this.logger.debug('companion provisioning attempt failed', {
                    deviceJid,
                    attempt,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        }
        throw (0, primitives_1.toError)(lastError);
    }
    handleNotification(node) {
        if (node.attrs.type === 'account_sync') {
            this.updateAccountKeyIndexes(node);
            void this.reconcileFromAccountSync(node).catch((error) => {
                this.logger.debug('companion reconcile on account_sync failed', {
                    message: (0, primitives_1.toError)(error).message
                });
            });
            return Promise.resolve(false);
        }
        const linkCode = (0, _transport_1.findNodeChild)(node, nodes_1.WA_NODE_TAGS.LINK_CODE_COMPANION_REG);
        if (linkCode) {
            const stage = linkCode.attrs.stage;
            if (stage === 'companion_hello') {
                this.storeCompanionHello(linkCode);
            }
            else if (stage === 'companion_finish') {
                this.resolveCompanionFinish(linkCode);
            }
        }
        return Promise.resolve(false);
    }
    /**
     * Tracks the account's live device key-indexes from an `account_sync`
     * notification so a new companion gets a non-colliding key index and the
     * published key-index list keeps every existing device valid.
     */
    updateAccountKeyIndexes(node) {
        const devices = (0, _transport_1.findNodeChild)(node, nodes_1.WA_NODE_TAGS.DEVICES);
        if (!devices) {
            return;
        }
        const indexes = new Set([0]);
        for (const child of (0, _transport_1.getNodeChildren)(devices)) {
            if (child.tag !== nodes_1.WA_NODE_TAGS.DEVICE) {
                continue;
            }
            const rawIndex = child.attrs['key-index'];
            const parsed = rawIndex ? Number.parseInt(rawIndex, 10) : Number.NaN;
            if (Number.isInteger(parsed) && parsed >= 0) {
                indexes.add(parsed);
            }
        }
        this.accountKeyIndexes = indexes;
        this.logger.debug('account device key-indexes updated', { indexes: [...indexes] });
    }
    forgetAccountKeyIndex(index) {
        if (!this.accountKeyIndexes.has(index)) {
            return;
        }
        const next = new Set(this.accountKeyIndexes);
        next.delete(index);
        this.accountKeyIndexes = next;
    }
    /**
     * The key indexes currently valid for this account - index 0 (the primary),
     * the account's own live devices, and every tracked companion. Sorted
     * ascending. Deliberately excludes `epoch.currentKeyIndex`, which is an
     * allocation high-water mark, not proof a device still exists: after revoking
     * the last-linked companion its index must drop out of the published list.
     */
    validKeyIndexes(epoch) {
        const indexes = new Set([0, ...this.accountKeyIndexes]);
        for (const companion of epoch.companions) {
            indexes.add(companion.keyIndex);
        }
        return [...indexes].sort((a, b) => a - b);
    }
    /**
     * Allocates the next companion key index, advancing strictly past both the
     * epoch's monotonic high-water mark and every currently-valid index so a
     * revoked index is never reused (reuse breaks previously linked devices).
     */
    nextKeyIndex(epoch) {
        return Math.max(epoch.currentKeyIndex, ...this.validKeyIndexes(epoch)) + 1;
    }
    storeCompanionHello(linkCode) {
        const ref = (0, _transport_1.getNodeTextContent)((0, _transport_1.findNodeChild)(linkCode, nodes_1.WA_NODE_TAGS.LINK_CODE_PAIRING_REF));
        const wrapped = this.nodeBytes(linkCode, nodes_1.WA_NODE_TAGS.LINK_CODE_PAIRING_WRAPPED_COMPANION_EPHEMERAL_PUB);
        const authKey = this.nodeBytes(linkCode, nodes_1.WA_NODE_TAGS.COMPANION_SERVER_AUTH_KEY_PUB);
        if (!ref || !wrapped || !authKey) {
            return;
        }
        this.pendingCompanionHello = {
            ref,
            wrappedCompanionEphemeralPub: wrapped,
            companionServerAuthKeyPub: authKey
        };
        this.logger.debug('recorded link-code companion_hello', { ref });
    }
    resolveCompanionFinish(linkCode) {
        const ref = (0, _transport_1.getNodeTextContent)((0, _transport_1.findNodeChild)(linkCode, nodes_1.WA_NODE_TAGS.LINK_CODE_PAIRING_REF));
        const wrappedKeyBundle = this.nodeBytes(linkCode, nodes_1.WA_NODE_TAGS.LINK_CODE_PAIRING_WRAPPED_KEY_BUNDLE);
        const companionIdentityPub = this.nodeBytes(linkCode, nodes_1.WA_NODE_TAGS.COMPANION_IDENTITY_PUBLIC);
        if (ref && wrappedKeyBundle && companionIdentityPub && this.pendingFinish?.ref === ref) {
            this.pendingFinish.resolve({ companionIdentityPub, wrappedKeyBundle });
            this.pendingFinish = null;
        }
    }
    nodeBytes(parent, tag) {
        return (0, _transport_1.getNodeBytesContent)((0, _transport_1.findNodeChild)(parent, tag)) ?? null;
    }
    requirePrimaryIdentityKeyPair() {
        if (!this.isMobilePrimary()) {
            throw new Error('client.mobile requires a mobile-primary session (connect via mobileTransport / a registered phone identity)');
        }
        const credentials = this.authClient.getCurrentCredentials();
        if (!credentials?.meJid) {
            throw new Error('companion-host requires a registered primary session (no meJid)');
        }
        return credentials.registrationInfo.identityKeyPair;
    }
    async ensureEpoch() {
        if (this.epoch) {
            return this.epoch;
        }
        const loaded = this.persistence ? await this.persistence.load() : null;
        if (loaded) {
            this.epoch = loaded;
            return loaded;
        }
        this.epoch = { rawId: await this.generateRawId(), currentKeyIndex: 0, companions: [] };
        await this.persist(this.epoch);
        return this.epoch;
    }
    async generateRawId() {
        return (0, _crypto_1.randomIntAsync)(1, 2147483647);
    }
    async persist(state) {
        if (this.persistence) {
            await this.persistence.save(state);
        }
    }
}
exports.WaMobileCoordinator = WaMobileCoordinator;
