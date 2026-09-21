import type { Proto } from '../../proto';
export declare const WA_MESSAGE_SECRET_BYTES = 32;
export declare const WA_USE_CASE_SECRET_MODIFICATION_TYPES: Readonly<{
    readonly POLL_VOTE: "Poll Vote";
    readonly ENC_REACTION: "Enc Reaction";
    readonly ENC_COMMENT: "Enc Comment";
    readonly REPORT_TOKEN: "Report Token";
    readonly EVENT_RESPONSE: "Event Response";
    readonly EVENT_EDIT_ENCRYPTED: "Event Edit";
    readonly MESSAGE_EDIT: "Message Edit";
    readonly POLL_EDIT_ENCRYPTED: "Poll Edit";
    readonly POLL_ADD_OPTION: "Poll Add Option";
}>;
/**
 * Validates that `messageSecret` is exactly 32 bytes and returns it as a
 * zero-copy Uint8Array view (throws otherwise).
 */
export declare function assertMessageSecret(messageSecret: Uint8Array | ArrayBuffer | ArrayBufferView, context?: string): Uint8Array;
/**
 * Returns `message` unchanged when a message secret is already present;
 * otherwise generates a fresh 32-byte secret and attaches it under
 * `messageContextInfo.messageSecret`.
 */
export declare function ensureMessageSecret(message: Proto.IMessage): Promise<Proto.IMessage>;
/**
 * Derives the per-use-case secret (poll vote, reaction, edit, ...) via HKDF
 * over `messageSecret` and the canonical `stanzaId + sender + sender +
 * modificationType` info string.
 */
export declare function createUseCaseSecret(input: {
    readonly messageSecret: Uint8Array | ArrayBuffer | ArrayBufferView;
    readonly stanzaId: string;
    readonly parentMsgOriginalSender: string;
    readonly modificationSender: string;
    readonly modificationType: (typeof WA_USE_CASE_SECRET_MODIFICATION_TYPES)[keyof typeof WA_USE_CASE_SECRET_MODIFICATION_TYPES];
}): Promise<Uint8Array>;
