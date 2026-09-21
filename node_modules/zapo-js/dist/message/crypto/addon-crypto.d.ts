import type { WaAddonKind } from '../../client/types';
import { WA_USE_CASE_SECRET_MODIFICATION_TYPES } from '../crypto/use-case-secret';
import { type Proto } from '../../proto';
import type { WaMessageSecretEntry, WaMessageSecretStore } from '../../store/contracts/message-secret.store';
import type { WaMessageStore } from '../../store/contracts/message.store';
type WaAddonBytes = Uint8Array | ArrayBuffer | ArrayBufferView;
type ModificationType = (typeof WA_USE_CASE_SECRET_MODIFICATION_TYPES)[keyof typeof WA_USE_CASE_SECRET_MODIFICATION_TYPES];
/** Returns `true` when an addon kind binds its AES-GCM ciphertext to additional data (polls + event responses). */
export declare function shouldUseAddonAdditionalData(modificationType: ModificationType): boolean;
/** Builds the canonical AES-GCM `additionalData` bytes for an addon (stanza id + NUL + sender). */
export declare function buildAddonAdditionalData(stanzaId: string, addOnSenderJid: string): Uint8Array;
/**
 * Deduplicates JID candidates as bare `user@server` (device stripped). Empty /
 * whitespace-only values are dropped. Order is preserved (first wins).
 */
export declare function collectUniqueUserJids(...candidates: ReadonlyArray<string | null | undefined>): readonly string[];
/**
 * Resolves the parent-message author JID the peer used when encrypting an
 * addon (poll vote / event response / ...), or `null` when the key carries no
 * usable one. In a group the author is the key's `participant`; in 1:1 it is
 * `remoteJid`, which is how the sender addressed us (often our LID).
 *
 * A `fromMe` key is ours, so its author is this account and the stored parent
 * entry already holds that JID. `remoteJid` on such a key is the *chat*, i.e.
 * the other side, so reading it would seed the candidate list with the one
 * party that certainly did not write the parent.
 *
 * WhatsApp Web reads the author off its own stored parent message instead,
 * then normalizes the addressing mode. Taking it from the key the peer sent
 * is a shortcut to the same JID, in the exact form they encrypted with, so it
 * pairs with the stored author rather than replacing it.
 */
export declare function resolveAddonParentSenderFromKey(targetMessageKey: Proto.IMessageKey, chatIsGroup: boolean): string | null;
export interface WaAddonSenderPair {
    readonly parentMsgOriginalSender: string;
    readonly modificationSender: string;
}
/** Builds the bounded LID, PN, and as-received sender rungs used by addon decryption. */
export declare function buildAddonSenderPairs(input: {
    readonly parentCandidates: readonly string[];
    readonly modificationCandidates: readonly string[];
}): readonly WaAddonSenderPair[];
/**
 * Decrypts an addon payload, walking the sender rungs until one authenticates.
 * Needed during the PN→LID migration: the voter encrypts with the poll
 * creator's LID from `pollCreationMessageKey`, while we may have persisted the
 * secret under our PN `meJid`.
 *
 * Every attempt is local crypto over the same ciphertext, so a failed rung
 * says nothing beyond "wrong sender pair" and never aborts the walk. Only an
 * exhausted list throws, carrying the last error.
 */
export declare function decryptAddonPayloadWithSenderFallback(input: {
    readonly messageSecret: WaAddonBytes;
    readonly stanzaId: string;
    readonly senderPairs: readonly WaAddonSenderPair[];
    readonly modificationType: ModificationType;
    readonly ciphertext: WaAddonBytes;
    readonly iv: WaAddonBytes;
}): Promise<Uint8Array>;
/** Encrypts an addon payload (poll vote, reaction, edit, ...) with the per-use-case secret. */
export declare function encryptAddonPayload(input: {
    readonly messageSecret: WaAddonBytes;
    readonly stanzaId: string;
    readonly parentMsgOriginalSender: string;
    readonly modificationSender: string;
    readonly modificationType: ModificationType;
    readonly payload: WaAddonBytes;
    readonly iv: WaAddonBytes;
    readonly additionalData?: WaAddonBytes;
}): Promise<Uint8Array>;
/** Decrypts an addon payload encrypted with {@link encryptAddonPayload}. */
export declare function decryptAddonPayload(input: {
    readonly messageSecret: WaAddonBytes;
    readonly stanzaId: string;
    readonly parentMsgOriginalSender: string;
    readonly modificationSender: string;
    readonly modificationType: ModificationType;
    readonly ciphertext: WaAddonBytes;
    readonly iv: WaAddonBytes;
    readonly additionalData?: WaAddonBytes;
}): Promise<Uint8Array>;
export interface WaIdentifiedEncAddon {
    readonly kind: WaAddonKind;
    readonly targetMessageKey: Proto.IMessageKey;
    readonly encPayload: Uint8Array;
    readonly encIv: Uint8Array;
    readonly modificationType: ModificationType;
    readonly raw: Proto.IMessage;
}
/**
 * Inspects a message and, when it contains an encrypted addon (reaction,
 * poll vote, edit, comment, event response, ...), returns the parsed
 * envelope with its kind and target message key. Returns `null` otherwise.
 */
export declare function identifyEncryptedAddon(message: Proto.IMessage): WaIdentifiedEncAddon | null;
export type WaDecodedAddon = {
    readonly kind: 'reaction';
    readonly reaction: Proto.Message.IReactionMessage;
} | {
    readonly kind: 'poll_vote';
    readonly pollVote: Proto.Message.IPollVoteMessage;
    readonly selectedOptionNames: readonly string[] | null;
} | {
    readonly kind: 'event_response';
    readonly eventResponse: Proto.Message.IEventResponseMessage;
} | {
    readonly kind: 'comment';
    readonly comment: Proto.Message.ICommentMessage;
} | {
    readonly kind: 'message_edit';
    readonly message: Proto.IMessage;
} | {
    readonly kind: 'event_edit';
    readonly message: Proto.IMessage;
} | {
    readonly kind: 'poll_edit';
    readonly message: Proto.IMessage;
} | {
    readonly kind: 'poll_add_option';
    readonly message: Proto.IMessage;
};
/** Decodes the decrypted addon plaintext into its typed protobuf message based on `kind`. */
export declare function decodeAddonPlaintext(kind: WaAddonKind, plaintext: Uint8Array): WaDecodedAddon;
export declare function resolveParentMessageSecret(targetMessageId: string, messageSecretStore: WaMessageSecretStore, messageStore: WaMessageStore): Promise<WaMessageSecretEntry | null>;
export declare function resolvePollOptionNames(selectedOptions: readonly Uint8Array[], pollCreationMessageId: string, messageStore: WaMessageStore): Promise<readonly string[] | null>;
export {};
