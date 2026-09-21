import type { BinaryNode } from '../../transport/types';
interface ParsedRegistrationCode {
    readonly kind: 'registration_code';
    readonly code: string;
    readonly expiryTimestampMs: number;
    readonly fromDeviceId: string;
}
interface ParsedAccountTakeoverNotice {
    readonly kind: 'account_takeover_notice';
    readonly serverToken: string;
    readonly attemptTimestampMs: number;
    readonly newDeviceName?: string;
    readonly newDevicePlatform?: string;
    readonly newDeviceAppVersion?: string;
}
type ParsedRegistrationNotification = ParsedRegistrationCode | ParsedAccountTakeoverNotice | null;
export declare function parseRegistrationNotification(node: BinaryNode): ParsedRegistrationNotification;
export {};
