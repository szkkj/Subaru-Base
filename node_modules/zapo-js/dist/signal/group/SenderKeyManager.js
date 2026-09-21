"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderKeyManager = void 0;
const _crypto_1 = require("../../crypto");
const StoreLock_1 = require("../../infra/perf/StoreLock");
const _proto_1 = require("../../proto");
const jid_1 = require("../../protocol/jid");
const constants_1 = require("../api/constants");
const constants_2 = require("../constants");
const SenderKeyChain_1 = require("../group/SenderKeyChain");
const SenderKeyCodec_1 = require("../group/SenderKeyCodec");
const bytes_1 = require("../../util/bytes");
function extractAesCbcParams(seed) {
    if (seed.length < 48) {
        throw new Error('sender key message seed must be at least 48 bytes');
    }
    return {
        iv: seed.subarray(0, 16),
        keyBytes: seed.subarray(16, 48)
    };
}
function aesCbcEncryptFromSeed(seed, plaintext) {
    const { keyBytes, iv } = extractAesCbcParams(seed);
    return (0, _crypto_1.aesCbcEncrypt)(keyBytes, iv, plaintext);
}
function aesCbcDecryptFromSeed(seed, ciphertext) {
    const { keyBytes, iv } = extractAesCbcParams(seed);
    return (0, _crypto_1.aesCbcDecrypt)(keyBytes, iv, ciphertext);
}
/**
 * Implements the sender-key group encryption side of Signal: creates and
 * rotates sender keys, encrypts/decrypts group messages, and tracks which
 * participants have already received the distribution message.
 */
