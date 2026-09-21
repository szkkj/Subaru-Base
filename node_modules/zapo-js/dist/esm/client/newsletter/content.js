import { assertMediaUploadStatus, parseMediaUploadJsonBody, performPlaintextMediaUpload } from '../media.js';
import { NEWSLETTER_MEDIA_UPLOAD_PATHS } from '../../media/constants.js';
import { createStickerPackZipStream } from '../../media/sticker/sticker-pack.js';
import { buildExtendedTextWithPreview } from '../../message/addons/link-preview/builder.js';
import { applyContextInfo } from '../../message/context-info.js';
import { isSendEventMessage, isSendEventResponseMessage, isSendKeepMessage, isSendMediaMessage, isSendPinMessage, isSendPollMessage, isSendPollVoteMessage, isSendReactionMessage, isSendRevokeMessage, isSendTextMessage, resolveEncMediaType, resolveMessageTypeAttr, unwrapMessage } from '../../message/encode/content.js';
import { toStickerPackProtoStickers, toStickerPackZipEntries, validateStickerPackInput } from '../../message/kinds/sticker-pack.js';
import { proto } from '../../proto.js';
import { WA_ENC_MEDIA_TYPES } from '../../protocol/message.js';
import { base64ToBytes } from '../../util/bytes.js';
import { toError } from '../../util/primitives.js';
export async function uploadNewsletterMedia(options, input) {
    const upload = await performPlaintextMediaUpload({
        mediaTransfer: options.mediaTransfer,
        mediaConn: input.mediaConn,
        logger: options.logger
    }, {
        source: input.media,
        path: NEWSLETTER_MEDIA_UPLOAD_PATHS[input.mediaKind],
        mimetype: input.mimetype,
        logLabel: 'sending newsletter media upload'
    });
    assertMediaUploadStatus(upload.status, 'newsletter media upload');
    const parsed = parseMediaUploadJsonBody(upload.responseBytes, 'newsletter media upload');
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
            ? base64ToBytes(parsed.thumbnail_info.thumbnail_sha256)
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
    WA_ENC_MEDIA_TYPES.AUDIO,
    WA_ENC_MEDIA_TYPES.DOCUMENT,
    WA_ENC_MEDIA_TYPES.GIF,
    WA_ENC_MEDIA_TYPES.IMAGE,
    WA_ENC_MEDIA_TYPES.PTT,
    WA_ENC_MEDIA_TYPES.PTV,
    WA_ENC_MEDIA_TYPES.STICKER,
    WA_ENC_MEDIA_TYPES.STICKER_PACK,
    WA_ENC_MEDIA_TYPES.URL,
    WA_ENC_MEDIA_TYPES.VCARD,
    WA_ENC_MEDIA_TYPES.VIDEO
]);
/**
 * Resolves the `plaintext` node `mediatype`. Shares the encrypted send path's
 * resolver so media without an upload still gets it - a link preview publishes
 * as `url`, a contact card as `vcard`; without it the channel drops the card.
 */
function pickMediaTypeFromMessage(message) {
    const mediaType = resolveEncMediaType(message);
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
            message: toError(error).message
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
export async function buildNewsletterMessageContent(options, content, ctx) {
    if (typeof content === 'string') {
        const message = applyContextInfo({ conversation: content }, ctx);
        return {
            kind: 'text',
            plaintext: proto.Message.encode(message).finish(),
            mediaType: null,
            upload: null
        };
    }
    if (isSendTextMessage(content)) {
        const preview = await resolveTextLinkPreview(options, content);
        const message = applyContextInfo(preview !== null
            ? buildExtendedTextWithPreview(content.text, preview.resolved, preview.thumbnailFields)
            : { extendedTextMessage: { text: content.text } }, ctx);
        const mediaType = pickMediaTypeFromMessage(message);
        return {
            kind: mediaType !== null ? 'media' : 'text',
            plaintext: proto.Message.encode(message).finish(),
            mediaType,
            upload: null
        };
    }
    if (isSendMediaMessage(content)) {
        if (!options.mediaTransfer || !options.getMediaConn) {
            throw new Error('newsletter media send requires mediaTransfer and getMediaConn dependencies');
        }
        const mediaConn = await options.getMediaConn();
        if (content.type === 'sticker-pack') {
            validateStickerPackInput(content);
            const upload = await uploadNewsletterMedia({ mediaTransfer: options.mediaTransfer, logger: options.logger }, {
                mediaKind: 'sticker-pack',
                media: createStickerPackZipStream(toStickerPackZipEntries(content)),
                mimetype: 'application/zip',
                mediaConn
            });
            const stickerPackMessage = {
                stickerPackId: content.stickerPackId,
                name: content.name,
                publisher: content.publisher,
                stickers: toStickerPackProtoStickers(content),
                fileLength: upload.fileLength,
                fileSha256: upload.fileSha256,
                directPath: upload.directPath,
                trayIconFileName: content.trayIcon.fileName,
                stickerPackSize: upload.fileLength,
                stickerPackOrigin: proto.Message.StickerPackMessage.StickerPackOrigin.USER_CREATED,
                caption: content.caption,
                packDescription: content.packDescription
            };
            const message = applyContextInfo({ stickerPackMessage }, ctx);
            return {
                kind: 'media',
                plaintext: proto.Message.encode(message).finish(),
                mediaType: WA_ENC_MEDIA_TYPES.STICKER_PACK,
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
        const message = applyContextInfo(buildMediaProtoMessage(content, upload), ctx);
        return {
            kind: 'media',
            plaintext: proto.Message.encode(message).finish(),
            mediaType: resolveSendMediaKind(content),
            upload
        };
    }
    if (isSendReactionMessage(content) || isSendRevokeMessage(content)) {
        throw new Error(`newsletter sends do not accept '${content.type}' content; use newsletter.react() or newsletter.revoke() instead`);
    }
    if (isSendPollVoteMessage(content)) {
        throw new Error("newsletter sends do not accept 'poll-vote' content; use newsletter.votePoll() instead");
    }
    if (isSendPollMessage(content) || isSendEventMessage(content)) {
        throw new Error(`newsletter sends do not accept typed '${content.type}' content; pass the raw Proto.IMessage instead`);
    }
    if (isSendPinMessage(content) ||
        isSendKeepMessage(content) ||
        isSendEventResponseMessage(content)) {
        throw new Error(`newsletter sends do not accept '${content.type}' content`);
    }
    const protoMessage = applyContextInfo(content, ctx);
    const inner = unwrapMessage(protoMessage);
    if (inner.reactionMessage ||
        inner.encReactionMessage ||
        inner.pollUpdateMessage ||
        inner.encEventResponseMessage ||
        inner.encCommentMessage ||
        inner.pinInChatMessage ||
        inner.keepInChatMessage ||
        inner.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
        throw new Error('newsletter sends do not accept addon/update protobuf payloads; use the newsletter helpers instead');
    }
    const messageTypeAttr = resolveMessageTypeAttr(protoMessage);
    const isPollCreation = messageTypeAttr === 'poll' &&
        Boolean(inner.pollCreationMessage ||
            inner.pollCreationMessageV2 ||
            inner.pollCreationMessageV3 ||
            inner.pollCreationMessageV5);
    const mediaTypeAttr = pickMediaTypeFromMessage(protoMessage);
    return {
        kind: isPollCreation ? 'poll-creation' : mediaTypeAttr ? 'media' : 'text',
        plaintext: proto.Message.encode(protoMessage).finish(),
        mediaType: mediaTypeAttr,
        upload: null
    };
}
