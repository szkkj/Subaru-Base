import type { Proto } from '../../proto';
export declare function wrapDeviceSentMessage(message: Proto.IMessage, destinationJid: string): Proto.IMessage;
export declare function unwrapDeviceSentMessage(message: Proto.IMessage): Proto.IMessage | null;
