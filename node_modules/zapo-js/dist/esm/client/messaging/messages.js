import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { assertMediaUploadStatus, buildMediaUploadUrl, cleanupTempFile, getScopedMediaLogger, hasMediaProcessingTasks, isReadableStream, parseMediaUploadJsonBody, parseWebpAnimation, readFileHead, resolveMediaInputs, runMediaProcessor, selectMediaUploadHost, shouldNormalizeVoiceNote } from '../media.js';
import { aesGcmEncrypt, randomBytesAsync, sha256 } from '../../crypto/index.js';
import { MEDIA_CONN_CACHE_GRACE_MS, MEDIA_UPLOAD_PATHS } from '../../media/constants.js';
import { WaMediaCrypto } from '../../media/crypto/WaMediaCrypto.js';
import { createStickerPackZipStream } from '../../media/sticker/sticker-pack.js';
import { parseMediaConnResponse } from '../../media/transfer/conn.js';
import { buildExtendedTextWithPreview } from '../../message/addons/link-preview/builder.js';
import { buildAddonAdditionalData, shouldUseAddonAdditionalData } from '../../message/crypto/addon-crypto.js';
import { createUseCaseSecret, WA_USE_CASE_SECRET_MODIFICATION_TYPES } from '../../message/crypto/use-case-secret.js';
import { isSendEventMessage, isSendEventResponseMessage, isSendKeepMessage, isSendMediaMessage, isSendPinMessage, isSendPollMessage, isSendPollVoteMessage, isSendReactionMessage, isSendRevokeMessage, isSendTextMessage, resolveMessageTarget } from '../../message/encode/content.js';
import { toStickerPackProtoStickers, toStickerPackZipEntries, validateStickerPackInput } from '../../message/kinds/sticker-pack.js';
import { proto } from '../../proto.js';
import { WA_DEFAULTS } from '../../protocol/constants.js';
import { isBroadcastJid, isGroupJid, toUserJid } from '../../protocol/jid.js';
import { buildMediaConnIq } from '../../transport/node/builders/media.js';
import { bytesToBase64, TEXT_ENCODER, toBytesView } from '../../util/bytes.js';
import { toError } from '../../util/primitives.js';
const VOICE_NOTE_MIMETYPE = 'audio/ogg; codecs=opus';
function requireCtxField(ctx, field, kind) {
    const value = ctx ? ctx[field] : undefined;
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`${kind} message requires ${field} in build context`);
    }
}
function buildMessageKey(remoteJid, fromMe, id, participant) {
    return {
        remoteJid,
        fromMe,
        id,
        ...(participant ? { participant } : {})
    };
}
/**
 * Builds the proto key for a reply/edit/reaction/revoke/pin target. `remoteJid`
 * is forced to the send recipient and `participant` is dropped in 1:1 chats
 * (only meaningful in groups/broadcasts).
 */
