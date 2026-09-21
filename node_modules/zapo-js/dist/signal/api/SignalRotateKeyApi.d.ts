import type { Logger } from '../../infra/log/types';
import type { WaSignalStore } from '../../store/contracts/signal.store';
import type { BinaryNode } from '../../transport/types';
interface SignalRotateKeyApiOptions {
    readonly logger: Logger;
    readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly signalStore: WaSignalStore;
    readonly defaultTimeoutMs?: number;
}
/**
 * Generates a fresh signed prekey and uploads it to the server. Handles the
 * `406`/`409`/`5xx` error codes by signaling whether a digest re-validation
 * is required.
 */
export declare class SignalRotateKeyApi {
    private readonly logger;
    private readonly query;
    private readonly signalStore;
    private readonly defaultTimeoutMs;
    constructor(options: SignalRotateKeyApiOptions);
    /**
     * Rotates the signed prekey by generating a new one (next key id) and
     * uploading it. Returns `shouldDigestKey: true` when the caller should
     * re-run a digest validation after the rotation.
     */
    rotateSignedPreKey(timeoutMs?: number): Promise<{
        shouldDigestKey: boolean;
        errorCode?: number;
    }>;
}
export {};
