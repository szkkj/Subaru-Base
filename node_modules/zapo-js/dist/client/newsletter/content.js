"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadNewsletterMedia = uploadNewsletterMedia;
exports.buildNewsletterMessageContent = buildNewsletterMessageContent;
const media_1 = require("../media");
const constants_1 = require("../../media/constants");
const sticker_pack_1 = require("../../media/sticker/sticker-pack");
const builder_1 = require("../../message/addons/link-preview/builder");
const context_info_1 = require("../../message/context-info");
const content_1 = require("../../message/encode/content");
const sticker_pack_2 = require("../../message/kinds/sticker-pack");
const _proto_1 = require("../../proto");
const message_1 = require("../../protocol/message");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
async function uploadNewsletterMedia(options, input) {
    const upload = await (0, media_1.performPlaintextMediaUpload)({
        mediaTransfer: options.mediaTransfer,
        mediaConn: input.mediaConn,
        logger: options.logger
    }, {
        source: input.media,
        path: constants_1.NEWSLETTER_MEDIA_UPLOAD_PATHS[input.mediaKind],
        mimetype: input.mimetype,
        logLabel: 'sending newsletter media upload'
    });
    (0, media_1.assertMediaUploadStatus)(upload.status, 'newsletter media upload');
    const parsed = (0, media_1.parseMediaUploadJsonBody)(upload.responseBytes, 'newsletter media upload');
    if (!parsed.url || !parsed.direct_path) {
        throw new Error('newsletter media upload response missing url/direct_path');
    }
    return {
        url: parsed.url,
        directPath: parsed.direct_path,
        handle: parsed.handle,
        metadataUrl: parsed.metadata_url,
        thumbnailDirectPath: parsed.thumbnail_info?.thumbnail_direct_path,
        thumbnailSha256: parsed.thumbnail_info?.thumbnail_sha256
            ? (0, bytes_1.base64ToBytes)(parsed.thumbnail_info.thumbnail_sha256)
            : undefined,
        fileSha256: upload.fileSha256,
        fileLength: upload.byteLength,
        mediaId: upload.mediaId
    };
}
function resolveSendMediaKind(content) {
    if (content.type === 'video' && content.gifPlayback)
        return 'gif';
    if (content.type === 'audio' && content.ptt)
        return 'ptt';
    return content.type;
}
/** Enc media types a channel publish accepts; anything else ships as text. */
const NEWSLETTER_MEDIA_TYPES = new Set([
    message_1.WA_ENC_MEDIA_TYPES.AUDIO,
    message_1.WA_ENC_MEDIA_TYPES.DOCUMENT,
    message_1.WA_ENC_MEDIA_TYPES.GIF,
    message_1.WA_ENC_MEDIA_TYPES.IMAGE,
    message_1.WA_ENC_MEDIA_TYPES.PTT,
    message_1.WA_ENC_MEDIA_TYPES.PTV,
    message_1.WA_ENC_MEDIA_TYPES.STICKER,
    message_1.WA_ENC_MEDIA_TYPES.STICKER_PACK,
    message_1.WA_ENC_MEDIA_TYPES.URL,
    message_1.WA_ENC_MEDIA_TYPES.VCARD,
    message_1.WA_ENC_MEDIA_TYPES.VIDEO
]);
/**
 * Resolves the `plaintext` node `mediatype`. Shares the encrypted send path's
 * resolver so media without an upload still gets it - a link preview publishes
 * as `url`, a contact card as `vcard`; without it the channel drops the card.
 */
