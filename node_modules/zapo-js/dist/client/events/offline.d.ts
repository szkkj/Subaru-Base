import type { WaOfflineThreadMetadataEvent } from '../types';
import type { BinaryNode } from '../../transport/types';
/**
 * Parses the offline preview manifest out of an `<ib>` bulletin. Every child
 * is optional: a bare node yields an empty `threads` list.
 *
 * @param node - the `<thread_metadata>` node, not the enclosing `<ib>`
 */
export declare function parseOfflineThreadMetadata(node: BinaryNode): WaOfflineThreadMetadataEvent;
