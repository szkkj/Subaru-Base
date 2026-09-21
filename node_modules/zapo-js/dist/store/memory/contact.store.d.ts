import type { WaContactStore as Contract, WaStoredContactRecord } from '../contracts/contact.store';
export interface WaContactMemoryStoreOptions {
    readonly maxContacts?: number;
}
export declare class WaContactMemoryStore implements Contract {
    private readonly contacts;
    /** Secondary index: phone_number -> primary jid (typically the LID form). */
    private readonly phoneIndex;
    private readonly maxContacts;
    constructor(options?: WaContactMemoryStoreOptions);
    private writeRecord;
    upsert(record: WaStoredContactRecord): Promise<void>;
    upsertBatch(records: readonly WaStoredContactRecord[]): Promise<void>;
    getByJid(jid: string): Promise<WaStoredContactRecord | null>;
    getByPhoneNumber(pn: string): Promise<WaStoredContactRecord | null>;
    private getByPhoneNumberSync;
    deleteByJid(jid: string): Promise<number>;
    clear(): Promise<void>;
}
