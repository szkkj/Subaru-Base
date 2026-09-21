import type { WaGroupEvent } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaGroupMetadataStore } from '../../store/contracts/group-metadata.store';
export type GroupMetadataQueryResult = {
    readonly participants: readonly string[];
    readonly ephemeral?: number;
    readonly ephemeralTrigger?: number;
};
/** Disappearing-message settings a group reports, as sent on outgoing messages. */
export type GroupEphemeralSettings = {
    readonly expirationSeconds: number;
    readonly trigger?: number;
};
export type GroupMetadataCache = {
    resolveParticipantUsers(groupJid: string): Promise<readonly string[]>;
    refreshParticipantUsers(groupJid: string): Promise<readonly string[]>;
    getEphemeral(groupJid: string): Promise<number | null>;
    resolveEphemeral(groupJid: string): Promise<number | null>;
    /**
     * Expiration plus the group's `disappearingMode` trigger in one read, or
     * `null` when the group is not ephemeral. Refreshes a cold cache like
     * {@link resolveEphemeral} does.
     */
    resolveEphemeralSettings(groupJid: string): Promise<GroupEphemeralSettings | null>;
    mutateFromGroupEvent(event: WaGroupEvent): Promise<void>;
};
export declare function createGroupMetadataCache(options: {
    readonly groupMetadataStore: WaGroupMetadataStore;
    readonly queryGroupMetadata: (groupJid: string) => Promise<GroupMetadataQueryResult>;
    readonly logger: Logger;
}): GroupMetadataCache;