function targetMessageKey(remoteJid, key) {
    const inGroup = isGroupJid(remoteJid) || isBroadcastJid(remoteJid);
    return buildMessageKey(remoteJid, key.fromMe, key.id, inGroup ? key.participant : undefined);
}
function buildReactionMessage(content, serverClock, ctx) {
    requireCtxField(ctx, 'to', 'reaction');
    return {
        reactionMessage: {
            key: targetMessageKey(ctx.to, resolveMessageTarget(content.target)),
            text: content.emoji,
            senderTimestampMs: content.senderTimestampMs ?? serverClock.nowMs()
        }
    };
}
function buildRevokeMessage(content, ctx) {
    requireCtxField(ctx, 'to', 'revoke');
    return {
        protocolMessage: {
            type: proto.Message.ProtocolMessage.Type.REVOKE,
            key: targetMessageKey(ctx.to, resolveMessageTarget(content.target))
        }
    };
}
// wa-web default pin expiry preset (24h). Receivers drop pins that arrive
// without a duration, so always advertise one. Override via `durationSecs`.
const WA_PIN_DEFAULT_DURATION_SECS = 86400;
function buildPinMessage(content, serverClock, ctx) {
    requireCtxField(ctx, 'to', content.type);
    const isPin = content.type === 'pin';
    return {
        pinInChatMessage: {
            key: targetMessageKey(ctx.to, resolveMessageTarget(content.target)),
            type: isPin
                ? proto.Message.PinInChatMessage.Type.PIN_FOR_ALL
                : proto.Message.PinInChatMessage.Type.UNPIN_FOR_ALL,
            senderTimestampMs: content.senderTimestampMs ?? serverClock.nowMs()
        },
        messageContextInfo: {
            messageAddOnDurationInSecs: isPin
                ? (content.durationSecs ?? WA_PIN_DEFAULT_DURATION_SECS)
                : 0
        }
    };
}
function buildKeepMessage(content, serverClock, ctx) {
    requireCtxField(ctx, 'to', content.type);
    return {
        keepInChatMessage: {
            key: targetMessageKey(ctx.to, resolveMessageTarget(content.target)),
            keepType: content.type === 'keep'
                ? proto.KeepType.KEEP_FOR_ALL
                : proto.KeepType.UNDO_KEEP_FOR_ALL,
            timestampMs: content.timestampMs ?? serverClock.nowMs()
        }
    };
}
function buildPollCreationMessage(content) {
    if (content.options.length === 0) {
        throw new Error('poll message requires at least one option');
    }
    const options = content.options.map((opt) => ({
        optionName: typeof opt === 'string' ? opt : opt.name
    }));
    const selectableOptionsCount = content.selectableCount ?? 1;
    const allowAddOption = content.allowAddOption === true;
    const hideParticipantName = content.hideParticipantName === true;
    const pollBody = {
        name: content.name,
        options,
        selectableOptionsCount,
        ...(allowAddOption ? { allowAddOption: true } : {}),
        ...(hideParticipantName ? { hideParticipantName: true } : {})
    };
    if (allowAddOption || hideParticipantName) {
        return { pollCreationMessageV6: pollBody };
    }
    if (selectableOptionsCount === 1) {
        return { pollCreationMessageV3: pollBody };
    }
    return { pollCreationMessage: pollBody };
}
function buildEventMessage(content) {
    const eventMessage = {
        name: content.name,
        startTime: content.startTime,
        isCanceled: content.isCanceled ?? false
    };
    if (content.description !== undefined)
        eventMessage.description = content.description;
    if (content.endTime !== undefined)
        eventMessage.endTime = content.endTime;
    if (content.joinLink !== undefined)
        eventMessage.joinLink = content.joinLink;
    if (content.extraGuestsAllowed !== undefined)
        eventMessage.extraGuestsAllowed = content.extraGuestsAllowed;
    if (content.isScheduleCall !== undefined)
        eventMessage.isScheduleCall = content.isScheduleCall;
    if (content.hasReminder !== undefined)
        eventMessage.hasReminder = content.hasReminder;
    if (content.reminderOffsetSec !== undefined)
        eventMessage.reminderOffsetSec = content.reminderOffsetSec;
    if (content.location) {
        eventMessage.location = {
            degreesLatitude: content.location.latitude,
            degreesLongitude: content.location.longitude,
            ...(content.location.name !== undefined ? { name: content.location.name } : {}),
            ...(content.location.address !== undefined ? { address: content.location.address } : {})
        };
    }
    return { eventMessage };
}
const EVENT_RESPONSE_ENUM = {
    going: proto.Message.EventResponseMessage.EventResponseType.GOING,
    not_going: proto.Message.EventResponseMessage.EventResponseType.NOT_GOING,
    maybe: proto.Message.EventResponseMessage.EventResponseType.MAYBE
};
async function encryptAddonForOutgoing(input) {
    const secret = await createUseCaseSecret({
        messageSecret: input.messageSecret,
        stanzaId: input.parentStanzaId,
        parentMsgOriginalSender: input.parentMsgOriginalSender,
        modificationSender: input.modificationSender,
        modificationType: input.modificationType
    });
    const iv = await randomBytesAsync(12);
    const additionalData = shouldUseAddonAdditionalData(input.modificationType)
        ? buildAddonAdditionalData(input.parentStanzaId, input.modificationSender)
        : undefined;
    const encPayload = aesGcmEncrypt(secret, iv, input.payload, additionalData);
    return { encPayload, encIv: iv };
}
async function buildPollVoteMessage(content, serverClock, ctx) {
    requireCtxField(ctx, 'outgoingStanzaId', 'poll-vote');
    requireCtxField(ctx, 'meJid', 'poll-vote');
    if (content.selectedOptionNames.length === 0) {
        throw new Error('poll-vote requires at least one selected option');
    }
    const selectedOptions = content.selectedOptionNames.map((name) => sha256(TEXT_ENCODER.encode(name)));
    const payload = proto.Message.PollVoteMessage.encode({ selectedOptions }).finish();
    const { encPayload, encIv } = await encryptAddonForOutgoing({
        messageSecret: content.poll.messageSecret,
        parentStanzaId: content.poll.id,
        parentMsgOriginalSender: toUserJid(content.poll.authorJid),
        modificationSender: toUserJid(ctx.meJid),
        modificationType: WA_USE_CASE_SECRET_MODIFICATION_TYPES.POLL_VOTE,
        payload
    });
    return {
        pollUpdateMessage: {
            pollCreationMessageKey: buildMessageKey(ctx.to, content.poll.fromMe, content.poll.id, content.poll.participant),
            vote: { encPayload, encIv },
            senderTimestampMs: content.senderTimestampMs ?? serverClock.nowMs()
        }
    };
}
async function buildEventResponseMessage(content, serverClock, ctx) {
    requireCtxField(ctx, 'outgoingStanzaId', 'event-response');
    requireCtxField(ctx, 'meJid', 'event-response');
    const responseProto = {
        response: EVENT_RESPONSE_ENUM[content.response],
        timestampMs: content.timestampMs ?? serverClock.nowMs()
    };
    if (content.extraGuestCount !== undefined) {
        responseProto.extraGuestCount = content.extraGuestCount;
    }
    const payload = proto.Message.EventResponseMessage.encode(responseProto).finish();
    const { encPayload, encIv } = await encryptAddonForOutgoing({
        messageSecret: content.event.messageSecret,
        parentStanzaId: content.event.id,
        parentMsgOriginalSender: toUserJid(content.event.authorJid),
        modificationSender: toUserJid(ctx.meJid),
        modificationType: WA_USE_CASE_SECRET_MODIFICATION_TYPES.EVENT_RESPONSE,
        payload
    });
    return {
        encEventResponseMessage: {
            eventCreationMessageKey: buildMessageKey(ctx.to, content.event.fromMe, content.event.id, content.event.participant),
            encPayload,
            encIv
        }
    };
}
export async function buildMediaMessageContent(options, content, ctx) {
    if (typeof content === 'string') {
        return { message: { conversation: content } };
    }
    if (isSendTextMessage(content)) {
        if (options.linkPreviewResolver) {
            try {
                const preview = await options.linkPreviewResolver(content);
                if (preview !== null) {
                    return {
                        message: buildExtendedTextWithPreview(content.text, preview.resolved, preview.thumbnailFields)
                    };
                }
            }
            catch (error) {
                options.logger.warn('link preview resolver failed, sending plain text', {
                    message: toError(error).message
                });
            }
        }
        return { message: { extendedTextMessage: { text: content.text } } };
    }
    if (isSendReactionMessage(content)) {
        return { message: buildReactionMessage(content, options.serverClock, ctx) };
    }
    if (isSendRevokeMessage(content))
        return { message: buildRevokeMessage(content, ctx) };
    if (isSendPinMessage(content)) {
        return { message: buildPinMessage(content, options.serverClock, ctx) };
    }
    if (isSendKeepMessage(content)) {
        return { message: buildKeepMessage(content, options.serverClock, ctx) };
    }
    if (isSendPollMessage(content))
        return { message: buildPollCreationMessage(content) };
    if (isSendEventMessage(content))
        return { message: buildEventMessage(content) };
    if (isSendPollVoteMessage(content)) {
        return { message: await buildPollVoteMessage(content, options.serverClock, ctx) };
    }
    if (isSendEventResponseMessage(content)) {
        return { message: await buildEventResponseMessage(content, options.serverClock, ctx) };
    }
    if (isSendMediaMessage(content)) {
        return buildMediaMessage(options, content);
    }
    if (!content || typeof content !== 'object') {
        throw new Error('invalid message content');
    }
    return { message: content };
}
export async function getMediaConn(options, forceRefresh = false) {
    const cached = options.getMediaConnCache();
    if (!forceRefresh && cached && Date.now() + MEDIA_CONN_CACHE_GRACE_MS < cached.expiresAtMs) {
        return cached;
    }
    const response = await options.queryWithContext('media_conn.fetch', buildMediaConnIq(), options.iqTimeoutMs ?? WA_DEFAULTS.IQ_TIMEOUT_MS);
    const mediaConn = parseMediaConnResponse(response, Date.now());
    options.setMediaConnCache(mediaConn);
    return mediaConn;
}
function needsSidecar(content) {
    return content.type === 'video' || content.type === 'ptv' || content.type === 'audio';
}
function resolveUploadType(content) {
    if (content.type === 'video' && content.gifPlayback)
        return 'gif';
    if (content.type === 'audio' && content.ptt)
        return 'ptt';
    return content.type;
}
async function resolveMimetype(content, media, processorInput, ctx) {
    if (content.mimetype)
        return content.mimetype;
    if (content.type === 'sticker')
        return 'image/webp';
    const detect = media?.processor?.detectMimetype;
    if (detect && processorInput !== undefined) {
        const detected = await detect(processorInput, ctx);
        if (detected)
            return detected;
    }
    throw new Error(`mimetype is required for ${content.type} messages (or configure a WaMediaProcessor with detectMimetype)`);
}
async function buildMediaMessage(options, content) {
    if (content.type === 'sticker-pack') {
        return buildStickerPackMediaMessage(options, content);
    }
    const processorCtx = {
        logger: getScopedMediaLogger(options.logger)
    };
    if (shouldNormalizeVoiceNote(options.media, content)) {
        const sourceInput = content.media instanceof ArrayBuffer ? toBytesView(content.media) : content.media;
        try {
            const normalizedStream = await options.media.processor.normalizeVoiceNote(sourceInput, processorCtx);
            if (normalizedStream) {
                content = { ...content, media: normalizedStream, mimetype: VOICE_NOTE_MIMETYPE };
            }
        }
        catch (error) {
            options.logger.warn('voice note normalize failed, sending original media', {
                message: toError(error).message
            });
        }
    }
    const needsMimetypeDetection = !content.mimetype &&
        content.type !== 'sticker' &&
        !!options.media?.processor?.detectMimetype &&
        isReadableStream(content.media);
    const needsTempFile = hasMediaProcessingTasks(options.media, content) ||
        (content.type === 'sticker' && content.firstFrameLength === undefined) ||
        needsMimetypeDetection;
    const resolved = await resolveMediaInputs(needsTempFile, content.media);
    const mimetype = await resolveMimetype(content, options.media, resolved.processorInput, processorCtx);
    try {
        let detectedFirstFrameLength;
        if (content.type === 'sticker' &&
            content.firstFrameLength === undefined &&
            resolved.processorInput) {
            const input = resolved.processorInput;
            const header = typeof input === 'string' ? await readFileHead(input, 100) : input.subarray(0, 100);
            detectedFirstFrameLength = parseWebpAnimation(header)?.firstFrameLength;
        }
        const firstFrameLength = content.type === 'sticker'
            ? (content.firstFrameLength ?? detectedFirstFrameLength)
            : undefined;
        const uploadType = resolveUploadType(content);
        const uploadPromise = uploadMedia(options, {
            source: resolved.uploadMedia,
            cryptoType: uploadType,
            uploadPath: resolveUploadPath(uploadType),
            contentType: mimetype,
            sidecar: needsSidecar(content),
            firstFrameLength
        });
        const processPromise = runMediaProcessor(options.media, resolved.processorInput, content, options.logger);
        const [uploadResult, processResult] = await Promise.allSettled([
            uploadPromise,
            processPromise
        ]);
        if (uploadResult.status === 'rejected')
            throw uploadResult.reason;
        if (processResult.status === 'rejected')
            throw processResult.reason;
        const uploaded = uploadResult.value;
        const processed = processResult.value;
        const mediaKeyTimestamp = options.serverClock.nowSeconds();
        const uploadedFields = {
            url: uploaded.url,
            fileSha256: uploaded.fileSha256,
            fileLength: uploaded.fileLength,
            mediaKey: uploaded.mediaKey,
            fileEncSha256: uploaded.fileEncSha256,
            directPath: uploaded.directPath,
            mediaKeyTimestamp,
            mimetype
        };
        const uploadSummary = {
            url: uploaded.url,
            directPath: uploaded.directPath,
            fileSha256: uploaded.fileSha256,
            fileLength: uploaded.fileLength,
            metadataUrl: uploaded.metadataUrl
        };
        function spread(c) {
            const result = {};
            for (const key in c) {
                if (key !== 'type' &&
                    key !== 'media' &&
                    key !== 'fileLength' &&
                    key !== 'mimetype') {
                    result[key] = c[key];
                }
            }
            return result;
        }
        switch (content.type) {
            case 'image':
                return {
                    upload: uploadSummary,
                    message: {
                        imageMessage: {
                            ...spread(content),
                            ...uploadedFields,
                            width: content.width ?? processed.width,
                            height: content.height ?? processed.height,
                            jpegThumbnail: content.jpegThumbnail ?? processed.jpegThumbnail
                        }
                    }
                };
            case 'video':
                return {
                    upload: uploadSummary,
                    message: {
                        videoMessage: {
                            ...spread(content),
                            ...uploadedFields,
                            seconds: content.seconds ?? processed.seconds,
                            width: content.width ?? processed.width,
                            height: content.height ?? processed.height,
                            jpegThumbnail: content.jpegThumbnail ?? processed.jpegThumbnail,
                            streamingSidecar: uploaded.streamingSidecar,
                            metadataUrl: uploaded.metadataUrl
                        }
                    }
                };
            case 'ptv':
                return {
                    upload: uploadSummary,
                    message: {
                        ptvMessage: {
                            ...spread(content),
                            ...uploadedFields,
                            seconds: content.seconds ?? processed.seconds,
                            width: content.width ?? processed.width,
                            height: content.height ?? processed.height,
                            jpegThumbnail: content.jpegThumbnail ?? processed.jpegThumbnail,
                            streamingSidecar: uploaded.streamingSidecar
                        }
                    }
                };
            case 'audio':
                return {
                    upload: uploadSummary,
                    message: {
                        audioMessage: {
                            ...spread(content),
                            ...uploadedFields,
                            seconds: content.seconds ?? processed.seconds,
                            streamingSidecar: uploaded.streamingSidecar,
                            waveform: content.waveform ?? processed.waveform
                        }
                    }
                };
            case 'document':
                return {
                    upload: uploadSummary,
                    message: {
                        documentMessage: {
                            ...spread(content),
                            ...uploadedFields,
                            fileName: content.fileName ?? 'file',
                            title: content.title ?? content.fileName ?? undefined,
                            jpegThumbnail: content.jpegThumbnail ?? processed.jpegThumbnail
                        }
                    }
                };
            case 'sticker':
                return {
                    upload: uploadSummary,
                    message: {
                        stickerMessage: {
                            ...spread(content),
                            ...uploadedFields,
                            width: content.width ?? processed.width,
                            height: content.height ?? processed.height,
                            pngThumbnail: content.pngThumbnail ?? processed.pngThumbnail,
                            isAnimated: content.isAnimated ??
                                processed.isAnimated ??
                                firstFrameLength !== undefined,
                            firstFrameLength: content.firstFrameLength ?? uploaded.firstFrameLength,
                            firstFrameSidecar: content.firstFrameSidecar ?? uploaded.firstFrameSidecar,
                            stickerSentTs: content.stickerSentTs ?? options.serverClock.nowMs()
                        }
                    }
                };
            default:
                throw new Error(`unsupported media message type: ${String(content.type)}`);
        }
    }
    finally {
        if (resolved.tempFilePath) {
            await cleanupTempFile(resolved.tempFilePath);
        }
    }
}
function resolveUploadPath(uploadType) {
    const uploadPath = MEDIA_UPLOAD_PATHS[uploadType];
    if (!uploadPath) {
        throw new Error(`unknown media upload type: ${String(uploadType)}`);
    }
    return uploadPath;
}
function parseUploadResponse(body, status) {
    assertMediaUploadStatus(status, 'media upload');
    const parsed = parseMediaUploadJsonBody(body, 'media upload');
    if (!parsed.url || !parsed.direct_path) {
        throw new Error('media upload response missing url/direct_path');
    }
    return {
        url: parsed.url,
        directPath: parsed.direct_path,
        ...(parsed.metadata_url ? { metadataUrl: parsed.metadata_url } : {})
    };
}
/**
 * Shared media upload primitive: derives (or reuses) a media key, encrypts,
 * fetches a media connection, and POSTs the ciphertext. Bytes take a
 * zero-temp-file fast path; streams stage to a temp file first. Backs both the
 * send path and `WaMessageCoordinator.upload`.
 */