class SenderKeyManager {
    constructor(store, options) {
        this.senderLock = new StoreLock_1.StoreLock();
        this.store = store;
        this.getFutureMessagesMax = options?.getFutureMessagesMax;
        this.skipSignatureVerification = options?.skipSignatureVerification === true;
    }
    /**
     * Produces the distribution message and ciphertext for `plaintext` sent by
     * `sender` into `groupId`. Initializes a sender key when none exists yet.
     */
    async prepareGroupEncryption(groupId, sender, plaintext) {
        return this.runWithSenderLock(groupId, sender, async () => {
            const senderKey = await this.ensureSenderKeyInternal(groupId, sender);
            if (!senderKey.signingPrivateKey) {
                throw new Error('sender private signing key is missing');
            }
            const derived = (0, SenderKeyChain_1.deriveSenderKeyMsgKey)(senderKey.iteration, senderKey.chainKey);
            await this.store.upsertSenderKey({
                ...senderKey,
                chainKey: derived.nextChainKey,
                iteration: derived.messageKey.iteration + 1
            });
            const distributionProto = _proto_1.proto.SenderKeyDistributionMessage.encode({
                id: senderKey.keyId,
                iteration: senderKey.iteration,
                chainKey: senderKey.chainKey,
                signingKey: senderKey.signingPublicKey
            }).finish();
            const distributionMessage = {
                groupId,
                axolotlSenderKeyDistributionMessage: (0, _crypto_1.prependVersion)(distributionProto, constants_2.SIGNAL_GROUP_VERSION)
            };
            const messagePayload = aesCbcEncryptFromSeed(derived.messageKey.seed, plaintext);
            const senderKeyMessage = _proto_1.proto.SenderKeyMessage.encode({
                id: senderKey.keyId,
                iteration: derived.messageKey.iteration,
                ciphertext: messagePayload
            }).finish();
            const versionedContent = (0, _crypto_1.prependVersion)(senderKeyMessage, constants_2.SIGNAL_GROUP_VERSION);
            const signature = await (0, _crypto_1.xeddsaSign)(senderKey.signingPrivateKey, versionedContent);
            if (signature.length !== constants_1.SIGNAL_SIGNATURE_LENGTH) {
                throw new Error(`invalid sender key signature length ${signature.length}`);
            }
            const ciphertext = {
                groupId,
                sender,
                keyId: senderKey.keyId,
                iteration: derived.messageKey.iteration,
                ciphertext: (0, bytes_1.concatBytes)([versionedContent, signature])
            };
            return {
                distributionMessage,
                ciphertext,
                keyId: senderKey.keyId
            };
        });
    }
    /** Filters a participant list down to those who have not yet received the current sender key distribution. */
    async filterParticipantsNeedingDistribution(groupId, senderKeyId, participants) {
        if (participants.length === 0) {
            return [];
        }
        const distributed = await this.store.getDeviceSenderKeyDistributions(groupId, participants);
        const pendingParticipants = new Array(participants.length);
        let pendingCount = 0;
        for (let index = 0; index < participants.length; index += 1) {
            const record = distributed[index];
            if (!record || record.keyId !== senderKeyId) {
                pendingParticipants[pendingCount] = participants[index];
                pendingCount += 1;
            }
        }
        pendingParticipants.length = pendingCount;
        return pendingParticipants;
    }
    /** Records that the sender key was successfully delivered to the given participants. */
    async markSenderKeyDistributed(groupId, senderKeyId, participants) {
        if (participants.length === 0) {
            return;
        }
        const timestampMs = Date.now();
        const distributions = new Array(participants.length);
        for (let index = 0; index < participants.length; index += 1) {
            distributions[index] = {
                groupId,
                sender: participants[index],
                keyId: senderKeyId,
                timestampMs
            };
        }
        await this.store.upsertSenderKeyDistributions(distributions);
    }
    /**
     * Verifies (per `skipSignatureVerification`) and stores an incoming sender
     * key distribution so subsequent group ciphertexts from `sender` can be
     * decrypted.
     */
    async processSenderKeyDistributionPayload(groupId, sender, payload) {
        return this.runWithSenderLock(groupId, sender, async () => {
            if (groupId.length === 0) {
                throw new Error('sender key distribution missing groupId');
            }
            const parsed = (0, SenderKeyCodec_1.parseDistributionPayload)(payload);
            const record = {
                groupId,
                sender,
                keyId: parsed.keyId,
                iteration: parsed.iteration,
                chainKey: parsed.chainKey,
                signingPublicKey: parsed.signingPublicKey,
                unusedMessageKeys: []
            };
            await Promise.all([
                this.store.upsertSenderKey(record),
                this.store.upsertSenderKeyDistribution({
                    groupId,
                    sender,
                    keyId: parsed.keyId,
                    timestampMs: Date.now()
                })
            ]);
            return record;
        });
    }
    /** Decrypts an incoming sender-key group ciphertext into plaintext. */
    async decryptGroupMessage(payload) {
        return this.runWithSenderLock(payload.groupId, payload.sender, async () => {
            const parsed = (0, SenderKeyCodec_1.parseSenderKeyMessage)(payload.ciphertext);
            const senderKey = await this.store.getDeviceSenderKey(payload.groupId, payload.sender);
            if (!senderKey) {
                throw new Error('missing sender key');
            }
            if (senderKey.keyId !== parsed.keyId) {
                throw new Error('sender key id mismatch');
            }
            if (payload.keyId !== undefined &&
                payload.keyId !== null &&
                parsed.keyId !== payload.keyId) {
                throw new Error('sender key id mismatch');
            }
            if (payload.iteration !== undefined &&
                payload.iteration !== null &&
                parsed.iteration !== payload.iteration) {
                throw new Error('sender key iteration mismatch');
            }
            if (!this.skipSignatureVerification) {
                const signedContent = parsed.versionContentMac.subarray(0, parsed.versionContentMac.length - constants_1.SIGNAL_SIGNATURE_LENGTH);
                const signature = parsed.versionContentMac.subarray(parsed.versionContentMac.length - constants_1.SIGNAL_SIGNATURE_LENGTH);
                const validSignature = await (0, _crypto_1.xeddsaVerify)((0, _crypto_1.toRawPubKey)(senderKey.signingPublicKey), signedContent, signature);
                if (!validSignature) {
                    throw new Error('invalid sender key signature');
                }
            }
            const selected = (0, SenderKeyChain_1.selectMessageKey)(senderKey, parsed.iteration, this.getFutureMessagesMax?.());
            // Keep decrypt + persist ordered: failed decrypt must not advance sender-key state.
            const plaintext = aesCbcDecryptFromSeed(selected.messageKey.seed, parsed.ciphertext);
            await this.store.upsertSenderKey(selected.updatedRecord);
            return plaintext;
        });
    }
    async ensureSenderKeyInternal(groupId, sender) {
        const existing = await this.store.getDeviceSenderKey(groupId, sender);
        if (existing) {
            return existing;
        }
        const [signingKeyPair, keyId, chainKey] = await Promise.all([
            _crypto_1.X25519.generateKeyPair(),
            (0, _crypto_1.randomIntAsync)(1, 2147483647),
            (0, _crypto_1.randomBytesAsync)(32)
        ]);
        const created = {
            groupId,
            sender,
            keyId,
            iteration: 0,
            chainKey,
            signingPublicKey: (0, _crypto_1.toSerializedPubKey)(signingKeyPair.pubKey),
            signingPrivateKey: signingKeyPair.privKey,
            unusedMessageKeys: []
        };
        await this.store.upsertSenderKey(created);
        return created;
    }
    runWithSenderLock(groupId, sender, task) {
        return this.senderLock.run(`senderKey:${groupId}:${(0, jid_1.signalAddressKey)(sender)}`, task);
    }
}
exports.SenderKeyManager = SenderKeyManager;
