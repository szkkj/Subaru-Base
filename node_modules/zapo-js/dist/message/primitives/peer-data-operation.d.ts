import type { WaAuthCredentials } from '../../auth/types';
import type { PublishProtocolMessageToDeviceFn } from '../../client/messaging/key-protocol';
import type { WaIncomingProtocolMessageEvent } from '../../client/types';
import type { Logger } from '../../infra/log/types';
import { type Proto } from '../../proto';
export interface PeerDataOperationRequesterOptions {
    readonly logger: Logger;
    readonly publishProtocolMessageToDevice: PublishProtocolMessageToDeviceFn;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    readonly generateOutgoingMessageId: () => Promise<string>;
    readonly subscribeToProtocolMessage: (handler: (event: WaIncomingProtocolMessageEvent) => void) => () => void;
    readonly defaultTimeoutMs?: number;
    readonly maxPending?: number;
}
export interface PeerDataOperationRequester {
    readonly request: (type: Proto.Message.PeerDataOperationRequestType, body: Proto.Message.IPeerDataOperationRequestMessage, options?: {
        readonly timeoutMs?: number;
    }) => Promise<readonly Proto.Message.PeerDataOperationRequestResponseMessage.IPeerDataOperationResult[]>;
    readonly send: (type: Proto.Message.PeerDataOperationRequestType, body: Proto.Message.IPeerDataOperationRequestMessage) => Promise<{
        readonly messageId: string;
    }>;
}
export declare function createPeerDataOperationRequester(options: PeerDataOperationRequesterOptions): PeerDataOperationRequester;
