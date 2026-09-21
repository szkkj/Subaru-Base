"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaAppStateMutationCoordinator = void 0;
const utils_1 = require("../../appstate/utils");
const _appstate_spec_1 = require("../../appstate-spec");
const appstate_mutation_1 = require("../events/appstate-mutation");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const jid_1 = require("../../protocol/jid");
const coercion_1 = require("../../util/coercion");
const primitives_1 = require("../../util/primitives");
const WA_APP_STATE_MUTATION_FLUSH_SUCCESS_STATES = new Set([
    constants_1.WA_APP_STATE_COLLECTION_STATES.SUCCESS,
    constants_1.WA_APP_STATE_COLLECTION_STATES.SUCCESS_HAS_MORE
]);
const WA_APP_STATE_ARCHIVE_RANGE_DEFAULT_LIMIT = 256;
/** Placeholder MACs for locally-emitted mutation events (the parser ignores them). */
const WA_EMPTY_MUTATION_MAC = new Uint8Array(0);
function buildMutationIndexFromSchema(schema, indexArgs) {
    const parts = new Array(schema.indexParts.length);
    const args = indexArgs;
    for (let i = 0; i < schema.indexParts.length; i += 1) {
        const part = schema.indexParts[i];
        if (part.type === 'literal') {
            parts[i] = part.value;
            continue;
        }
        const arg = args[part.name];
        if (part.type === 'boolString') {
            parts[i] = arg ? '1' : '0';
            continue;
        }
        if (part.type === 'jidOrZero') {
            if (arg === null || arg === undefined) {
                const fromMeSlot = schema.indexParts.find((p) => p.type === 'boolString' && p.name === 'fromMe');
                if (fromMeSlot && args['fromMe'] !== true) {
                    throw new Error(`app-state index arg "${part.name}" for schema "${schema.name}" requires a JID when fromMe is not true`);
                }
                parts[i] = '0';
                continue;
            }
            parts[i] = arg;
            continue;
        }
        if (part.type === 'enum') {
            if (typeof arg === 'number') {
                parts[i] = String(arg);
                continue;
            }
            if (typeof arg !== 'string') {
                throw new Error(`app-state enum index arg "${part.name}" for schema "${schema.name}" must be a string`);
            }
            const numeric = (0, _appstate_spec_1.encodeEnumValue)(part.protoEnum, arg);
            if (numeric === null) {
                throw new Error(`app-state enum index arg "${part.name}"="${arg}" is not in enum ${part.protoEnum}`);
            }
            parts[i] = String(numeric);
            continue;
        }
        if (typeof arg !== 'string') {
            throw new Error(`app-state index arg "${part.name}" for schema "${schema.name}" must be a string`);
        }
        parts[i] = arg;
    }
    return JSON.stringify(parts);
}
function buildSetMutationFromSchema(input) {
    return {
        collection: input.schema.collection,
        operation: 'set',
        index: buildMutationIndexFromSchema(input.schema, input.indexArgs),
        value: { ...input.value, timestamp: input.timestamp },
        version: input.schema.version,
        timestamp: input.timestamp
    };
}
function splitFlatInput(schema, input) {
    const indexNames = new Set();
    for (const part of schema.indexParts) {
        if (part.type !== 'literal') {
            indexNames.add(part.name);
        }
    }
    const indexArgs = {};
    const data = {};
    for (const key of Object.keys(input)) {
        if (key === 'schema')
            continue;
        if (indexNames.has(key)) {
            indexArgs[key] = input[key];
        }
        else {
            data[key] = input[key];
        }
    }
    return { indexArgs, data };
}
function wrapData(schema, data) {
    const encoded = applyEnumEncodeToData(schema.valueEnumFields, data);
    const field = schema.valueField;
    if (field === null) {
        return encoded;
    }
    return { [field]: encoded };
}
function applyEnumEncodeToData(enumFields, data) {
    if (!enumFields)
        return { ...data };
    const out = { ...data };
    for (const [fieldPath, enumPath] of Object.entries(enumFields)) {
        applyEnumAtPath(out, fieldPath.split('.'), (raw) => {
            if (typeof raw === 'number')
                return raw;
            if (typeof raw !== 'string')
                return raw;
            const numeric = (0, _appstate_spec_1.encodeEnumValue)(enumPath, raw);
            if (numeric === null) {
                throw new Error(`enum value "${raw}" not in ${enumPath}`);
            }
            return numeric;
        });
    }
    return out;
}
function applyEnumAtPath(obj, segments, transform) {
    if (segments.length === 0)
        return;
    const [head, ...rest] = segments;
    if (rest.length === 0) {
        if (head in obj) {
            const value = obj[head];
            if (Array.isArray(value)) {
                obj[head] = value.map(transform);
            }
            else if (value !== null && value !== undefined) {
                obj[head] = transform(value);
            }
        }
        return;
    }
    const next = obj[head];
    if (Array.isArray(next)) {
        const cloned = next.map((item) => {
            if (item && typeof item === 'object') {
                const itemCopy = { ...item };
                applyEnumAtPath(itemCopy, rest, transform);
                return itemCopy;
            }
            return item;
        });
        obj[head] = cloned;
        return;
    }
    if (next && typeof next === 'object') {
        const nextCopy = { ...next };
        applyEnumAtPath(nextCopy, rest, transform);
        obj[head] = nextCopy;
    }
}
function buildRemoveMutationFromSchema(input) {
    return {
        collection: input.schema.collection,
        operation: 'remove',
        index: buildMutationIndexFromSchema(input.schema, input.indexArgs),
        version: input.schema.version,
        timestamp: input.timestamp
    };
}
/**
 * Coordinates app-state mutations (mute/star/read/pin/archive/clear/delete/
 * lock chats, status privacy, broadcast lists) and emits parsed mutation
 * events on sync. Accessed via {@link WaClient.chat}.
 */
