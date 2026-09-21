import type { BinaryNode } from '../types';
/** Decodes raw WhatsApp binary node bytes into a {@link BinaryNode}. */
export declare function decodeBinaryNode(data: Uint8Array): BinaryNode;
/**
 * Decodes a framed stanza: reads the 1-byte flag, inflates the body when the
 * `0x02` compression bit is set, then parses the result as a {@link BinaryNode}.
 */
export declare function decodeBinaryNodeStanza(stanza: Uint8Array): Promise<BinaryNode>;
