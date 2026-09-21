import type { WaAuthCredentials } from '../types';
import type { Logger } from '../../infra/log/types';
export declare class WaQrFlow {
    private readonly logger;
    private readonly getCredentials;
    private readonly getDevicePlatform;
    private readonly emitQr;
    private qrRefs;
    private qrRefIndex;
    private currentQrTimer;
    constructor(args: {
        readonly logger: Logger;
        readonly getCredentials: () => WaAuthCredentials | null;
        readonly getDevicePlatform: () => string;
        readonly emitQr: (qr: string, ttlMs: number) => void;
    });
    hasQr(): boolean;
    clear(): void;
    refreshCurrentQr(): boolean;
    setRefs(refs: readonly string[]): void;
    private rotateRef;
    private buildQr;
}
