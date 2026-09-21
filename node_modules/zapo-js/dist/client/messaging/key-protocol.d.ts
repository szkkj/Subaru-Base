import type { WaAppStateSyncKey } from '../../appstate/types';
import type { WaAuthCredentials } from '../../auth/types';
import type { DeviceFanoutResolver } from '../messaging/fanout';
import type { Logger } from '../../infra/log/types';
import type { WaMessagePublishResult } from '../../message/types';
import { type Proto } from '../../proto';
export type PublishProtocolMessageToDeviceFn = (deviceJid: string, protocolMessage: Proto.Message.IProtocolMessage, options?: {
    readonly id?: string;
    readonly pushPriority?: 'high' | 'high_force';
}) => Promise<WaMessagePublishResult>;
export type AppStateSyncKeyProtocol = {
    requestKeys(keyIds: readonly Uint8Array[]): Promise<readonly string[]>;
    sendKeyShare(toDeviceJid: string, keys: readonly WaAppStateSyncKey[], missingKeyIds?: readonly Uint8Array[]): Promise<void>;
};
export declare function createAppStateSyncKeyProtocol(options: {
    readonly publishProtocolMessageToDevice: PublishProtocolMessageToDeviceFn;
    readonly fanoutResolver: DeviceFanoutResolver;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    readonly logger: Logger;
}): AppStateSyncKeyProtocol;
