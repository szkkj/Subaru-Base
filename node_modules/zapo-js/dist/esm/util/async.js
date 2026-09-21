/**
 * Returns a Promise that resolves after `ms` milliseconds. Thin wrapper over
 * `setTimeout` for use in `await` chains.
 */
export function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
