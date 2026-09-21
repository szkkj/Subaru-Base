import type { BinaryNode } from '../../transport/types';
export { buildMissingPreKeysFetchIq, buildPreKeyUploadIq, buildSignedPreKeyRotateIq } from '../../transport/node/builders/prekeys';
/**
 * Extracts the numeric error code and text from a failed `prekey` upload IQ
 * response. Use after a non-success status to decide whether to retry.
 */
export declare function parsePreKeyUploadFailure(node: BinaryNode): {
    readonly errorCode?: number;
    readonly errorText: string;
};
