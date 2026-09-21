import type { Logger } from '../../infra/log/types';
import type { WaConnectionCode, WaConnectionOpenReason, WaDisconnectReason } from '../../protocol/stream';
import type { WaStreamControlNodeResult } from '../../transport/stream/parse';
import type { WaComms } from '../../transport/WaComms';
interface WaStreamControlCoordinatorOptions {
    readonly logger: Logger;
    readonly getComms: () => WaComms | null;
    readonly clearPendingQueries: (error: Error) => void;
    readonly clearMediaConnCache: () => void;
    readonly disconnect: (reason: WaDisconnectReason, isLogout: boolean, code: WaConnectionCode | null) => Promise<void>;
    readonly clearStoredCredentials: () => Promise<void>;
    readonly connect: (reason: WaConnectionOpenReason) => Promise<void>;
}
export interface WaStreamControlHandler {
    readonly handleStreamControlResult: (result: WaStreamControlNodeResult) => Promise<void>;
}
export declare function createStreamControlHandler(options: WaStreamControlCoordinatorOptions): WaStreamControlHandler;
export {};
