/** A companion device this primary has linked. */
export interface CompanionRecord {
    readonly deviceJid: string;
    readonly keyIndex: number;
    readonly companionIdentityPublicKey: Uint8Array;
    readonly addedAtSeconds: number;
}
/**
 * The primary's ADV epoch state. `rawId` is the account's stable ADV identity
 * id; `currentKeyIndex` is the last-issued companion key index (companions get
 * `currentKeyIndex + 1`). This MUST persist across restarts, otherwise reissuing
 * an already-used key index breaks previously linked devices.
 */
export interface CompanionHostEpochState {
    readonly rawId: number;
    readonly currentKeyIndex: number;
    readonly companions: readonly CompanionRecord[];
}
/**
 * Persistence hook for {@link CompanionHostEpochState}. Supply one via plugin
 * options to survive restarts; without it the epoch is in-memory only (fine for
 * a single-session smoke test, unsafe for production relinking).
 */
export interface CompanionHostPersistence {
    readonly load: () => Promise<CompanionHostEpochState | null> | CompanionHostEpochState | null;
    readonly save: (state: CompanionHostEpochState) => Promise<void> | void;
}
/**
 * File-backed {@link CompanionHostPersistence}: stores the ADV epoch as JSON at
 * `filePath` (the companion identity keys are base64-encoded). Zero native
 * dependencies - the state is tiny (the epoch header plus the linked-companion
 * list). For a database-backed store, implement the two-method
 * `CompanionHostPersistence` contract directly against your DB; there is no need
 * for a dedicated core store domain.
 */
export declare function createFileCompanionHostPersistence(filePath: string): CompanionHostPersistence;
