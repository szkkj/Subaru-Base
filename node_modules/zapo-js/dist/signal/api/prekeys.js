"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSignedPreKeyRotateIq = exports.buildPreKeyUploadIq = exports.buildMissingPreKeysFetchIq = void 0;
exports.parsePreKeyUploadFailure = parsePreKeyUploadFailure;
const query_1 = require("../../transport/node/query");
var prekeys_1 = require("../../transport/node/builders/prekeys");
Object.defineProperty(exports, "buildMissingPreKeysFetchIq", { enumerable: true, get: function () { return prekeys_1.buildMissingPreKeysFetchIq; } });
Object.defineProperty(exports, "buildPreKeyUploadIq", { enumerable: true, get: function () { return prekeys_1.buildPreKeyUploadIq; } });
Object.defineProperty(exports, "buildSignedPreKeyRotateIq", { enumerable: true, get: function () { return prekeys_1.buildSignedPreKeyRotateIq; } });
/**
 * Extracts the numeric error code and text from a failed `prekey` upload IQ
 * response. Use after a non-success status to decide whether to retry.
 */
function parsePreKeyUploadFailure(node) {
    const error = (0, query_1.parseIqError)(node);
    return {
        ...(error.numericCode !== undefined ? { errorCode: error.numericCode } : {}),
        errorText: error.text
    };
}
