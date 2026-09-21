import { type WaUploadMediaSource } from '../media';
import type { WaBusinessProfileResult, WaVerifiedNameResult } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaMediaTransferClient } from '../../media/transfer/WaMediaTransferClient';
import type { WaMediaConn } from '../../media/types';
import { type WaEditBusinessProfileInput } from '../../transport/node/builders/business';
import type { BinaryNode } from '../../transport/types';
export interface WaVerifiedNameBatchEntry {
    readonly jid: string;
    readonly verifiedName: WaVerifiedNameResult | null;
}
/**
 * Coordinates WhatsApp Business profile reads/writes (profile body, verified
 * name, cover photo). Accessed via {@link WaClient.business}.
 *
 * Read methods (`getBusinessProfile`, `getVerifiedName`, `getVerifiedNames`)
 * work from any account. Write methods (`editBusinessProfile`,
 * `updateCoverPhoto`, `deleteCoverPhoto`) are **business-only**: they target
 * the current account's own business profile and the server rejects them
 * when the account is not registered as a WhatsApp Business account.
 */
export interface WaBusinessCoordinator {
    /** Batched fetch of business profile bodies (about, address, hours, ...). */
    readonly getBusinessProfile: (jids: readonly string[]) => Promise<readonly WaBusinessProfileResult[]>;
    /**
     * Edits the current account's business profile. **Business-only** - throws
     * on regular WhatsApp accounts.
     */
    readonly editBusinessProfile: (input: WaEditBusinessProfileInput) => Promise<void>;
    /** Fetches a single business verified-name record (or `null`). */
    readonly getVerifiedName: (jid: string) => Promise<WaVerifiedNameResult | null>;
    /** Batched verified-name lookup over many JIDs (usync). */
    readonly getVerifiedNames: (jids: readonly string[]) => Promise<readonly WaVerifiedNameBatchEntry[]>;
    /**
     * Uploads and binds a new business cover photo. Returns the server-side
     * upload id – feed it back into {@link deleteCoverPhoto} to remove the
     * cover later. **Business-only** - throws on regular WhatsApp accounts.
     */
    readonly updateCoverPhoto: (media: WaUploadMediaSource) => Promise<{
        readonly id: string;
    }>;
    /**
     * Deletes the business cover photo by upload id (returned from
     * {@link updateCoverPhoto}). **Business-only** - throws on regular
     * WhatsApp accounts.
     */
    readonly deleteCoverPhoto: (id: string) => Promise<void>;
}
interface WaBusinessCoordinatorOptions {
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
    readonly mediaTransfer: WaMediaTransferClient;
    readonly getMediaConn: () => Promise<WaMediaConn>;
    readonly logger: Logger;
    readonly generateSid: () => Promise<string>;
}
/** Builds a {@link WaBusinessCoordinator} from its IQ/media dependencies. */
export declare function createBusinessCoordinator(options: WaBusinessCoordinatorOptions): WaBusinessCoordinator;
export {};
