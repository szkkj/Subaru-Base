import type { WaSuccessPersistAttributes } from '../../auth/types';
import type { BinaryNode } from '../types';
export type WaStreamControlNodeResult = {
    readonly kind: 'xmlstreamend';
} | {
    readonly kind: 'stream_error_code';
    readonly code: number;
} | {
    readonly kind: 'stream_error_replaced';
} | {
    readonly kind: 'stream_error_device_removed';
} | {
    readonly kind: 'stream_error_ack';
    readonly id?: string;
} | {
    readonly kind: 'stream_error_xml_not_well_formed';
} | {
    readonly kind: 'stream_error_other';
};
export declare function parseStreamControlNode(node: BinaryNode): WaStreamControlNodeResult | null;
export declare function parseCompanionEncStatic(value: string | undefined, onError?: (error: Error) => void): Uint8Array | undefined;
export declare function parseSuccessPersistAttributes(node: BinaryNode, onCompanionParseError?: (error: Error) => void): WaSuccessPersistAttributes;
