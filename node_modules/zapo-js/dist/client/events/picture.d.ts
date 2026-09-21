import type { WaIncomingUnhandledStanzaEvent, WaPictureEvent } from '../types';
import type { BinaryNode } from '../../transport/types';
interface WaParsePictureNotificationResult {
    readonly events: readonly WaPictureEvent[];
    readonly unhandled: readonly WaIncomingUnhandledStanzaEvent[];
}
export declare function parsePictureNotificationEvents(node: BinaryNode): WaParsePictureNotificationResult;
export {};
