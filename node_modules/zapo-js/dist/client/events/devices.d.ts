import type { BinaryNode } from '../../transport/types';
export declare const DEVICE_NOTIFICATION_ACTIONS: Readonly<{
    readonly ADD: "add";
    readonly REMOVE: "remove";
    readonly UPDATE: "update";
}>;
export type DeviceNotificationAction = (typeof DEVICE_NOTIFICATION_ACTIONS)[keyof typeof DEVICE_NOTIFICATION_ACTIONS];
interface DeviceNotificationDevice {
    readonly deviceId: number;
    readonly keyIndex: number | null;
}
interface DeviceNotification {
    readonly action: DeviceNotificationAction;
    readonly stanzaId: string;
    readonly fromJid: string;
    readonly lid: string | null;
    readonly hash: string | null;
    readonly devices: readonly DeviceNotificationDevice[];
}
export declare function parseDeviceNotification(node: BinaryNode): DeviceNotification | null;
export {};
