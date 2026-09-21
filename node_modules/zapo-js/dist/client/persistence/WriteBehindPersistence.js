"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteBehindPersistence = void 0;
const BackgroundQueue_1 = require("../../infra/perf/BackgroundQueue");
const primitives_1 = require("../../util/primitives");
function mergeThread(previous, incoming) {
    return {
        jid: incoming.jid,
        name: incoming.name ?? previous.name,
        unreadCount: incoming.unreadCount ?? previous.unreadCount,
        archived: incoming.archived ?? previous.archived,
        pinned: incoming.pinned ?? previous.pinned,
        muteEndMs: incoming.muteEndMs ?? previous.muteEndMs,
        markedAsUnread: incoming.markedAsUnread ?? previous.markedAsUnread,
        ephemeralExpiration: incoming.ephemeralExpiration ?? previous.ephemeralExpiration,
        ephemeralSettingTimestamp: incoming.ephemeralSettingTimestamp ?? previous.ephemeralSettingTimestamp
    };
}
function mergeContact(previous, incoming) {
    return {
        jid: incoming.jid,
        displayName: incoming.displayName ?? previous.displayName,
        pushName: incoming.pushName ?? previous.pushName,
        lid: incoming.lid ?? previous.lid,
        phoneNumber: incoming.phoneNumber ?? previous.phoneNumber,
        username: incoming.username ?? previous.username,
        lastUpdatedMs: Math.max(previous.lastUpdatedMs, incoming.lastUpdatedMs)
    };
}
class WriteBehindPersistence {
    constructor(stores, logger, options = {}) {
        this.logger = logger;
        this.stores = stores;
        this.options = options;
        this.flushTimeoutMs = options.flushTimeoutMs ?? 5000;
        this.queues = this.buildQueues();
        this.destroyed = false;
    }
    buildQueues() {
        const stores = this.stores;
        const options = this.options;
        const queueOptions = (domain) => ({
            maxPendingKeys: options.maxPendingKeys ?? 4096,
            maxWriteConcurrency: options.maxWriteConcurrency ?? 4,
            flushTimeoutMs: this.flushTimeoutMs,
            onError: (key, error, attempt) => {
                this.logger.warn('write-behind error', {
                    domain,
                    key,
                    attempt,
                    message: (0, primitives_1.toError)(error).message
                });
            },
            onPressure: (pendingKeys) => {
                this.logger.warn('write-behind pressure', {
                    domain,
                    pendingKeys
                });
            },
            onDiscard: (key) => {
                this.logger.warn('write-behind discarded pending write', {
                    domain,
                    key
                });
            }
        });
        return {
            messages: new BackgroundQueue_1.BackgroundQueue((_key, value) => stores.messageStore.upsert(value), {
                ...queueOptions('messages'),
                batchWriter: (entries) => stores.messageStore.upsertBatch(entries.map((e) => e.value))
            }),
            threads: new BackgroundQueue_1.BackgroundQueue((_key, value) => stores.threadStore.upsert(value), {
                ...queueOptions('threads'),
                coalesce: (previous, incoming) => mergeThread(previous, incoming),
                batchWriter: (entries) => stores.threadStore.upsertBatch(entries.map((e) => e.value))
            }),
            contacts: new BackgroundQueue_1.BackgroundQueue((_key, value) => stores.contactStore.upsert(value), {
                ...queueOptions('contacts'),
                coalesce: (previous, incoming) => mergeContact(previous, incoming),
                batchWriter: (entries) => stores.contactStore.upsertBatch(entries.map((e) => e.value))
            })
        };
    }
    /**
     * Re-arm the queues after a previous {@link destroy} call. Idempotent —
     * a no-op when the persistence is already live. Used by `WaClient.connect`
     * to recover from a logout/clear-stored-state cycle without leaking the
     * old destroyed queues into the next session.
     */
    restart() {
        if (!this.destroyed) {
            return;
        }
        this.queues = this.buildQueues();
        this.destroyed = false;
    }
    persistMessage(record) {
        this.queues.messages.enqueue(`msg:${record.id}`, record);
    }
    persistMessageAsync(record) {
        return this.queues.messages.enqueueAsync(`msg:${record.id}`, record);
    }
    persistThread(record) {
        this.queues.threads.enqueue(`thread:${record.jid}`, record);
    }
    persistThreadAsync(record) {
        return this.queues.threads.enqueueAsync(`thread:${record.jid}`, record);
    }
    persistContact(record) {
        this.queues.contacts.enqueue(`contact:${record.jid}`, record);
    }
    persistContactAsync(record) {
        return this.queues.contacts.enqueueAsync(`contact:${record.jid}`, record);
    }
    async flush(timeoutMs = this.flushTimeoutMs) {
        const [messages, threads, contacts] = await Promise.all([
            this.queues.messages.flush(timeoutMs),
            this.queues.threads.flush(timeoutMs),
            this.queues.contacts.flush(timeoutMs)
        ]);
        const result = this.toDrainResult(messages, threads, contacts);
        if (result.remaining > 0) {
            this.logger.warn('write-behind flush finished with pending writes', {
                messagesRemaining: messages.remaining,
                threadsRemaining: threads.remaining,
                contactsRemaining: contacts.remaining
            });
        }
        return result;
    }
    async destroy(timeoutMs = this.flushTimeoutMs) {
        const [messages, threads, contacts] = await Promise.all([
            this.queues.messages.destroy(timeoutMs),
            this.queues.threads.destroy(timeoutMs),
            this.queues.contacts.destroy(timeoutMs)
        ]);
        this.destroyed = true;
        const result = this.toDrainResult(messages, threads, contacts);
        if (result.remaining > 0) {
            this.logger.warn('write-behind destroy finished with pending writes', {
                messagesRemaining: messages.remaining,
                threadsRemaining: threads.remaining,
                contactsRemaining: contacts.remaining
            });
        }
        return result;
    }
    toDrainResult(messages, threads, contacts) {
        return {
            messages,
            threads,
            contacts,
            flushed: messages.flushed + threads.flushed + contacts.flushed,
            remaining: messages.remaining + threads.remaining + contacts.remaining
        };
    }
}
exports.WriteBehindPersistence = WriteBehindPersistence;
