"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
/**
 * Returns a Promise that resolves after `ms` milliseconds. Thin wrapper over
 * `setTimeout` for use in `await` chains.
 */
function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