class WaAppStateMutationCoordinator {
    constructor(options) {
        this.logger = options.logger;
        this.messageStore = options.messageStore;
        this.appStateSync = options.appStateSync;
        this.mediaTransfer = options.mediaTransfer;
        this.isConnected = options.isConnected;
        this.serverClock = options.serverClock;
        this.archiveRangeLimit = (0, coercion_1.resolvePositive)(options.archiveRangeLimit, WA_APP_STATE_ARCHIVE_RANGE_DEFAULT_LIMIT, 'WaAppStateMutationCoordinatorOptions.archiveRangeLimit');
        this.emitMutation = options.emitMutation;
        this.emitMutationSend = options.emitMutationSend;
        this.emitSnapshotMutations = options.emitSnapshotMutations === true;
        this.nctSaltSink = options.nctSaltSink;
        this.contactSink = options.contactSink;
        this.pushNameSink = options.pushNameSink;
        this.pendingMutations = new Map();
        this.flushPromise = null;
    }
    /**
     * Runs an app-state sync round, optionally applying pending mutations.
     * Throws when the client is not connected. Returns the per-collection
     * result; blocked collections are logged.
     */
    async sync(options = {}) {
        if (!this.isConnected()) {
            throw new Error('client is not connected');
        }
        const syncOptions = options.downloadExternalBlob
            ? options
            : {
                ...options,
                downloadExternalBlob: async (_collection, _kind, reference) => (0, utils_1.downloadExternalBlobReference)(this.mediaTransfer, reference)
            };
        const syncResult = await this.appStateSync.sync(syncOptions);
        const blockedCollections = this.getBlockedCollections(syncResult);
        if (blockedCollections.length > 0) {
            this.logger.warn('app-state sync has blocked collections', {
                blockedCollections: blockedCollections.join(',')
            });
        }
        this.emitEventsFromSyncResult(syncResult);
        return syncResult;
    }
    /** Returns the names of collections reported as `BLOCKED` in `syncResult`. */
    getBlockedCollections(syncResult) {
        const blocked = [];
        for (const entry of syncResult.collections) {
            if (entry.state === constants_1.WA_APP_STATE_COLLECTION_STATES.BLOCKED) {
                blocked.push(entry.collection);
            }
        }
        return blocked;
    }
    /**
     * Walks a sync result and emits one `app_state_mutation` event per
     * distinct (collection, index) – only the last mutation per key wins.
     * Snapshot-source mutations are skipped unless `emitSnapshotMutations`
     * was enabled at construction.
     */
    emitEventsFromSyncResult(syncResult) {
        for (const collectionResult of syncResult.collections) {
            const mutations = collectionResult.mutations ?? [];
            // Persistence sinks (contact store, own pushName): run on the
            // last-wins mutation per key INCLUDING snapshot sources, so
            // pair-time bootstrap lands even when snapshot events are suppressed.
            if (this.contactSink || this.pushNameSink) {
                const sinkLastIndex = new Map();
                for (let i = 0; i < mutations.length; i += 1) {
                    const m = mutations[i];
                    sinkLastIndex.set(`${m.collection}\u0001${m.index}`, i);
                }
                for (let i = 0; i < mutations.length; i += 1) {
                    const m = mutations[i];
                    if (sinkLastIndex.get(`${m.collection}\u0001${m.index}`) !== i) {
                        continue;
                    }
                    try {
                        this.handleContactMutation(m);
                    }
                    catch (error) {
                        this.logger.debug('contact sink failed', {
                            collection: m.collection,
                            index: m.index,
                            message: (0, primitives_1.toError)(error).message
                        });
                    }
                    try {
                        this.handlePushNameMutation(m);
                    }
                    catch (error) {
                        this.logger.debug('pushName sink failed', {
                            collection: m.collection,
                            index: m.index,
                            message: (0, primitives_1.toError)(error).message
                        });
                    }
                }
            }
            const lastMutationIndexByKey = new Map();
            for (let mutationIndex = 0; mutationIndex < mutations.length; mutationIndex += 1) {
                const mutation = mutations[mutationIndex];
                if (!this.emitSnapshotMutations && mutation.source === 'snapshot') {
                    continue;
                }
                lastMutationIndexByKey.set(`${mutation.collection}\u0001${mutation.index}`, mutationIndex);
            }
            for (let mutationIndex = 0; mutationIndex < mutations.length; mutationIndex += 1) {
                const mutation = mutations[mutationIndex];
                if (!this.emitSnapshotMutations && mutation.source === 'snapshot') {
                    continue;
                }
                const coalesceKey = `${mutation.collection}\u0001${mutation.index}`;
                if (lastMutationIndexByKey.get(coalesceKey) !== mutationIndex) {
                    continue;
                }
                try {
                    this.handleNctSaltMutation(mutation);
                    const event = (0, appstate_mutation_1.parseAppStateMutationEvent)(mutation);
                    if (!event) {
                        continue;
                    }
                    this.emitMutation?.(event);
                }
                catch (error) {
                    this.logger.debug('failed to parse app-state mutation event', {
                        collection: mutation.collection,
                        source: mutation.source,
                        index: mutation.index,
                        message: (0, primitives_1.toError)(error).message
                    });
                }
            }
        }
    }
    handleNctSaltMutation(mutation) {
        if (!this.nctSaltSink)
            return;
        const nctAction = mutation.value?.nctSaltSyncAction;
        if (!nctAction) {
            return;
        }
        if (mutation.operation === 'set' && nctAction.salt) {
            this.nctSaltSink(nctAction.salt).catch((err) => this.logger.warn('nct salt sync set failed', {
                message: (0, primitives_1.toError)(err).message
            }));
        }
        else if (mutation.operation === 'remove') {
            this.nctSaltSink(null).catch((err) => this.logger.warn('nct salt sync remove failed', {
                message: (0, primitives_1.toError)(err).message
            }));
        }
    }
    handleContactMutation(mutation) {
        if (!this.contactSink)
            return;
        // Cheap reject before JSON.parse: Contact mutations always carry
        // the literal "contact" as their first index segment.
        if (!mutation.index.includes('"contact"'))
            return;
        let parts;
        try {
            parts = JSON.parse(mutation.index);
        }
        catch {
            return;
        }
        if (!Array.isArray(parts) || parts[0] !== 'contact' || typeof parts[1] !== 'string') {
            return;
        }
        const indexJid = parts[1];
        const lastUpdatedMs = mutation.timestamp > 0 ? mutation.timestamp : Date.now();
        // Remove operations are a no-op for the contact store: `mergeContact`
        // preserves prior displayName when incoming.displayName is undefined,
        // and the row should stay around (the chat may still be open). The
        // public mutation event still fires below so consumers can react.
        if (mutation.operation === 'remove')
            return;
        const action = mutation.value?.contactAction;
        if (!action)
            return;
        // Resolve canonical (LID-preferred) jid + cross-reference: the index
        // typically carries the PN form, and `contactAction.lidJid` carries
        // the LID counterpart. Store one row keyed by LID when both are known
        // (mirrors what the contact store does for history-sync writes), with
        // `phoneNumber` populated so PN-form lookups still resolve.
        const lid = action.lidJid && (0, jid_1.isLidJid)(action.lidJid) ? action.lidJid : undefined;
        const indexIsPn = (0, jid_1.isUserJid)(indexJid);
        const indexIsLid = (0, jid_1.isLidJid)(indexJid);
        const jid = lid ?? indexJid;
        const phoneNumber = indexIsPn ? indexJid : undefined;
        const lidField = lid ?? (indexIsLid ? indexJid : undefined);
        const displayName = action.fullName || action.firstName || undefined;
        this.contactSink({
            jid,
            displayName,
            lid: lidField,
            phoneNumber,
            lastUpdatedMs
        });
    }
    handlePushNameMutation(mutation) {
        if (!this.pushNameSink)
            return;
        // A `set` under the literal index ["setting_pushName"]; cheap reject
        // before reading the value.
        if (mutation.operation !== 'set')
            return;
        if (!mutation.index.includes('setting_pushName'))
            return;
        const name = mutation.value?.pushNameSetting?.name;
        if (typeof name !== 'string')
            return;
        this.pushNameSink(name);
    }
    /**
     * Mutes or unmutes a chat. `muteEndTimestampMs` is required when
     * `muted` is `true` and must be a non-negative safe-integer epoch.
     *
     * For a "mute forever" entry, pass a very large epoch value (the
     * official client uses year-9999 epochs). The mute end is the absolute
     * timestamp when WhatsApp will re-enable notifications - the client
     * does **not** unmute automatically when the timer expires (you'll see
     * the chat un-muted on the phone, but no `mutation` event re-fires).
     */
    async setChatMute(chatJid, muted, muteEndTimestampMs) {
        const chatIndexJid = this.normalizeChatMutationJid(chatJid);
        const timestamp = this.serverClock.nowMs();
        const normalizedMuteEnd = muteEndTimestampMs;
        if (normalizedMuteEnd !== undefined &&
            (!Number.isFinite(normalizedMuteEnd) ||
                !Number.isSafeInteger(normalizedMuteEnd) ||
                normalizedMuteEnd < 0)) {
            throw new Error(`invalid muteEndTimestampMs: ${muteEndTimestampMs}`);
        }
        if (muted && normalizedMuteEnd === undefined) {
            throw new Error('setChatMute requires muteEndTimestampMs when muted is true');
        }
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.Mute,
                indexArgs: { chatJid: chatIndexJid },
                value: {
                    muteAction: {
                        muted,
                        ...(normalizedMuteEnd === undefined
                            ? {}
                            : { muteEndTimestamp: normalizedMuteEnd })
                    }
                },
                timestamp
            })
        ]);
    }
    /** Stars or un-stars a specific message. */
    async setMessageStar(message, starred) {
        const messageIndex = this.buildMessageMutationIndex(message);
        const timestamp = this.serverClock.nowMs();
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.Star,
                indexArgs: messageIndex,
                value: { starAction: { starred } },
                timestamp
            })
        ]);
    }
    /** Marks the chat as read or unread. */
    async setChatRead(chatJid, read) {
        const chatIndexJid = this.normalizeChatMutationJid(chatJid);
        const timestamp = this.serverClock.nowMs();
        const messageRange = await this.buildChatMessageRange(chatIndexJid);
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.MarkChatAsRead,
                indexArgs: { chatJid: chatIndexJid },
                value: { markChatAsReadAction: { read, messageRange } },
                timestamp
            })
        ]);
    }
    /**
     * Pins or unpins the chat. Pinning also clears any active archive flag
     * (the two states are mutually exclusive on the client). WhatsApp
     * imposes a server-side cap on pinned chats - extra pins sync but the
     * official UI will hide / reject them.
     */
    async setChatPin(chatJid, pinned) {
        const chatIndexJid = this.normalizeChatMutationJid(chatJid);
        const timestamp = this.serverClock.nowMs();
        const pending = [
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.Pin,
                indexArgs: { chatJid: chatIndexJid },
                value: { pinAction: { pinned } },
                timestamp
            })
        ];
        if (pinned) {
            pending.push(await this.createArchiveMutation(chatIndexJid, false, timestamp));
        }
        await this.enqueueAndFlush(pending);
    }
    /** Archives or unarchives the chat. Archiving also clears any pin. */
    async setChatArchive(chatJid, archived) {
        const chatIndexJid = this.normalizeChatMutationJid(chatJid);
        const timestamp = this.serverClock.nowMs();
        const pending = [
            await this.createArchiveMutation(chatIndexJid, archived, timestamp)
        ];
        if (archived) {
            pending.push(buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.Pin,
                indexArgs: { chatJid: chatIndexJid },
                value: { pinAction: { pinned: false } },
                timestamp
            }));
        }
        await this.enqueueAndFlush(pending);
    }
    /**
     * Clears the chat history (without deleting the chat itself - it stays
     * in the chat list, just empty). Defaults to **preserving** starred
     * messages and media; set `options.deleteStarred`/`deleteMedia` to wipe
     * those too. The clear is local-only - other participants keep their
     * copies.
     */
    async clearChat(chatJid, options = {}) {
        const chatIndexJid = this.normalizeChatMutationJid(chatJid);
        const timestamp = this.serverClock.nowMs();
        const deleteStarred = options.deleteStarred === true;
        const deleteMedia = options.deleteMedia === true;
        const messageRange = await this.buildChatMessageRange(chatIndexJid);
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.ClearChat,
                indexArgs: {
                    chatJid: chatIndexJid,
                    deleteStarred: deleteStarred ? '1' : '0',
                    deleteMedia: deleteMedia ? '1' : '0'
                },
                value: { clearChatAction: { messageRange } },
                timestamp
            })
        ]);
    }
    /**
     * Deletes the chat entirely (removes from the chat list + drops every
     * stored message). Local-only - the conversation continues to exist on
     * the peer's device. For groups, this does **not** leave the group;
     * use {@link WaGroupCoordinator.leaveGroup} for that.
     */
    async deleteChat(chatJid, options = {}) {
        const chatIndexJid = this.normalizeChatMutationJid(chatJid);
        const timestamp = this.serverClock.nowMs();
        const deleteMedia = options.deleteMedia === true;
        const messageRange = await this.buildChatMessageRange(chatIndexJid);
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.DeleteChat,
                indexArgs: {
                    chatJid: chatIndexJid,
                    deleteMedia: deleteMedia ? '1' : '0'
                },
                value: { deleteChatAction: { messageRange } },
                timestamp
            })
        ]);
    }
    /**
     * Deletes a single message **locally** - removes it from your own
     * device(s) only. The recipient(s) still see it. Use a `revoke`
     * outgoing message ({@link WaMessageCoordinator.send} with
     * `{ type: 'revoke', ... }`) to delete-for-everyone instead.
     * `messageTimestampMs` must be a non-negative safe-integer epoch when set.
     */
    async deleteMessageForMe(message, options = {}) {
        const messageIndex = this.buildMessageMutationIndex(message);
        const timestamp = this.serverClock.nowMs();
        const deleteMedia = options.deleteMedia === true;
        const messageTimestampMs = options.messageTimestampMs;
        let messageTimestamp;
        if (messageTimestampMs !== undefined) {
            if (!Number.isFinite(messageTimestampMs) ||
                !Number.isSafeInteger(messageTimestampMs) ||
                messageTimestampMs < 0) {
                throw new Error(`invalid messageTimestampMs: ${messageTimestampMs}`);
            }
            messageTimestamp = Math.floor(messageTimestampMs / 1000);
        }
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.DeleteMessageForMe,
                indexArgs: messageIndex,
                value: {
                    deleteMessageForMeAction: {
                        deleteMedia,
                        ...(messageTimestamp === undefined ? {} : { messageTimestamp })
                    }
                },
                timestamp
            })
        ]);
    }
    /** Locks or unlocks the chat. Locking also clears archive and pin. */
    async setChatLock(chatJid, locked) {
        const chatIndexJid = this.normalizeChatMutationJid(chatJid);
        const timestamp = this.serverClock.nowMs();
        const pending = [];
        if (locked) {
            pending.push(await this.createArchiveMutation(chatIndexJid, false, timestamp));
            pending.push(buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.Pin,
                indexArgs: { chatJid: chatIndexJid },
                value: { pinAction: { pinned: false } },
                timestamp
            }));
        }
        pending.push(buildSetMutationFromSchema({
            schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.LockChat,
            indexArgs: { chatJid: chatIndexJid },
            value: { lockChatAction: { locked } },
            timestamp
        }));
        await this.enqueueAndFlush(pending);
    }
    /**
     * Drains any queued mutations through a sync round. Concurrent callers
     * share the in-flight flush promise. Failed collections are re-queued
     * before the error is rethrown.
     */
    async flushMutations() {
        if (this.flushPromise) {
            return this.flushPromise;
        }
        const inFlight = this.flushPendingMutationsLoop();
        this.flushPromise = inFlight;
        try {
            return await inFlight;
        }
        finally {
            if (this.flushPromise === inFlight) {
                this.flushPromise = null;
            }
        }
    }
    async enqueueAndFlush(mutations) {
        for (const mutation of mutations) {
            this.enqueueMutation(mutation);
            this.emitLocalMutation(mutation);
        }
        await this.flushMutations();
    }
    /**
     * Surfaces an action this client is sending via the outbound `mutation_send`
     * event, so consumers can observe their own change at action time. Parse
     * failures are swallowed (best-effort).
     */
    emitLocalMutation(input) {
        if (!this.emitMutationSend)
            return;
        const value = input.operation === 'set' ? input.value : null;
        try {
            const event = (0, appstate_mutation_1.parseAppStateMutationEvent)({
                collection: input.collection,
                operation: input.operation,
                source: 'local',
                index: input.index,
                value,
                version: input.version,
                indexMac: WA_EMPTY_MUTATION_MAC,
                valueMac: WA_EMPTY_MUTATION_MAC,
                keyId: WA_EMPTY_MUTATION_MAC,
                timestamp: input.timestamp
            });
            if (event)
                this.emitMutationSend(event);
        }
        catch (error) {
            this.logger.debug('failed to emit local app-state mutation event', {
                collection: input.collection,
                index: input.index,
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    enqueueMutation(mutation) {
        const key = `${mutation.collection}\u0001${mutation.index}`;
        if (this.pendingMutations.has(key)) {
            this.pendingMutations.delete(key);
        }
        this.pendingMutations.set(key, mutation);
    }
    takePendingMutationsBatch() {
        if (this.pendingMutations.size === 0) {
            return [];
        }
        const batch = [...this.pendingMutations.values()];
        this.pendingMutations.clear();
        return batch;
    }
    async flushPendingMutationsLoop() {
        while (true) {
            const batch = this.takePendingMutationsBatch();
            if (batch.length === 0) {
                return;
            }
            this.logger.debug('app-state mutation flush start', {
                pending: batch.length,
                actions: this.describeMutationActions(batch)
            });
            const collections = [];
            let syncResult;
            try {
                const seenCollections = new Set();
                for (const mutation of batch) {
                    if (seenCollections.has(mutation.collection)) {
                        continue;
                    }
                    seenCollections.add(mutation.collection);
                    collections.push(mutation.collection);
                }
                syncResult = await this.sync({
                    collections,
                    pendingMutations: batch
                });
            }
            catch (error) {
                this.requeueMutations(batch);
                this.logger.warn('app-state mutation flush failed', {
                    pending: batch.length,
                    actions: this.describeMutationActions(batch),
                    message: (0, primitives_1.toError)(error).message
                });
                throw (0, primitives_1.toError)(error);
            }
            const stateByCollection = new Map();
            for (const entry of syncResult.collections) {
                stateByCollection.set(entry.collection, entry.state);
            }
            const failedCollections = collections.filter((collection) => {
                const state = stateByCollection.get(collection);
                return !state || !WA_APP_STATE_MUTATION_FLUSH_SUCCESS_STATES.has(state);
            });
            if (failedCollections.length === 0) {
                this.logger.debug('app-state mutation flush completed', {
                    pending: batch.length
                });
                continue;
            }
            this.requeueMutations(batch.filter((mutation) => failedCollections.includes(mutation.collection)));
            const error = new Error(`app-state mutation flush incomplete (${failedCollections.join(',')})`);
            this.logger.warn('app-state mutation flush incomplete', {
                pending: batch.length,
                actions: this.describeMutationActions(batch),
                failedCollections: failedCollections.join(','),
                message: error.message
            });
            throw error;
        }
    }
    requeueMutations(mutations) {
        if (mutations.length === 0) {
            return;
        }
        const existing = [...this.pendingMutations.values()];
        this.pendingMutations.clear();
        for (const mutation of mutations) {
            this.enqueueMutation(mutation);
        }
        for (const mutation of existing) {
            this.enqueueMutation(mutation);
        }
    }
    /**
     * Sets the account-wide status-broadcast distribution policy. `mode`
     * accepts either the proto enum number or its string name; allow/deny
     * lists are provided via `userJids`.
     */
    async setStatusPrivacy(input) {
        const modeValue = typeof input.mode === 'number'
            ? input.mode
            : _proto_1.proto.SyncActionValue.StatusPrivacyAction.StatusDistributionMode[input.mode];
        if (typeof modeValue !== 'number' || !Number.isInteger(modeValue)) {
            throw new Error(`setStatusPrivacy: invalid mode ${String(input.mode)}`);
        }
        const userJid = input.userJids ? [...input.userJids] : [];
        const value = {
            statusPrivacy: {
                mode: modeValue,
                userJid,
                ...(input.shareToFB === undefined ? {} : { shareToFb: input.shareToFB }),
                ...(input.shareToIG === undefined ? {} : { shareToIg: input.shareToIG })
            }
        };
        const timestamp = this.serverClock.nowMs();
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.StatusPrivacy,
                indexArgs: {},
                value,
                timestamp
            })
        ]);
    }
    /** Mutes/unmutes a single user's status broadcasts. Rejects group/broadcast JIDs. */
    async setUserStatusMute(jid, muted) {
        const indexJid = this.normalizeChatMutationJid(jid);
        if ((0, jid_1.isGroupOrBroadcastJid)(indexJid)) {
            throw new Error(`setUserStatusMute requires a user jid, got ${jid}`);
        }
        const timestamp = this.serverClock.nowMs();
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.UserStatusMute,
                indexArgs: { id: indexJid },
                value: { userStatusMuteAction: { muted } },
                timestamp
            })
        ]);
    }
    /** Creates or updates the broadcast list identified by `input.id`. */
    async setBroadcastList(input) {
        const participants = input.participants.map((entry) => ({
            lidJid: entry.lidJid,
            ...(entry.pnJid === undefined ? {} : { pnJid: entry.pnJid })
        }));
        const value = {
            businessBroadcastListAction: {
                participants,
                listName: input.listName,
                labelIds: input.labelIds ? [...input.labelIds] : []
            }
        };
        const timestamp = this.serverClock.nowMs();
        await this.enqueueAndFlush([
            buildSetMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.BusinessBroadcastList,
                indexArgs: { id: input.id },
                value,
                timestamp
            })
        ]);
    }
    /** Deletes the broadcast list identified by `id`. */
    async removeBroadcastList(id) {
        const timestamp = this.serverClock.nowMs();
        await this.enqueueAndFlush([
            buildRemoveMutationFromSchema({
                schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.BusinessBroadcastList,
                indexArgs: { id },
                timestamp
            })
        ]);
    }
    /**
     * Applies a `set` mutation against any registered app-state schema. This
     * is the way to reach schemas that don't have a typed helper on this
     * coordinator (Contact, LabelEdit, LabelJid, QuickReply, AiThreadPin,
     * Favorites, Nux, ...). For the common chat actions there's a dedicated
     * method ({@link setChatMute}, {@link setChatRead}, {@link setMessageStar},
     * {@link setChatPin}, {@link setChatArchive}, etc.) – use those instead.
     *
     * `input` is flat – pick a `schema` name from {@link WA_APPSTATE_SCHEMAS},
     * fill the index fields (`id`, `chatJid`, `labelId`, ...) and the value
     * fields side-by-side, and the coordinator routes them to the right
     * SyncActionValue subfield.
     *
     * @example
     * ```ts
     * // Add a contact to the address book
     * await client.chat.set({
     *     schema: 'Contact',
     *     id: '5511999999999@s.whatsapp.net',
     *     contactAction: { fullName: 'Maria Silva', firstName: 'Maria' }
     * })
     *
     * // Create a chat label (color is a server-side palette index)
     * await client.chat.set({
     *     schema: 'LabelEdit',
     *     id: 'label-1',
     *     labelEditAction: { name: 'Pendente', color: 0, isActive: true }
     * })
     *
     * // Apply that label to a chat
     * await client.chat.set({
     *     schema: 'LabelJid',
     *     labelId: 'label-1',
     *     chatJid: '5511999999999@s.whatsapp.net',
     *     labelAssociationAction: { labeled: true }
     * })
     *
     * // Save a business quick reply
     * await client.chat.set({
     *     schema: 'QuickReply',
     *     id: 'qr-greeting',
     *     quickReplyAction: { shortcut: '/oi', message: 'Olá! Tudo bem?' }
     * })
     * ```
     */
    async set(input) {
        const resolved = _appstate_spec_1.WA_APPSTATE_SCHEMAS[input.schema];
        const { indexArgs, data } = splitFlatInput(resolved, input);
        const value = wrapData(resolved, data);
        const timestamp = this.serverClock.nowMs();
        const mutation = buildSetMutationFromSchema({
            schema: resolved,
            indexArgs: indexArgs,
            value,
            timestamp
        });
        await this.enqueueAndFlush([mutation]);
    }
    /**
     * Applies a `remove` mutation against any registered app-state schema  -
     * same shape as {@link set} but without the value fields (only the schema
     * name + index args). Use this for schemas without a typed helper.
     *
     * @example
     * ```ts
     * // Drop a contact from the address book
     * await client.chat.remove({
     *     schema: 'Contact',
     *     id: '5511999999999@s.whatsapp.net'
     * })
     *
     * // Remove a label from a chat (the label itself stays – use LabelEdit
     * // with `deleted: true` to delete the label definition entirely)
     * await client.chat.remove({
     *     schema: 'LabelJid',
     *     labelId: 'label-1',
     *     chatJid: '5511999999999@s.whatsapp.net'
     * })
     *
     * // Delete a quick reply
     * await client.chat.remove({
     *     schema: 'QuickReply',
     *     id: 'qr-greeting'
     * })
     * ```
     */
    async remove(input) {
        const resolved = _appstate_spec_1.WA_APPSTATE_SCHEMAS[input.schema];
        const { indexArgs } = splitFlatInput(resolved, input);
        const timestamp = this.serverClock.nowMs();
        const mutation = buildRemoveMutationFromSchema({
            schema: resolved,
            indexArgs: indexArgs,
            timestamp
        });
        await this.enqueueAndFlush([mutation]);
    }
    async createArchiveMutation(chatIndexJid, archived, timestamp) {
        const messageRange = await this.buildChatMessageRange(chatIndexJid);
        return buildSetMutationFromSchema({
            schema: _appstate_spec_1.WA_APPSTATE_SCHEMAS.Archive,
            indexArgs: { chatJid: chatIndexJid },
            value: { archiveChatAction: { archived, messageRange } },
            timestamp
        });
    }
    async buildChatMessageRange(chatIndexJid) {
        const records = await this.messageStore.listByThread(chatIndexJid, this.archiveRangeLimit);
        const messages = [];
        let lastMessageTimestamp;
        let skippedMissingGroupParticipant = 0;
        for (const record of records) {
            const timestampSeconds = this.toOptionalTimestampSeconds(record.timestampMs);
            const message = this.toChatMessageRangeMessage(record, chatIndexJid, timestampSeconds);
            if (!message) {
                skippedMissingGroupParticipant += 1;
                continue;
            }
            if (timestampSeconds !== undefined &&
                (lastMessageTimestamp === undefined || timestampSeconds > lastMessageTimestamp)) {
                lastMessageTimestamp = timestampSeconds;
            }
            messages.push(message);
        }
        if (skippedMissingGroupParticipant > 0) {
            this.logger.debug('app-state message range skipped invalid group messages', {
                chatJid: chatIndexJid,
                skippedMissingGroupParticipant
            });
        }
        return {
            ...(lastMessageTimestamp === undefined ? {} : { lastMessageTimestamp }),
            messages
        };
    }
    toChatMessageRangeMessage(record, chatIndexJid, timestampSeconds) {
        const key = {
            remoteJid: chatIndexJid,
            fromMe: record.fromMe,
            id: record.id
        };
        if ((0, jid_1.isGroupJid)(chatIndexJid) && !record.fromMe) {
            const participant = record.participantJid ?? record.senderJid;
            if (!participant) {
                return null;
            }
            key.participant = this.normalizeMessageRangeParticipant(participant);
        }
        return {
            key,
            ...(timestampSeconds === undefined ? {} : { timestamp: timestampSeconds })
        };
    }
    normalizeMessageRangeParticipant(participantJid) {
        const normalized = (0, jid_1.normalizeRecipientJid)(participantJid);
        if ((0, jid_1.isGroupOrBroadcastJid)(normalized)) {
            throw new Error(`invalid group/broadcast participant in message range: ${participantJid}`);
        }
        return (0, jid_1.normalizeDeviceJid)(normalized);
    }
    toOptionalTimestampSeconds(timestampMs) {
        if (timestampMs === undefined) {
            return undefined;
        }
        if (!Number.isFinite(timestampMs) ||
            !Number.isSafeInteger(timestampMs) ||
            timestampMs < 0) {
            return undefined;
        }
        return Math.floor(timestampMs / 1000);
    }
    normalizeChatMutationJid(chatJid) {
        const normalized = (0, jid_1.normalizeRecipientJid)(chatJid);
        if ((0, jid_1.isGroupOrBroadcastJid)(normalized)) {
            return normalized;
        }
        return (0, jid_1.toUserJid)(normalized);
    }
    buildMessageMutationIndex(message) {
        const chatIndexJid = this.normalizeChatMutationJid(message.chatJid);
        const messageId = message.id.trim();
        if (messageId.length === 0) {
            throw new Error('message id cannot be empty');
        }
        const fromMe = message.fromMe === true;
        const participant = this.resolveMessageMutationParticipant(chatIndexJid, fromMe, message.participantJid);
        return {
            remote: chatIndexJid,
            id: messageId,
            fromMe,
            participant
        };
    }
    resolveMessageMutationParticipant(chatIndexJid, fromMe, participantJid) {
        if (fromMe || !(0, jid_1.isGroupOrBroadcastJid)(chatIndexJid)) {
            return '0';
        }
        if (!participantJid) {
            throw new Error('participantJid is required for incoming message mutations in group/broadcast chats');
        }
        const normalized = (0, jid_1.normalizeRecipientJid)(participantJid);
        if ((0, jid_1.isGroupOrBroadcastJid)(normalized)) {
            throw new Error(`invalid participantJid for message mutation: ${participantJid}`);
        }
        return (0, jid_1.normalizeDeviceJid)(normalized);
    }
    describeMutationActions(mutations) {
        return mutations
            .map((mutation) => {
            try {
                const parsed = JSON.parse(mutation.index);
                if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                    return `${mutation.collection}:${parsed[0]}`;
                }
            }
            catch (error) {
                void error;
            }
            return `${mutation.collection}:unknown`;
        })
            .join(',');
    }
}
exports.WaAppStateMutationCoordinator = WaAppStateMutationCoordinator;
