import type { AppStateCollectionName, AppStateCollectionState } from '../types';
import { type Proto } from '../../proto';
import type { BinaryNode } from '../../transport/types';
export interface CollectionResponsePayload {
    readonly collection: AppStateCollectionName;
    readonly state: AppStateCollectionState;
    readonly version?: number;
    readonly patches: readonly Proto.ISyncdPatch[];
    readonly snapshotReference?: Proto.IExternalBlobReference;
}
/**
 * Parses an app-state `sync` IQ response into one payload per collection,
 * decoding embedded patches and snapshot references. Throws when the IQ is
 * an error envelope or missing the `<sync>` child.
 */
export declare function parseSyncResponse(iqNode: BinaryNode): readonly CollectionResponsePayload[];
/**
 * Reads a `<collection>` node and returns the right
 * {@link AppStateCollectionState} (success / has-more / conflict / fatal /
 * retryable) based on its `type` attribute and embedded error code.
 */
export declare function parseCollectionState(node: BinaryNode): AppStateCollectionState;
