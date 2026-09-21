import type { WaIncomingBaseEvent, WaMexNotificationEvent } from '../types';
import type { BinaryNode } from '../../transport/types';
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
export type WaMexNotificationParsed = DistributiveOmit<WaMexNotificationEvent, keyof WaIncomingBaseEvent>;
export declare function parseMexNotification(node: BinaryNode): WaMexNotificationParsed | null;
export {};
