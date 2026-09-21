import { aesCbcDecrypt, aesCbcEncrypt, prependVersion, randomBytesAsync, randomIntAsync, toRawPubKey, toSerializedPubKey, X25519, xeddsaSign, xeddsaVerify } from '../../crypto/index.js';
import { StoreLock } from '../../infra/perf/StoreLock.js';
import { proto } from '../../proto.js';
import { signalAddressKey } from '../../protocol/jid.js';
import { SIGNAL_SIGNATURE_LENGTH } from '../api/constants.js';
import { SIGNAL_GROUP_VERSION } from '../constants.js';
import { deriveSenderKeyMsgKey, selectMessageKey } from '../group/SenderKeyChain.js';
import { parseDistributionPayload, parseSenderKeyMessage } from '../group/SenderKeyCodec.js';
import { concatBytes } from '../../util/bytes.js';
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
    return aesCbcEncrypt(keyBytes, iv, plaintext);
}
function aesCbcDecryptFromSeed(seed, ciphertext) {
    const { keyBytes, iv } = extractAesCbcParams(seed);
    return aesCbcDecrypt(keyBytes, iv, ciphertext);
}
/**
 * Implements the sender-key group encryption side of Signal: creates and
 * rotates sender keys, encrypts/decrypts group messages, and tracks which
 * participants have already received the distribution message.
 */
export class SenderKeyManager {
    constructor(store, options) {
        this.senderLock = new StoreLock();
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
            const derived = deriveSenderKeyMsgKey(senderKey.iteration, senderKey.chainKey);
            await this.store.upsertSenderKey({
                ...senderKey,
                chainKey: derived.nextChainKey,
                iteration: derived.messageKey.iteration + 1
            });
            const distributionProto = proto.SenderKeyDistributionMessage.encode({
                id: senderKey.keyId,
                iteration: senderKey.iteration,
                chainKey: senderKey.chainKey,
                signingKey: senderKey.signingPublicKey
            }).finish();
            const distributionMessage = {
                groupId,
                axolotlSenderKeyDistributionMessage: prependVersion(distributionProto, SIGNAL_GROUP_VERSION)
            };
            const messagePayload = aesCbcEncryptFromSeed(derived.messageKey.seed, plaintext);
            const senderKeyMessage = proto.SenderKeyMessage.encode({
                id: senderKey.keyId,
                iteration: derived.messageKey.iteration,
                ciphertext: messagePayload
            }).finish();
            const versionedContent = prependVersion(senderKeyMessage, SIGNAL_GROUP_VERSION);
            const signature = await xeddsaSign(senderKey.signingPrivateKey, versionedContent);
            if (signature.length !== SIGNAL_SIGNATURE_LENGTH) {
                throw new Error(`invalid sender key signature length ${signature.length}`);
            }
            const ciphertext = {
                groupId,
                sender,
                keyId: senderKey.keyId,
                iteration: derived.messageKey.iteration,
                ciphertext: concatBytes([versionedContent, signature])
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
            const parsed = parseDistributionPayload(payload);
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
            const parsed = parseSenderKeyMessage(payload.ciphertext);
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
                const signedContent = parsed.versionContentMac.subarray(0, parsed.versionContentMac.length - SIGNAL_SIGNATURE_LENGTH);
                const signature = parsed.versionContentMac.subarray(parsed.versionContentMac.length - SIGNAL_SIGNATURE_LENGTH);
                const validSignature = await xeddsaVerify(toRawPubKey(senderKey.signingPublicKey), signedContent, signature);
                if (!validSignature) {
                    throw new Error('invalid sender key signature');
                }
            }
            const selected = selectMessageKey(senderKey, parsed.iteration, this.getFutureMessagesMax?.());
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
            X25519.generateKeyPair(),
            randomIntAsync(1, 2147483647),
            randomBytesAsync(32)
        ]);
        const created = {
            groupId,
            sender,
            keyId,
            iteration: 0,
            chainKey,
            signingPublicKey: toSerializedPubKey(signingKeyPair.pubKey),
            signingPrivateKey: signingKeyPair.privKey,
            unusedMessageKeys: []
        };
        await this.store.upsertSenderKey(created);
        return created;
    }
    runWithSenderLock(groupId, sender, task) {
        return this.senderLock.run(`senderKey:${groupId}:${signalAddressKey(sender)}`, task);
    }
}
