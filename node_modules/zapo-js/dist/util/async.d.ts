/**
 * Returns a Promise that resolves after `ms` milliseconds. Thin wrapper over
 * `setTimeout` for use in `await` chains.
 */
export declare function delay(ms: number): Promise<void>;
