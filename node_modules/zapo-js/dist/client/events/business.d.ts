import type { WaBusinessEvent, WaBusinessProfileResult, WaIncomingUnhandledStanzaEvent, WaVerifiedNameResult } from '../types';
import type { BinaryNode } from '../../transport/types';
interface WaParseBusinessNotificationResult {
    readonly events: readonly WaBusinessEvent[];
    readonly unhandled: readonly WaIncomingUnhandledStanzaEvent[];
}
export declare function parseVerifiedNameNode(node: BinaryNode): WaVerifiedNameResult | null;
export declare function parseBusinessProfileNode(node: BinaryNode): WaBusinessProfileResult | null;
export declare function parseBusinessNotificationEvents(notificationNode: BinaryNode): WaParseBusinessNotificationResult;
export {};
