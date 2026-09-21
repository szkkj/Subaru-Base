import type { WaAppStateMutationCoordinator, WaSetStatusPrivacyInput } from '../coordinators/WaAppStateMutationCoordinator';
import type { WaSendMessageOptions } from '../types';
import type { WaMessageBuildResult, WaMessagePublishResult, WaSendMessageContent } from '../../message/types';
import { type Proto } from '../../proto';
import type { WaStatusDistributionSetting } from '../../protocol/status';
export interface WaStatusCoordinatorOptions {
    readonly appStateMutations: WaAppStateMutationCoordinator;
    readonly buildMessageContent: (content: WaSendMessageContent) => Promise<WaMessageBuildResult>;
    readonly publishStatusMessage: (input: {
        readonly message: Proto.IMessage;
        readonly recipients: readonly string[];
        readonly statusSetting?: WaStatusDistributionSetting;
        readonly options?: WaSendMessageOptions;
    }) => Promise<WaMessagePublishResult>;
}
export interface WaSendStatusInput {
    readonly content: WaSendMessageContent;
    readonly recipients: readonly string[];
    readonly statusSetting?: WaStatusDistributionSetting;
    readonly options?: WaSendMessageOptions;
}
/**
 * Coordinates the status-broadcast surface: distribution privacy, per-contact
 * mute, send, and revoke. Accessed via {@link WaClient.status}.
 */
export interface WaStatusCoordinator {
    /** Updates the account-wide status privacy setting (see {@link WaSetStatusPrivacyInput}). */
    readonly setPrivacy: (input: WaSetStatusPrivacyInput) => Promise<void>;
    /** Mutes or unmutes a specific contact's status broadcasts. */
    readonly setUserMuted: (jid: string, muted: boolean) => Promise<void>;
    /** Publishes a status broadcast to the given recipients. */
    readonly send: (input: WaSendStatusInput) => Promise<WaMessagePublishResult>;
    /** Revokes a previously-published status broadcast. */
    readonly revokeStatus: (input: {
        readonly messageId: string;
        readonly recipients: readonly string[];
        readonly statusSetting?: WaStatusDistributionSetting;
        readonly options?: WaSendMessageOptions;
    }) => Promise<WaMessagePublishResult>;
}
/** Builds a {@link WaStatusCoordinator} from its dependencies. */
export declare function createStatusCoordinator(options: WaStatusCoordinatorOptions): WaStatusCoordinator;
