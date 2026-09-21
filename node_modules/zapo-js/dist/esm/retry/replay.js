import { injectDeviceListMetadata } from '../message/crypto/icdc.js';
import { wrapDeviceSentMessage } from '../message/encode/device-sent.js';
import { unpadPkcs7, writeRandomPadMax16 } from '../message/encode/padding.js';
import { proto } from '../proto.js';
import { WA_ADDRESSING_MODES, WA_DEFAULTS, WA_NODE_TAGS } from '../protocol/constants.js';
import { isGroupOrBroadcastJid, isHostedDeviceJid, isStatusBroadcastJid, normalizeDeviceJid, parseJidFull, toUserJid } from '../protocol/jid.js';
import { decodeRetryReplayPayload } from './codec.js';
import { decodeBinaryNode } from '../transport/binary/index.js';
import { buildGroupRetryMessageNode, buildMetaNode } from '../transport/node/builders/message.js';
import { findNodeChild } from '../transport/node/helpers.js';
import { toError } from '../util/primitives.js';
/**
 * Replays a previously-sent outbound message in response to an incoming
 * retry receipt. Dispatches to plaintext/encrypted/opaque-node handlers
 * based on the stored payload shape.
 */
export class WaRetryReplayService {
    constructor(options) {
        this.options = options;
    }
    /**
     * Resends `outbound` to `requesterJid`. Returns `'resent'` on a fresh
     * send or `'ineligible'` when the cached payload cannot satisfy the
     * request (e.g. requester not in the original device list).
     */
    async resendOutboundMessage(outbound, requesterJid, retryCount) {
        const payload = outbound.replayPayload instanceof Uint8Array
            ? decodeRetryReplayPayload(outbound.replayPayload)
            : outbound.replayPayload;
        const requesterParsed = parseJidFull(requesterJid);
        const requesterAddress = requesterParsed.address;
        const normalizedRequesterJid = requesterParsed.normalizedJid;
        if (payload.mode === 'plaintext') {
            return this.resendPlaintextPayload(outbound, payload, requesterJid, requesterAddress, retryCount);
        }
        if (payload.mode === 'encrypted') {
            return this.resendEncryptedPayload(outbound, payload, requesterJid, normalizedRequesterJid, retryCount);
        }
        return this.resendOpaquePayload(outbound, payload, normalizedRequesterJid);
    }
    async resendPlaintextPayload(outbound, payload, requesterJid, requesterAddress, retryCount) {
        if (isGroupOrBroadcastJid(payload.to)) {
            return this.resendGroupPlaintextPayload(outbound, payload, requesterJid, requesterAddress, retryCount);
        }
        let payloadUserJid;
        let requesterUserJid;
        try {
            payloadUserJid = toUserJid(payload.to);
            requesterUserJid = toUserJid(requesterJid);
        }
        catch {
            return 'ineligible';
        }
        const requesterIsSelf = this.isRequesterCurrentAccount(requesterJid);
        if (payloadUserJid !== requesterUserJid && !requesterIsSelf) {
            return 'ineligible';
        }
        const plaintext = (await this.refreshRetryPlaintext(payload, {
            wrapAsDeviceSent: requesterIsSelf,
            includeRecipientIcdc: true,
            logContext: 'direct'
        })) ?? payload.plaintext;
        await this.options.sessionResolver.ensureSession(requesterAddress, requesterJid);
        const encrypted = await this.options.signalProtocol.encryptMessage(requesterAddress, plaintext);
        const deviceIdentity = encrypted.type === 'pkmsg' ? this.resolveSignedDeviceIdentity('direct') : undefined;
        const metaNode = isHostedDeviceJid(requesterJid)
            ? buildMetaNode({ sender_intent: 'hosted' })
            : undefined;
        const privacyTokenNode = requesterIsSelf
            ? undefined
            : await this.resolvePrivacyToken(requesterJid);
        await this.options.messageClient.sendEncrypted({
            to: requesterJid,
            encType: encrypted.type,
            ciphertext: encrypted.ciphertext,
            encCount: retryCount,
            id: outbound.messageId,
            type: payload.type,
            deviceIdentity,
            metaNode,
            privacyTokenNode
        });
        return 'resent';
    }
    resolveSignedDeviceIdentity(context) {
        const signedIdentity = this.options.getCurrentCredentials()?.signedIdentity;
        if (!signedIdentity) {
            if (!this.options.isMobilePrimary?.()) {
                this.options.logger.warn('retry request missing signed identity for pkmsg envelope', { context });
            }
            return undefined;
        }
        return proto.ADVSignedDeviceIdentity.encode(signedIdentity).finish();
    }
    /**
     * Resolves the trusted-contact token node for the requester's user jid. A
     * failure (or absent resolver) yields no node and the resend still goes out.
     */
    async resolvePrivacyToken(requesterJid) {
        if (!this.options.resolvePrivacyTokenNode) {
            return undefined;
        }
        let recipientUserJid;
        try {
            recipientUserJid = toUserJid(requesterJid);
        }
        catch {
            return undefined;
        }
        try {
            return (await this.options.resolvePrivacyTokenNode(recipientUserJid)) ?? undefined;
        }
        catch (error) {
            this.options.logger.warn('retry resend privacy token resolution failed', {
                to: recipientUserJid,
                message: toError(error).message
            });
            return undefined;
        }
    }
    async refreshRetryPlaintext(payload, options) {
        if (!options.wrapAsDeviceSent && !this.options.resolveUserIcdc) {
            return null;
        }
        try {
            const messageBytes = unpadPkcs7(payload.plaintext);
            const decoded = proto.Message.decode(messageBytes);
            let message = decoded;
            let changed = false;
            if (this.options.resolveUserIcdc) {
                const meUserJid = this.safeUserJid(this.options.getCurrentCredentials()?.meJid);
                const recipientUserJid = options.includeRecipientIcdc
                    ? this.safeUserJid(payload.to)
                    : null;
                const [senderIcdc, recipientIcdc] = await Promise.all([
                    meUserJid ? this.options.resolveUserIcdc(meUserJid) : Promise.resolve(null),
                    recipientUserJid
                        ? this.options.resolveUserIcdc(recipientUserJid)
                        : Promise.resolve(null)
                ]);
                const injected = injectDeviceListMetadata(message, senderIcdc, recipientIcdc);
                if (injected !== message) {
                    message = injected;
                    changed = true;
                }
            }
            if (options.wrapAsDeviceSent && !message.deviceSentMessage) {
                message = wrapDeviceSentMessage(message, payload.to);
                changed = true;
            }
            if (!changed) {
                return null;
            }
            return writeRandomPadMax16(proto.Message.encode(message).finish());
        }
        catch (error) {
            this.options.logger.warn('retry request failed to refresh plaintext', {
                context: options.logContext,
                to: payload.to,
                message: toError(error).message
            });
            return null;
        }
    }
    safeUserJid(jid) {
        if (!jid)
            return null;
        try {
            return toUserJid(jid);
        }
        catch {
            return null;
        }
    }
    async resendGroupPlaintextPayload(outbound, payload, requesterJid, requesterAddress, retryCount) {
        const plaintext = (await this.refreshRetryPlaintext(payload, {
            wrapAsDeviceSent: this.isRequesterCurrentAccount(requesterJid),
            includeRecipientIcdc: false,
            logContext: 'group'
        })) ?? payload.plaintext;
        const encrypted = await this.options.signalProtocol.encryptMessage(requesterAddress, plaintext);
        const deviceIdentity = encrypted.type === 'pkmsg' ? this.resolveSignedDeviceIdentity('group') : undefined;
        const isStatus = isStatusBroadcastJid(payload.to);
        const metaAttrs = {};
        if (isStatus) {
            metaAttrs.status_setting = payload.statusSetting ?? 'contacts';
        }
        if (isHostedDeviceJid(requesterJid)) {
            metaAttrs.sender_intent = 'hosted';
        }
        const metaNode = Object.keys(metaAttrs).length > 0 ? buildMetaNode(metaAttrs) : undefined;
        const retryNode = buildGroupRetryMessageNode({
            to: payload.to,
            type: payload.type,
            id: outbound.messageId,
            requesterJid,
            addressingMode: isStatus
                ? undefined
                : requesterAddress.server === WA_DEFAULTS.LID_SERVER
                    ? WA_ADDRESSING_MODES.LID
                    : WA_ADDRESSING_MODES.PN,
            encType: encrypted.type,
            ciphertext: encrypted.ciphertext,
            retryCount,
            deviceIdentity,
            metaNode
        });
        await this.options.messageClient.sendMessageNode(retryNode);
        return 'resent';
    }
    async resendEncryptedPayload(outbound, payload, requesterJid, normalizedRequesterJid, retryCount) {
        if (payload.encType === 'skmsg') {
            return 'ineligible';
        }
        if (normalizeDeviceJid(payload.to) !== normalizedRequesterJid) {
            return 'ineligible';
        }
        const deviceIdentity = payload.encType === 'pkmsg'
            ? this.resolveSignedDeviceIdentity('encrypted_replay')
            : undefined;
        const metaNode = isHostedDeviceJid(requesterJid)
            ? buildMetaNode({ sender_intent: 'hosted' })
            : undefined;
        const privacyTokenNode = this.isRequesterCurrentAccount(requesterJid)
            ? undefined
            : await this.resolvePrivacyToken(requesterJid);
        await this.options.messageClient.sendEncrypted({
            to: requesterJid,
            encType: payload.encType,
            ciphertext: payload.ciphertext,
            encCount: retryCount,
            id: outbound.messageId,
            type: payload.type,
            participant: payload.participant,
            deviceIdentity,
            metaNode,
            privacyTokenNode
        });
        return 'resent';
    }
    async resendOpaquePayload(outbound, payload, normalizedRequesterJid) {
        const decoded = decodeBinaryNode(payload.node);
        if (!this.isOpaqueReplayCompatible(decoded, normalizedRequesterJid)) {
            return 'ineligible';
        }
        const replayNode = decoded.attrs.id === outbound.messageId
            ? decoded
            : {
                ...decoded,
                attrs: {
                    ...decoded.attrs,
                    id: outbound.messageId
                }
            };
        await this.options.messageClient.sendMessageNode(replayNode);
        return 'resent';
    }
    isRequesterCurrentAccount(requesterJid) {
        const requesterUser = toUserJid(requesterJid);
        const credentials = this.options.getCurrentCredentials();
        if (credentials?.meJid && toUserJid(credentials.meJid) === requesterUser) {
            return true;
        }
        if (credentials?.meLid && toUserJid(credentials.meLid) === requesterUser) {
            return true;
        }
        return false;
    }
    isOpaqueReplayCompatible(node, normalizedRequesterJid) {
        const participantsNode = findNodeChild(node, WA_NODE_TAGS.PARTICIPANTS);
        if (participantsNode) {
            const participantsContent = Array.isArray(participantsNode.content)
                ? participantsNode.content
                : [];
            let participantNode;
            let participantCount = 0;
            for (let index = 0; index < participantsContent.length; index++) {
                const child = participantsContent[index];
                if (child.tag !== 'to')
                    continue;
                participantCount++;
                if (participantCount > 1)
                    return false;
                participantNode = child;
            }
            if (participantCount !== 1 || !participantNode)
                return false;
            const participantJid = participantNode.attrs.jid;
            if (!participantJid)
                return false;
            return normalizeDeviceJid(participantJid) === normalizedRequesterJid;
        }
        if (node.attrs.participant) {
            return normalizeDeviceJid(node.attrs.participant) === normalizedRequesterJid;
        }
        if (node.attrs.to)
            return normalizeDeviceJid(node.attrs.to) === normalizedRequesterJid;
        return false;
    }
}
