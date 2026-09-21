import { isUserJid } from '../../protocol/jid.js';
import { resolvePositive } from '../../util/coercion.js';
import { setBoundedMapEntry } from '../../util/collections.js';
const DEFAULT_CONTACT_MEMORY_STORE_LIMITS = Object.freeze({
    contacts: 20000
});
function mergeContactRecords(previous, incoming) {
    if (!previous)
        return incoming;
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
export class WaContactMemoryStore {
    constructor(options = {}) {
        this.contacts = new Map();
        /** Secondary index: phone_number -> primary jid (typically the LID form). */
        this.phoneIndex = new Map();
        this.maxContacts = resolvePositive(options.maxContacts, DEFAULT_CONTACT_MEMORY_STORE_LIMITS.contacts, 'WaContactMemoryStoreOptions.maxContacts');
    }
    writeRecord(record) {
        const previous = this.contacts.get(record.jid);
        const merged = mergeContactRecords(previous, record);
        setBoundedMapEntry(this.contacts, merged.jid, merged, this.maxContacts);
        if (previous?.phoneNumber &&
            previous.phoneNumber !== merged.phoneNumber &&
            this.phoneIndex.get(previous.phoneNumber) === merged.jid) {
            this.phoneIndex.delete(previous.phoneNumber);
        }
        if (merged.phoneNumber) {
            this.phoneIndex.set(merged.phoneNumber, merged.jid);
        }
    }
    async upsert(record) {
        this.writeRecord(record);
    }
    async upsertBatch(records) {
        for (const record of records) {
            this.writeRecord(record);
        }
    }
    async getByJid(jid) {
        const direct = this.contacts.get(jid);
        if (direct)
            return direct;
        if (isUserJid(jid)) {
            return this.getByPhoneNumberSync(jid);
        }
        return null;
    }
    async getByPhoneNumber(pn) {
        return this.getByPhoneNumberSync(pn);
    }
    getByPhoneNumberSync(pn) {
        const jid = this.phoneIndex.get(pn);
        if (!jid)
            return null;
        return this.contacts.get(jid) ?? null;
    }
    async deleteByJid(jid) {
        const existing = this.contacts.get(jid);
        if (!existing)
            return 0;
        this.contacts.delete(jid);
        if (existing.phoneNumber && this.phoneIndex.get(existing.phoneNumber) === jid) {
            this.phoneIndex.delete(existing.phoneNumber);
        }
        return 1;
    }
    async clear() {
        this.contacts.clear();
        this.phoneIndex.clear();
    }
}
