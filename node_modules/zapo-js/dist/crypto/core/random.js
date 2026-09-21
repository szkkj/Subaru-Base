"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomBytesAsync = exports.randomIntAsync = void 0;
exports.randomFillAsync = randomFillAsync;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
/**
 * Cryptographically fills `target` (optionally a sub-range) with random bytes.
 * Resolves to the same `target` reference for chaining.
 */
async function randomFillAsync(target, offset, size) {
    await new Promise((resolve, reject) => {
        const onDone = (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        };
        if (offset === undefined) {
            (0, node_crypto_1.randomFill)(target, onDone);
            return;
        }
        if (size === undefined) {
            (0, node_crypto_1.randomFill)(target, offset, onDone);
            return;
        }
        (0, node_crypto_1.randomFill)(target, offset, size, onDone);
    });
    return target;
}
/** Returns a cryptographically secure integer in `[min, max)`. */
exports.randomIntAsync = (0, node_util_1.promisify)(node_crypto_1.randomInt);
/** Returns `size` cryptographically secure random bytes. */
exports.randomBytesAsync = (0, node_util_1.promisify)(node_crypto_1.randomBytes);
