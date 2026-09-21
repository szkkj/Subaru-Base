import type { WaAuthCredentials } from '../../auth/types';
import type { WaAccountTakeoverNoticeEvent, WaBusinessEvent, WaGroupEvent, WaIncomingBaseEvent, WaIncomingCallEvent, WaIncomingFailureEvent, WaIncomingNotificationEvent, WaIncomingReceiptEvent, WaIncomingUnhandledStanzaEvent, WaMexNotificationEvent, WaPictureEvent, WaRegistrationCodeEvent } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaConnectionCode, WaDisconnectReason } from '../../protocol/stream';
import type { BinaryNode } from '../../transport/types';
interface IncomingAckRuntime {
    readonly logger: Logger;
    readonly sendNode: (node: BinaryNode) => Promise<void>;
}
type IncomingReceiptHandlerOptions = IncomingAckRuntime & {
    readonly handleIncomingRetryReceipt?: (node: BinaryNode) => Promise<void>;
    readonly trackOutboundReceipt?: (node: BinaryNode) => Promise<void>;
    readonly emitIncomingReceipt: (event: WaIncomingReceiptEvent) => void;
};
type IncomingFailureHandlerOptions = {
    readonly logger: Logger;
    readonly emitIncomingFailure: (event: WaIncomingFailureEvent) => void;
    readonly stopComms: () => void;
    readonly disconnect: (reason: WaDisconnectReason, isLogout: boolean, code: WaConnectionCode | null) => Promise<void>;
    readonly clearStoredCredentials: () => Promise<void>;
};
type IncomingNotificationHandlerOptions = IncomingAckRuntime & {
    readonly emitIncomingNotification: (event: WaIncomingNotificationEvent) => void;
    readonly emitMexNotification: (event: WaMexNotificationEvent) => void;
    readonly emitUnhandledStanza: (event: WaIncomingUnhandledStanzaEvent) => void;
    readonly syncAppState?: () => Promise<void>;
    /** Resolves a pending media reupload request; never throws. */
    readonly handleMediaRetryNotification?: (node: BinaryNode) => void;
};
type IncomingGroupNotificationHandlerOptions = IncomingAckRuntime & {
    readonly emitGroupEvent: (event: WaGroupEvent) => void;
    readonly emitUnhandledStanza: (event: WaIncomingUnhandledStanzaEvent) => void;
};
type IncomingBusinessNotificationHandlerOptions = IncomingAckRuntime & {
    readonly emitBusinessEvent: (event: WaBusinessEvent) => void;
    readonly emitUnhandledStanza: (event: WaIncomingUnhandledStanzaEvent) => void;
};
type IncomingPictureNotificationHandlerOptions = IncomingAckRuntime & {
    readonly emitPictureEvent: (event: WaPictureEvent) => void;
    readonly emitUnhandledStanza: (event: WaIncomingUnhandledStanzaEvent) => void;
};
type IncomingRegistrationNotificationHandlerOptions = IncomingAckRuntime & {
    readonly emitRegistrationCode: (event: WaRegistrationCodeEvent) => void;
    readonly emitAccountTakeoverNotice: (event: WaAccountTakeoverNoticeEvent) => void;
};
type IncomingCallHandlerOptions = IncomingAckRuntime & {
    readonly emitIncomingCall: (event: WaIncomingCallEvent) => void;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
};
/**
 * Builds the inbound ack for `message`/`receipt`/`notification` tags. Returns
 * `null` for other tags or when required attrs are missing.
 */
export declare function buildInboundAck(node: BinaryNode): BinaryNode | null;
export declare function createIncomingBaseEvent(node: BinaryNode): WaIncomingBaseEvent;
export declare function sendSafeAck(logger: Logger, sendNode: (node: BinaryNode) => Promise<void>, node: BinaryNode): Promise<void>;
export declare function createIncomingReceiptHandler(options: IncomingReceiptHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createIncomingFailureHandler(options: IncomingFailureHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createIncomingNotificationHandler(options: IncomingNotificationHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createIncomingRegistrationNotificationHandler(options: IncomingRegistrationNotificationHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createIncomingBusinessNotificationHandler(options: IncomingBusinessNotificationHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createIncomingGroupNotificationHandler(options: IncomingGroupNotificationHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createIncomingPictureNotificationHandler(options: IncomingPictureNotificationHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createIncomingCallHandler(options: IncomingCallHandlerOptions): (node: BinaryNode) => Promise<boolean>;
export declare function createInfoBulletinNotificationEvent(node: BinaryNode, type: string, details?: Readonly<Record<string, unknown>>): WaIncomingNotificationEvent;
export declare function createUnhandledIncomingNodeEvent(node: BinaryNode, reason?: string): WaIncomingUnhandledStanzaEvent;
export {};
