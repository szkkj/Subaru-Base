import type { WaAbPropName } from '../../abprops-spec';
import type { WriteBehindPersistence } from '../persistence/WriteBehindPersistence';
import type { WaClientEventMap } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import { type Proto } from '../../proto';
export interface WaGroupHistoryBundleInput {
    /** The `messageHistoryBundle` payload carried by the incoming message. */
    readonly bundle: Proto.Message.IMessageHistoryBundle;
    /** Group the bundle was shared in - the `remoteJid` of the carrier message. */
    readonly groupJid: string;
    /** Member who shared the history (carrier message `participant`). */
    readonly senderJid?: string;
    /** Stanza id of the carrier message. */
    readonly bundleMessageId?: string;
    /** Carrier message `t` attr, in seconds - drives the bundle expiry check. */
    readonly sentAtSeconds?: number;
}
export interface WaGroupHistoryDeps {
    readonly logger: Logger;
    readonly mediaTransfer: WaMediaTransferClient;
    readonly writeBehind: WriteBehindPersistence;
    readonly emitEvent: <K extends keyof WaClientEventMap>(event: K, ...args: Parameters<WaClientEventMap[K]>) => void;
    readonly meJid?: string | null;
    readonly meLid?: string | null;
    readonly getAbPropNumber: (name: WaAbPropName) => number;
}
export declare function runGroupHistoryBundle(deps: WaGroupHistoryDeps, input: WaGroupHistoryBundleInput): Promise<void>;
export declare function processGroupHistoryBundle(deps: WaGroupHistoryDeps, input: WaGroupHistoryBundleInput): Promise<void>;
