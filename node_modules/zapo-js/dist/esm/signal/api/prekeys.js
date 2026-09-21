import { parseIqError } from '../../transport/node/query.js';
export { buildMissingPreKeysFetchIq, buildPreKeyUploadIq, buildSignedPreKeyRotateIq } from '../../transport/node/builders/prekeys.js';
/**
 * Extracts the numeric error code and text from a failed `prekey` upload IQ
 * response. Use after a non-success status to decide whether to retry.
 */
export function parsePreKeyUploadFailure(node) {
    const error = parseIqError(node);
    return {
        ...(error.numericCode !== undefined ? { errorCode: error.numericCode } : {}),
        errorText: error.text
    };
}
