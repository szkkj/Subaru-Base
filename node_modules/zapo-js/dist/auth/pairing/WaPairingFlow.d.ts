import type { WaAuthCredentials, WaAuthDangerousOptions } from '../types';
import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../../transport/types';
interface WaPairingFlowOptions {
    readonly logger: Logger;
    readonly auth: {
        readonly getCredentials: () => WaAuthCredentials | null;
        readonly updateCredentials: (credentials: WaAuthCredentials) => Promise<void>;
    };
    readonly socket: {
        readonly sendNode: (node: BinaryNode) => Promise<void>;
        readonly query: (node: BinaryNode, timeoutMs: number) => Promise<BinaryNode>;
    };
    readonly qrFlow: {
        readonly setRefs: (refs: readonly string[]) => void;
        readonly clear: () => void;
        readonly refreshCurrentQr: () => boolean;
    };
    readonly device: {
        readonly browser: string;
        readonly osDisplayName: string;
        readonly platform: string;
    };
    readonly callbacks: {
        readonly emitPairingCode: (code: string) => void;
        readonly emitPairingRefresh: (forceManual: boolean) => void;
        readonly emitPaired: (credentials: WaAuthCredentials) => void;
    };
    readonly dangerous?: WaAuthDangerousOptions;
}
export declare class WaPairingFlow {
    private readonly opts;
    private pairingSession;
    private pairSuccessInFlight;
    constructor(options: WaPairingFlowOptions);
    hasPairingSession(): boolean;
    clearSession(): void;
    requestPairingCode(phoneNumber: string, shouldShowPushNotification?: boolean, customCode?: string): Promise<string>;
    fetchPairingCountryCodeIso(): Promise<string>;
    handleIncomingIqSet(node: BinaryNode): Promise<boolean>;
    handleLinkCodeNotification(node: BinaryNode): Promise<boolean>;
    handleCompanionRegRefreshNotification(node: BinaryNode): Promise<boolean>;
    private handlePairDevice;
    private handlePairSuccess;
    private completePairSuccess;
    /** Returns `null` when the primary's account signature does not verify. */
    private buildPairSuccessResponseIdentity;
    /** Mirrors the `not-authorized` IQ error WhatsApp Web returns on a failed pair-success. */
    private sendPairSuccessValidationError;
    private handlePrimaryHello;
    private rotateAdvSecret;
    private requireCredentials;
}
export {};
