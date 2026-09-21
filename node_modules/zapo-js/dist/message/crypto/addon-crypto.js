"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseAddonAdditionalData = shouldUseAddonAdditionalData;
exports.buildAddonAdditionalData = buildAddonAdditionalData;
exports.collectUniqueUserJids = collectUniqueUserJids;
exports.resolveAddonParentSenderFromKey = resolveAddonParentSenderFromKey;
exports.buildAddonSenderPairs = buildAddonSenderPairs;
exports.decryptAddonPayloadWithSenderFallback = decryptAddonPayloadWithSenderFallback;
exports.encryptAddonPayload = encryptAddonPayload;
exports.decryptAddonPayload = decryptAddonPayload;
exports.identifyEncryptedAddon = identifyEncryptedAddon;
exports.decodeAddonPlaintext = decodeAddonPlaintext;
exports.resolveParentMessageSecret = resolveParentMessageSecret;
exports.resolvePollOptionNames = resolvePollOptionNames;
const _crypto_1 = require("../../crypto");
const use_case_secret_1 = require("../crypto/use-case-secret");
const content_1 = require("../encode/content");
const _proto_1 = require("../../proto");
const jid_1 = require("../../protocol/jid");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
const WA_ADDON_ENCRYPTION_NONCE_BYTES = 12;
/** Returns `true` when an addon kind binds its AES-GCM ciphertext to additional data (polls + event responses). */
function shouldUseAddonAdditionalData(modificationType) {
    return (modificationType === use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.POLL_VOTE ||
        modificationType === use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.EVENT_RESPONSE);
}
/** Builds the canonical AES-GCM `additionalData` bytes for an addon (stanza id + NUL + sender). */
function buildAddonAdditionalData(stanzaId, addOnSenderJid) {
    if (!stanzaId.trim()) {
        throw new Error('stanza id must be a non-empty string');
    }
    if (!addOnSenderJid.trim()) {
        throw new Error('addon sender jid must be a non-empty string');
    }
    return bytes_1.TEXT_ENCODER.encode(`${stanzaId}\u0000${addOnSenderJid}`);
}
/**
 * Deduplicates JID candidates as bare `user@server` (device stripped). Empty /
 * whitespace-only values are dropped. Order is preserved (first wins).
 */
function collectUniqueUserJids(...candidates) {
    const out = [];
    const seen = new Set();
    for (const candidate of candidates) {
        if (typeof candidate !== 'string' || !candidate.trim())
            continue;
        let userJid;
        try {
            userJid = (0, jid_1.toUserJid)(candidate);
        }
        catch {
            continue;
        }
        if (seen.has(userJid))
            continue;
        seen.add(userJid);
        out.push(userJid);
    }
    return out;
}
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
function resolveAddonParentSenderFromKey(targetMessageKey, chatIsGroup) {
    if (targetMessageKey.fromMe)
        return null;
    const raw = chatIsGroup ? targetMessageKey.participant : targetMessageKey.remoteJid;
    return collectUniqueUserJids(raw)[0] ?? null;
}
/**
 * Chat JIDs reach the candidate lists through stanza attributes (`from` and
 * the `*Alt` fields point at the group in a group chat) and can never be the
 * author of anything, so they are dropped. Everything else stays: the
 * as-received rung has to work for senders outside `@lid` / `@s.whatsapp.net`,
 * such as a hosted device.
 */
