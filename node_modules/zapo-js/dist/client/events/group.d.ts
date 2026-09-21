import type { WaGroupEvent, WaGroupEventParticipant, WaIncomingUnhandledStanzaEvent } from '../types';
import type { BinaryNode } from '../../transport/types';
interface WaParseGroupNotificationResult {
    readonly events: readonly WaGroupEvent[];
    readonly unhandled: readonly WaIncomingUnhandledStanzaEvent[];
}
export declare function parseParticipants(node: BinaryNode): readonly WaGroupEventParticipant[];
export declare function parseGroupNotificationEvents(notificationNode: BinaryNode): WaParseGroupNotificationResult;
export {};