function pickMediaTypeFromMessage(message) {
    const mediaType = (0, content_1.resolveEncMediaType)(message);
    return mediaType !== null && NEWSLETTER_MEDIA_TYPES.has(mediaType) ? mediaType : null;
}
async function resolveTextLinkPreview(options, content) {
    if (!options.linkPreviewResolver)
        return null;
    try {
        return await options.linkPreviewResolver(content);
    }
    catch (error) {
        options.logger.warn('link preview resolver failed, sending plain text', {
            message: (0, primitives_1.toError)(error).message
        });
        return null;
    }
}
function buildMediaProtoMessage(content, upload) {
    const common = {
        url: upload.url,
        directPath: upload.directPath,
        mimetype: 'mimetype' in content ? content.mimetype : undefined,
        fileSha256: upload.fileSha256,
        fileLength: upload.fileLength
    };
    switch (content.type) {
        case 'image':
            return {
                imageMessage: {
                    ...content,
                    ...common,
                    type: undefined,
                    media: undefined
                }
            };
        case 'video':
            return {
                videoMessage: {
                    ...content,
                    ...common,
                    type: undefined,
                    media: undefined
                }
            };
        case 'ptv':
            return {
                ptvMessage: {
                    ...content,
                    ...common,
                    type: undefined,
                    media: undefined
                }
            };
        case 'audio':
            return {
                audioMessage: {
                    ...content,
                    ...common,
                    type: undefined,
                    media: undefined
                }
            };
        case 'document':
            return {
                documentMessage: {
                    ...content,
                    ...common,
                    type: undefined,
                    media: undefined
                }
            };
        case 'sticker':
            return {
                stickerMessage: {
                    ...content,
                    ...common,
                    mimetype: common.mimetype ?? 'image/webp',
                    type: undefined,
                    media: undefined
                }
            };
    }
}
function toUploadMedia(media) {
    if (media instanceof Uint8Array)
        return media;
    if (media instanceof ArrayBuffer)
        return new Uint8Array(media);
    return media;
}
async function buildNewsletterMessageContent(options, content, ctx) {
    if (typeof content === 'string') {
        const message = (0, context_info_1.applyContextInfo)({ conversation: content }, ctx);
        return {
            kind: 'text',
            plaintext: _proto_1.proto.Message.encode(message).finish(),
            mediaType: null,
            upload: null
        };
    }
    if ((0, content_1.isSendTextMessage)(content)) {
        const preview = await resolveTextLinkPreview(options, content);
        const message = (0, context_info_1.applyContextInfo)(preview !== null
            ? (0, builder_1.buildExtendedTextWithPreview)(content.text, preview.resolved, preview.thumbnailFields)
            : { extendedTextMessage: { text: content.text } }, ctx);
        const mediaType = pickMediaTypeFromMessage(message);
        return {
            kind: mediaType !== null ? 'media' : 'text',
            plaintext: _proto_1.proto.Message.encode(message).finish(),
            mediaType,
            upload: null
        };
    }
    if ((0, content_1.isSendMediaMessage)(content)) {
        if (!options.mediaTransfer || !options.getMediaConn) {
            throw new Error('newsletter media send requires mediaTransfer and getMediaConn dependencies');
        }
        const mediaConn = await options.getMediaConn();
        if (content.type === 'sticker-pack') {
            (0, sticker_pack_2.validateStickerPackInput)(content);
            const upload = await uploadNewsletterMedia({ mediaTransfer: options.mediaTransfer, logger: options.logger }, {
                mediaKind: 'sticker-pack',
                media: (0, sticker_pack_1.createStickerPackZipStream)((0, sticker_pack_2.toStickerPackZipEntries)(content)),
                mimetype: 'application/zip',
                mediaConn
            });
            const stickerPackMessage = {
                stickerPackId: content.stickerPackId,
                name: content.name,
                publisher: content.publisher,
                stickers: (0, sticker_pack_2.toStickerPackProtoStickers)(content),
                fileLength: upload.fileLength,
                fileSha256: upload.fileSha256,
                directPath: upload.directPath,
                trayIconFileName: content.trayIcon.fileName,
                stickerPackSize: upload.fileLength,
                stickerPackOrigin: _proto_1.proto.Message.StickerPackMessage.StickerPackOrigin.USER_CREATED,
                caption: content.caption,
                packDescription: content.packDescription
            };
            const message = (0, context_info_1.applyContextInfo)({ stickerPackMessage }, ctx);
            return {
                kind: 'media',
                plaintext: _proto_1.proto.Message.encode(message).finish(),
                mediaType: message_1.WA_ENC_MEDIA_TYPES.STICKER_PACK,
                upload
            };
        }
        const explicitMimetype = 'mimetype' in content && content.mimetype ? content.mimetype : null;
        const resolvedMimetype = explicitMimetype ?? (content.type === 'sticker' ? 'image/webp' : null);
        if (!resolvedMimetype) {
            throw new Error(`newsletter media send requires explicit mimetype for ${content.type} content`);
        }
        const upload = await uploadNewsletterMedia({ mediaTransfer: options.mediaTransfer, logger: options.logger }, {
            mediaKind: resolveSendMediaKind(content),
            media: toUploadMedia(content.media),
            mimetype: resolvedMimetype,
            mediaConn
        });
        const message = (0, context_info_1.applyContextInfo)(buildMediaProtoMessage(content, upload), ctx);
        return {
            kind: 'media',
            plaintext: _proto_1.proto.Message.encode(message).finish(),
            mediaType: resolveSendMediaKind(content),
            upload
        };
    }
    if ((0, content_1.isSendReactionMessage)(content) || (0, content_1.isSendRevokeMessage)(content)) {
        throw new Error(`newsletter sends do not accept '${content.type}' content; use newsletter.react() or newsletter.revoke() instead`);
    }
    if ((0, content_1.isSendPollVoteMessage)(content)) {
        throw new Error("newsletter sends do not accept 'poll-vote' content; use newsletter.votePoll() instead");
    }
    if ((0, content_1.isSendPollMessage)(content) || (0, content_1.isSendEventMessage)(content)) {
        throw new Error(`newsletter sends do not accept typed '${content.type}' content; pass the raw Proto.IMessage instead`);
    }
    if ((0, content_1.isSendPinMessage)(content) ||
        (0, content_1.isSendKeepMessage)(content) ||
        (0, content_1.isSendEventResponseMessage)(content)) {
        throw new Error(`newsletter sends do not accept '${content.type}' content`);
    }
    const protoMessage = (0, context_info_1.applyContextInfo)(content, ctx);
    const inner = (0, content_1.unwrapMessage)(protoMessage);
    if (inner.reactionMessage ||
        inner.encReactionMessage ||
        inner.pollUpdateMessage ||
        inner.encEventResponseMessage ||
        inner.encCommentMessage ||
        inner.pinInChatMessage ||
        inner.keepInChatMessage ||
        inner.protocolMessage?.type === _proto_1.proto.Message.ProtocolMessage.Type.REVOKE) {
        throw new Error('newsletter sends do not accept addon/update protobuf payloads; use the newsletter helpers instead');
    }
    const messageTypeAttr = (0, content_1.resolveMessageTypeAttr)(protoMessage);
    const isPollCreation = messageTypeAttr === 'poll' &&
        Boolean(inner.pollCreationMessage ||
            inner.pollCreationMessageV2 ||
            inner.pollCreationMessageV3 ||
            inner.pollCreationMessageV5);
    const mediaTypeAttr = pickMediaTypeFromMessage(protoMessage);
    return {
        kind: isPollCreation ? 'poll-creation' : mediaTypeAttr ? 'media' : 'text',
        plaintext: _proto_1.proto.Message.encode(protoMessage).finish(),
        mediaType: mediaTypeAttr,
        upload: null
    };
}
