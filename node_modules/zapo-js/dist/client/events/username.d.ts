import type { WaOwnUsernameNotificationEvent } from '../types';
import type { BinaryNode } from '../../transport/types';
/**
 * Reads the `<username>` child of an `account_sync` notification, `null` when
 * there is none. The shapes are tried in WhatsApp Web's order, so
 * `action="modify"` wins over a handle when a stanza carries both.
 */
export declare function parseOwnUsernameNotification(node: BinaryNode): WaOwnUsernameNotificationEvent | null;