function isPossibleAddonSenderJid(jid) {
    return !(0, jid_1.isGroupOrBroadcastJid)(jid) && !(0, jid_1.isNewsletterJid)(jid);
}
/** Builds the bounded LID, PN, and as-received sender rungs used by addon decryption. */
function buildAddonSenderPairs(input) {
    const parents = input.parentCandidates.filter(isPossibleAddonSenderJid);
    const modifiers = input.modificationCandidates.filter(isPossibleAddonSenderJid);
    const pairs = [];
    const seen = new Set();
    const addPair = (parentMsgOriginalSender, modificationSender) => {
        if (!parentMsgOriginalSender || !modificationSender)
            return;
        const key = `${parentMsgOriginalSender}\u0000${modificationSender}`;
        if (seen.has(key))
            return;
        seen.add(key);
        pairs.push({ parentMsgOriginalSender, modificationSender });
    };
    addPair(parents.find((jid) => (0, jid_1.isLidJid)(jid)), modifiers.find((jid) => (0, jid_1.isLidJid)(jid)));
    addPair(parents.find((jid) => (0, jid_1.isUserJid)(jid)), modifiers.find((jid) => (0, jid_1.isUserJid)(jid)));
    addPair(parents[0], modifiers[0]);
    return pairs;
}
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
async function decryptAddonPayloadWithSenderFallback(input) {
    if (input.senderPairs.length === 0) {
        throw new Error('addon sender pairs must not be empty');
    }
    let lastError;
    for (const { parentMsgOriginalSender, modificationSender } of input.senderPairs) {
        try {
            return await decryptAddonPayload({
                messageSecret: input.messageSecret,
                stanzaId: input.stanzaId,
                parentMsgOriginalSender,
                modificationSender,
                modificationType: input.modificationType,
                ciphertext: input.ciphertext,
                iv: input.iv,
                additionalData: shouldUseAddonAdditionalData(input.modificationType)
                    ? buildAddonAdditionalData(input.stanzaId, modificationSender)
                    : undefined
            });
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError instanceof Error ? lastError : new Error((0, primitives_1.toError)(lastError).message);
}
/** Encrypts an addon payload (poll vote, reaction, edit, ...) with the per-use-case secret. */
async function encryptAddonPayload(input) {
    const secret = await (0, use_case_secret_1.createUseCaseSecret)({
        messageSecret: (0, use_case_secret_1.assertMessageSecret)(input.messageSecret),
        stanzaId: input.stanzaId,
        parentMsgOriginalSender: input.parentMsgOriginalSender,
        modificationSender: input.modificationSender,
        modificationType: input.modificationType
    });
    const iv = assertAddonIv(input.iv);
    const additionalData = resolveAddonAdditionalData(input);
    return (0, _crypto_1.aesGcmEncrypt)(secret, iv, (0, bytes_1.toBytesView)(input.payload), additionalData);
}
/** Decrypts an addon payload encrypted with {@link encryptAddonPayload}. */
async function decryptAddonPayload(input) {
    const secret = await (0, use_case_secret_1.createUseCaseSecret)({
        messageSecret: (0, use_case_secret_1.assertMessageSecret)(input.messageSecret),
        stanzaId: input.stanzaId,
        parentMsgOriginalSender: input.parentMsgOriginalSender,
        modificationSender: input.modificationSender,
        modificationType: input.modificationType
    });
    const iv = assertAddonIv(input.iv);
    const additionalData = resolveAddonAdditionalData(input);
    return (0, _crypto_1.aesGcmDecrypt)(secret, iv, (0, bytes_1.toBytesView)(input.ciphertext), additionalData);
}
/**
 * Inspects a message and, when it contains an encrypted addon (reaction,
 * poll vote, edit, comment, event response, ...), returns the parsed
 * envelope with its kind and target message key. Returns `null` otherwise.
 */
function identifyEncryptedAddon(message) {
    const msg = (0, content_1.unwrapMessage)(message);
    if (msg.encReactionMessage) {
        const { targetMessageKey, encPayload, encIv } = msg.encReactionMessage;
        if (targetMessageKey && encPayload && encIv) {
            return {
                kind: 'reaction',
                targetMessageKey,
                encPayload: encPayload,
                encIv: encIv,
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.ENC_REACTION,
                raw: message
            };
        }
    }
    if (msg.pollUpdateMessage) {
        const { pollCreationMessageKey, vote } = msg.pollUpdateMessage;
        if (pollCreationMessageKey && vote?.encPayload && vote.encIv) {
            return {
                kind: 'poll_vote',
                targetMessageKey: pollCreationMessageKey,
                encPayload: vote.encPayload,
                encIv: vote.encIv,
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.POLL_VOTE,
                raw: message
            };
        }
    }
    if (msg.encEventResponseMessage) {
        const { eventCreationMessageKey, encPayload, encIv } = msg.encEventResponseMessage;
        if (eventCreationMessageKey && encPayload && encIv) {
            return {
                kind: 'event_response',
                targetMessageKey: eventCreationMessageKey,
                encPayload: encPayload,
                encIv: encIv,
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.EVENT_RESPONSE,
                raw: message
            };
        }
    }
    if (msg.encCommentMessage) {
        const { targetMessageKey, encPayload, encIv } = msg.encCommentMessage;
        if (targetMessageKey && encPayload && encIv) {
            return {
                kind: 'comment',
                targetMessageKey,
                encPayload: encPayload,
                encIv: encIv,
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.ENC_COMMENT,
                raw: message
            };
        }
    }
    if (msg.secretEncryptedMessage) {
        const { targetMessageKey, encPayload, encIv, secretEncType } = msg.secretEncryptedMessage;
        if (targetMessageKey?.id &&
            encPayload &&
            encIv &&
            encIv.byteLength === WA_ADDON_ENCRYPTION_NONCE_BYTES) {
            const mapped = mapSecretEncType(secretEncType);
            if (mapped) {
                return {
                    kind: mapped.kind,
                    targetMessageKey,
                    encPayload,
                    encIv,
                    modificationType: mapped.modificationType,
                    raw: message
                };
            }
        }
    }
    return null;
}
function mapSecretEncType(secretEncType) {
    switch (secretEncType) {
        case _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.MESSAGE_EDIT:
            return {
                kind: 'message_edit',
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.MESSAGE_EDIT
            };
        case _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.EVENT_EDIT:
            return {
                kind: 'event_edit',
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.EVENT_EDIT_ENCRYPTED
            };
        case _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_EDIT:
            return {
                kind: 'poll_edit',
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.POLL_EDIT_ENCRYPTED
            };
        case _proto_1.proto.Message.SecretEncryptedMessage.SecretEncType.POLL_ADD_OPTION:
            return {
                kind: 'poll_add_option',
                modificationType: use_case_secret_1.WA_USE_CASE_SECRET_MODIFICATION_TYPES.POLL_ADD_OPTION
            };
        default:
            return null;
    }
}
/** Decodes the decrypted addon plaintext into its typed protobuf message based on `kind`. */
function decodeAddonPlaintext(kind, plaintext) {
    switch (kind) {
        case 'reaction':
            return { kind, reaction: _proto_1.proto.Message.ReactionMessage.decode(plaintext) };
        case 'poll_vote':
            return {
                kind,
                pollVote: _proto_1.proto.Message.PollVoteMessage.decode(plaintext),
                selectedOptionNames: null
            };
        case 'event_response':
            return { kind, eventResponse: _proto_1.proto.Message.EventResponseMessage.decode(plaintext) };
        case 'comment':
            return { kind, comment: _proto_1.proto.Message.CommentMessage.decode(plaintext) };
        case 'message_edit':
        case 'event_edit':
        case 'poll_edit':
        case 'poll_add_option':
            return { kind, message: _proto_1.proto.Message.decode(plaintext) };
    }
}
async function resolveParentMessageSecret(targetMessageId, messageSecretStore, messageStore) {
    const cached = await messageSecretStore.get(targetMessageId);
    if (cached)
        return cached;
    const record = await messageStore.getById(targetMessageId);
    if (!record?.messageBytes)
        return null;
    try {
        const decoded = _proto_1.proto.Message.decode(record.messageBytes);
        const secret = decoded.messageContextInfo?.messageSecret;
        if (!secret || secret.byteLength !== use_case_secret_1.WA_MESSAGE_SECRET_BYTES)
            return null;
        return { secret, senderJid: record.senderJid ?? '' };
    }
    catch {
        return null;
    }
}
async function resolvePollOptionNames(selectedOptions, pollCreationMessageId, messageStore) {
    const record = await messageStore.getById(pollCreationMessageId);
    if (!record?.messageBytes)
        return null;
    let decoded;
    try {
        decoded = _proto_1.proto.Message.decode(record.messageBytes);
    }
    catch {
        return null;
    }
    const pollMsg = (0, content_1.unwrapMessage)(decoded);
    const options = pollMsg.pollCreationMessage?.options ??
        pollMsg.pollCreationMessageV2?.options ??
        pollMsg.pollCreationMessageV3?.options ??
        pollMsg.pollCreationMessageV5?.options;
    if (!options || options.length === 0)
        return null;
    const hashToName = new Map();
    for (const option of options) {
        if (!option.optionName)
            continue;
        const hash = (0, _crypto_1.sha256)(bytes_1.TEXT_ENCODER.encode(option.optionName));
        hashToName.set((0, bytes_1.bytesToHex)(hash), option.optionName);
    }
    const names = [];
    for (const selected of selectedOptions) {
        const hex = (0, bytes_1.bytesToHex)(selected);
        const name = hashToName.get(hex);
        if (!name)
            return null;
        names.push(name);
    }
    return names;
}
function assertAddonIv(iv) {
    const normalized = (0, bytes_1.toBytesView)(iv);
    if (normalized.byteLength !== WA_ADDON_ENCRYPTION_NONCE_BYTES) {
        throw new Error(`addon iv must be ${WA_ADDON_ENCRYPTION_NONCE_BYTES} bytes (got ${normalized.byteLength})`);
    }
    return normalized;
}
function resolveAddonAdditionalData(input) {
    if (input.additionalData) {
        return (0, bytes_1.toBytesView)(input.additionalData);
    }
    if (!shouldUseAddonAdditionalData(input.modificationType)) {
        return bytes_1.EMPTY_BYTES;
    }
    return buildAddonAdditionalData(input.stanzaId, input.modificationSender);
}
