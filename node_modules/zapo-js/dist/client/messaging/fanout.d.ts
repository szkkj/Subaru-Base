import type { WaAuthCredentials } from '../../auth/types';
import type { Logger } from '../../infra/log/types';
import type { SignalDeviceSyncApi } from '../../signal/api/SignalDeviceSyncApi';
export type DeviceFanoutResolver = {
    resolveDirectFanoutDeviceJids(recipientJid: string, selfDeviceJid: string): Promise<readonly string[]>;
    resolveGroupParticipantDeviceJids(participantUserJids: readonly string[]): Promise<readonly string[]>;
    resolveOwnPeerDeviceJids(): Promise<readonly string[]>;
    resolveSelfDeviceJidForRecipient(recipientJid: string, meJid: string, meLid: string | null | undefined): string;
};
export declare function createDeviceFanoutResolver(options: {
    readonly signalDeviceSync: SignalDeviceSyncApi;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    readonly logger: Logger;
}): DeviceFanoutResolver;
