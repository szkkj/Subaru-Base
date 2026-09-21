"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaRetryReplayService = void 0;
const icdc_1 = require("../message/crypto/icdc");
const device_sent_1 = require("../message/encode/device-sent");
const padding_1 = require("../message/encode/padding");
const _proto_1 = require("../proto");
const constants_1 = require("../protocol/constants");
const jid_1 = require("../protocol/jid");
const codec_1 = require("./codec");
const binary_1 = require("../transport/binary");
const message_1 = require("../transport/node/builders/message");
const helpers_1 = require("../transport/node/helpers");
const primitives_1 = require("../util/primitives");
/**
 * Replays a previously-sent outbound message in response to an incoming
 * retry receipt. Dispatches to plaintext/encrypted/opaque-node handlers
 * based on the stored payload shape.
 */
class WaRetryReplayService {
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
            ? (0, codec_1.decodeRetryReplayPayload)(outbound.replayPayload)
            : outbound.replayPayload;
        const requesterParsed = (0, jid_1.parseJidFull)(requesterJid);
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
        if ((0, jid_1.isGroupOrBroadcastJid)(payload.to)) {
            return this.resendGroupPlaintextPayload(outbound, payload, requesterJid, requesterAddress, retryCount);
        }
        let payloadUserJid;
        let requesterUserJid;
        try {
            payloadUserJid = (0, jid_1.toUserJid)(payload.to);
            requesterUserJid = (0, jid_1.toUserJid)(requesterJid);
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
        const metaNode = (0, jid_1.isHostedDeviceJid)(requesterJid)
            ? (0, message_1.buildMetaNode)({ sender_intent: 'hosted' })
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
        return _proto_1.proto.ADVSignedDeviceIdentity.encode(signedIdentity).finish();
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
            recipientUserJid = (0, jid_1.toUserJid)(requesterJid);
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
                message: (0, primitives_1.toError)(error).message
            });
            return undefined;
        }
    }
    async refreshRetryPlaintext(payload, options) {
        if (!options.wrapAsDeviceSent && !this.options.resolveUserIcdc) {
            return null;
        }
        try {
            const messageBytes = (0, padding_1.unpadPkcs7)(payload.plaintext);
            const decoded = _proto_1.proto.Message.decode(messageBytes);
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
                const injected = (0, icdc_1.injectDeviceListMetadata)(message, senderIcdc, recipientIcdc);
                if (injected !== message) {
                    message = injected;
                    changed = true;
                }
            }
            if (options.wrapAsDeviceSent && !message.deviceSentMessage) {
                message = (0, device_sent_1.wrapDeviceSentMessage)(message, payload.to);
                changed = true;
            }
            if (!changed) {
                return null;
            }
            return (0, padding_1.writeRandomPadMax16)(_proto_1.proto.Message.encode(message).finish());
        }
        catch (error) {
            this.options.logger.warn('retry request failed to refresh plaintext', {
                context: options.logContext,
                to: payload.to,
                message: (0, primitives_1.toError)(error).message
            });
            return null;
        }
    }
    safeUserJid(jid) {
        if (!jid)
            return null;
        try {
            return (0, jid_1.toUserJid)(jid);
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
        const isStatus = (0, jid_1.isStatusBroadcastJid)(payload.to);
        const metaAttrs = {};
        if (isStatus) {
            metaAttrs.status_setting = payload.statusSetting ?? 'contacts';
        }
        if ((0, jid_1.isHostedDeviceJid)(requesterJid)) {
            metaAttrs.sender_intent = 'hosted';
        }
        const metaNode = Object.keys(metaAttrs).length > 0 ? (0, message_1.buildMetaNode)(metaAttrs) : undefined;
        const retryNode = (0, message_1.buildGroupRetryMessageNode)({
            to: payload.to,
            type: payload.type,
            id: outbound.messageId,
            requesterJid,
            addressingMode: isStatus
                ? undefined
                : requesterAddress.server === constants_1.WA_DEFAULTS.LID_SERVER
                    ? constants_1.WA_ADDRESSING_MODES.LID
                    : constants_1.WA_ADDRESSING_MODES.PN,
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
        if ((0, jid_1.normalizeDeviceJid)(payload.to) !== normalizedRequesterJid) {
            return 'ineligible';
        }
        const deviceIdentity = payload.encType === 'pkmsg'
            ? this.resolveSignedDeviceIdentity('encrypted_replay')
            : undefined;
        const metaNode = (0, jid_1.isHostedDeviceJid)(requesterJid)
            ? (0, message_1.buildMetaNode)({ sender_intent: 'hosted' })
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
        const decoded = (0, binary_1.decodeBinaryNode)(payload.node);
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
        const requesterUser = (0, jid_1.toUserJid)(requesterJid);
        const credentials = this.options.getCurrentCredentials();
        if (credentials?.meJid && (0, jid_1.toUserJid)(credentials.meJid) === requesterUser) {
            return true;
        }
        if (credentials?.meLid && (0, jid_1.toUserJid)(credentials.meLid) === requesterUser) {
            return true;
        }
        return false;
    }
    isOpaqueReplayCompatible(node, normalizedRequesterJid) {
        const participantsNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.PARTICIPANTS);
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
            return (0, jid_1.normalizeDeviceJid)(participantJid) === normalizedRequesterJid;
        }
        if (node.attrs.participant) {
            return (0, jid_1.normalizeDeviceJid)(node.attrs.participant) === normalizedRequesterJid;
        }
        if (node.attrs.to)
            return (0, jid_1.normalizeDeviceJid)(node.attrs.to) === normalizedRequesterJid;
        return false;
    }
}
exports.WaRetryReplayService = WaRetryReplayService;
