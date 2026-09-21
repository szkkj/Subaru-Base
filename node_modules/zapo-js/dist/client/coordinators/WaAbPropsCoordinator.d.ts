import { type WaAbPropName, type WaAbPropValue } from '../../abprops-spec';
import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../../transport/types';
type WaAbPropsRuntime = {
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
};
export declare class WaAbPropsCoordinator {
    private readonly logger;
    private readonly runtime;
    private readonly cache;
    private readonly syncState;
    private syncPromise;
    private syncEpoch;
    private pendingSync;
    constructor(options: {
        readonly logger: Logger;
        readonly runtime: WaAbPropsRuntime;
    });
    getConfigValue<T extends WaAbPropValue>(name: WaAbPropName): T;
    sync(): void;
    reset(): void;
    private startSync;
    private executeSyncWithRetry;
    private executeSync;
}
export {};