export async function uploadMedia(options, input) {
    const mediaKey = input.mediaKey ?? (await WaMediaCrypto.generateMediaKey());
    if (input.source instanceof Uint8Array) {
        return uploadMediaBytes(options, input, mediaKey, input.source);
    }
    return uploadMediaStream(options, input, mediaKey, input.source);
}
async function uploadMediaBytes(options, input, mediaKey, mediaBytes) {
    const [encrypted, mediaConn] = await Promise.all([
        WaMediaCrypto.encryptBytes(input.cryptoType, mediaKey, mediaBytes, {
            sidecar: input.sidecar,
            firstFrameLength: input.firstFrameLength
        }),
        getMediaConn(options)
    ]);
    const selectedHost = selectMediaUploadHost(mediaConn);
    const uploadUrl = buildMediaUploadUrl(selectedHost, input.uploadPath, mediaConn.auth, encrypted.fileEncSha256);
    options.logger.debug(input.logLabel ?? 'sending media upload request', {
        cryptoType: input.cryptoType,
        host: selectedHost,
        size: mediaBytes.byteLength
    });
    const uploadResponse = await options.mediaTransfer.uploadStream({
        url: uploadUrl,
        method: 'POST',
        body: encrypted.ciphertextHmac,
        contentLength: encrypted.ciphertextHmac.byteLength,
        contentType: input.contentType,
        timeoutMs: input.timeoutMs,
        signal: input.signal
    });
    const responseBody = await options.mediaTransfer.readResponseBytes(uploadResponse);
    const parsed = parseUploadResponse(responseBody, uploadResponse.status);
    return {
        ...parsed,
        mediaKey,
        fileSha256: encrypted.fileSha256,
        fileEncSha256: encrypted.fileEncSha256,
        fileLength: mediaBytes.byteLength,
        streamingSidecar: encrypted.streamingSidecar,
        firstFrameSidecar: encrypted.firstFrameSidecar,
        firstFrameLength: input.firstFrameLength
    };
}
async function uploadMediaStream(options, input, mediaKey, plaintext) {
    const encResult = await WaMediaCrypto.encryptToFile(input.cryptoType, mediaKey, plaintext, {
        sidecar: input.sidecar,
        firstFrameLength: input.firstFrameLength
    });
    let readStream;
    try {
        const mediaConn = await getMediaConn(options);
        const selectedHost = selectMediaUploadHost(mediaConn);
        const uploadUrl = buildMediaUploadUrl(selectedHost, input.uploadPath, mediaConn.auth, encResult.fileEncSha256);
        options.logger.debug(input.logLabel ?? 'sending media stream upload request', {
            cryptoType: input.cryptoType,
            host: selectedHost,
            plaintextLength: encResult.plaintextLength,
            encryptedSize: encResult.fileSize
        });
        readStream = createReadStream(encResult.filePath);
        const uploadResponse = await options.mediaTransfer.uploadStream({
            url: uploadUrl,
            method: 'POST',
            body: readStream,
            contentLength: encResult.fileSize,
            contentType: input.contentType,
            timeoutMs: input.timeoutMs,
            signal: input.signal
        });
        const responseBody = await options.mediaTransfer.readResponseBytes(uploadResponse);
        const parsed = parseUploadResponse(responseBody, uploadResponse.status);
        return {
            ...parsed,
            mediaKey,
            fileSha256: encResult.fileSha256,
            fileEncSha256: encResult.fileEncSha256,
            fileLength: encResult.plaintextLength,
            streamingSidecar: encResult.streamingSidecar,
            firstFrameSidecar: encResult.firstFrameSidecar,
            firstFrameLength: input.firstFrameLength
        };
    }
    finally {
        if (readStream && !readStream.closed) {
            await new Promise((resolve) => {
                readStream.once('close', resolve);
                readStream.destroy();
            });
        }
        await WaMediaCrypto.cleanupEncryptedFile(encResult.filePath);
    }
}
function openStickerPackInputStream(media) {
    return typeof media === 'string' ? createReadStream(media) : Readable.from([media]);
}
async function buildStickerPackMediaMessage(options, content) {
    validateStickerPackInput(content);
    if (content.coverThumbnail === undefined) {
        throw new Error('sticker pack send requires coverThumbnail for non-newsletter recipients');
    }
    const coverThumbnail = content.coverThumbnail;
    const mediaKey = await WaMediaCrypto.generateMediaKey();
    const [bundle, cover] = await Promise.all([
        uploadMedia(options, {
            source: createStickerPackZipStream(toStickerPackZipEntries(content)),
            cryptoType: 'sticker-pack',
            uploadPath: MEDIA_UPLOAD_PATHS['sticker-pack'],
            contentType: 'application/zip',
            mediaKey,
            sidecar: false,
            logLabel: 'sending sticker pack bundle upload'
        }),
        uploadMedia(options, {
            source: openStickerPackInputStream(coverThumbnail),
            cryptoType: 'thumbnail-sticker-pack',
            uploadPath: MEDIA_UPLOAD_PATHS['thumbnail-sticker-pack'],
            contentType: 'image/jpeg',
            mediaKey,
            sidecar: false,
            logLabel: 'sending sticker pack thumbnail upload'
        })
    ]);
    if (cover.fileLength === 0) {
        throw new Error('sticker pack coverThumbnail is empty');
    }
    return {
        upload: {
            url: bundle.url,
            directPath: bundle.directPath,
            fileSha256: bundle.fileSha256,
            fileLength: bundle.fileLength
        },
        message: {
            stickerPackMessage: {
                stickerPackId: content.stickerPackId,
                name: content.name,
                publisher: content.publisher,
                stickers: toStickerPackProtoStickers(content),
                fileLength: bundle.fileLength,
                fileSha256: bundle.fileSha256,
                fileEncSha256: bundle.fileEncSha256,
                mediaKey,
                mediaKeyTimestamp: options.serverClock.nowSeconds(),
                directPath: bundle.directPath,
                thumbnailDirectPath: cover.directPath,
                thumbnailSha256: cover.fileSha256,
                thumbnailEncSha256: cover.fileEncSha256,
                thumbnailWidth: content.thumbnailWidth ?? 252,
                thumbnailHeight: content.thumbnailHeight ?? 252,
                trayIconFileName: content.trayIcon.fileName,
                stickerPackSize: bundle.fileLength,
                stickerPackOrigin: proto.Message.StickerPackMessage.StickerPackOrigin.USER_CREATED,
                imageDataHash: bytesToBase64(cover.fileSha256),
                caption: content.caption,
                packDescription: content.packDescription
            }
        }
    };
}
