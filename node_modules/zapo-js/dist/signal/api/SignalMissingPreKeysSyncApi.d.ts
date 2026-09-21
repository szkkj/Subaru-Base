import type { Logger } from '../../infra/log/types';
import type { SignalPreKeyBundle } from '../types';
import type { BinaryNode } from '../../transport/types';
interface SignalMissingPreKeysSyncApiOptions {
    readonly logger: Logger;
    readonly query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly defaultTimeoutMs?: number;
}
export interface SignalMissingPreKeysTarget {
    readonly userJid: string;
    readonly reasonIdentity?: boolean;
    readonly devices: readonly {
        readonly deviceId: number;
        readonly registrationId: number;
    }[];
}
export interface SignalMissingPreKeysDeviceBundle {
    readonly deviceJid: string;
    readonly bundle: SignalPreKeyBundle;
    readonly deviceIdentity?: Uint8Array;
}
export type SignalMissingPreKeysUserResult = {
    readonly userJid: string;
    readonly devices: readonly SignalMissingPreKeysDeviceBundle[];
} | {
    readonly userJid: string;
    readonly errorCode?: number;
    readonly errorText: string;
};
/**
 * Fetches missing prekey bundles for specific (user, device, registration id)
 * triples – used during message encryption when a Signal session is missing.
 */
export declare class SignalMissingPreKeysSyncApi {
    private readonly logger;
    private readonly query;
    private readonly defaultTimeoutMs;
    constructor(options: SignalMissingPreKeysSyncApiOptions);
    /**
     * Fetches prekey bundles for the requested `targets` in a single IQ.
     * Returns either a per-device bundle list or an error envelope per user.
     */
    fetchMissingPreKeys(targets: readonly SignalMissingPreKeysTarget[], timeoutMs?: number): Promise<readonly SignalMissingPreKeysUserResult[]>;
    private parseFetchMissingPreKeysResponse;
    private parseUserDevices;
}
export {};
