import type { BinaryNode } from '../../types';
export declare function buildAccountDevicesSyncIq(userJids: readonly string[], sid: string): BinaryNode;
export declare function buildAccountPictureSyncIq(meJid: string): BinaryNode;
export declare function buildAccountBlocklistSyncIq(): BinaryNode;
export declare function buildListParticipatingGroupsIq(): BinaryNode;
export declare function buildNewsletterMetadataSyncIq(): BinaryNode;
export declare function buildClearDirtyBitsIq(dirtyBits: readonly {
    readonly type: string;
    readonly timestamp: number;
}[]): BinaryNode;
