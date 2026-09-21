import type { WaRetryKeyBundle } from '../../../retry/types';
import type { BinaryNode } from '../../types';
export declare function buildRetryReceiptNode(input: {
    readonly stanzaId: string;
    readonly to: string;
    readonly participant?: string;
    readonly recipient?: string;
    readonly originalMsgId: string;
    readonly retryCount: number;
    readonly t: string;
    readonly registrationId: number;
    readonly error?: number;
    readonly categoryPeer?: boolean;
    readonly keys?: WaRetryKeyBundle;
}): BinaryNode;
