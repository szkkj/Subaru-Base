import type { BinaryNode } from '../types';
/** Encodes a {@link BinaryNode} into its raw WhatsApp binary representation. */
export declare function encodeBinaryNode(node: BinaryNode): Uint8Array;
/**
 * Encodes a {@link BinaryNode} as a transport stanza – prefixes the bytes
 * with the 1-byte flag (`0x00`) the WebSocket framing expects.
 */
export declare function encodeBinaryNodeStanza(node: BinaryNode): Uint8Array;
