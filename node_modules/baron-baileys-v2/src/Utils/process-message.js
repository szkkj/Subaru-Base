"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatId =
  exports.shouldIncrementChatUnread =
  exports.isRealMessage =
  exports.cleanMessage =
    void 0;
exports.decryptPollVote = decryptPollVote;
exports.decryptEventEdit = decryptEventEdit;
exports.decryptEventResponse = decryptEventResponse;
exports.decryptComment = decryptComment;
exports.decryptReaction = decryptReaction;
const index_js_1 = require("../../WAProto/index.js");
const WAProto_1 = index_js_1;
const Types_1 = require("../Types");
const messages_1 = require("../Utils/messages");
const WABinary_1 = require("../WABinary");
const crypto_1 = require("./crypto");
const generics_1 = require("./generics");
const history_1 = require("./history");
const REAL_MSG_STUB_TYPES = new Set([
  Types_1.WAMessageStubType.CALL_MISSED_GROUP_VIDEO,
  Types_1.WAMessageStubType.CALL_MISSED_GROUP_VOICE,
  Types_1.WAMessageStubType.CALL_MISSED_VIDEO,
  Types_1.WAMessageStubType.CALL_MISSED_VOICE,
]);
const REAL_MSG_REQ_ME_STUB_TYPES = new Set([
  Types_1.WAMessageStubType.GROUP_PARTICIPANT_ADD,
]);
/** Cleans a received message to further processing */
const cleanMessage = (message, meId, meLid) => {
  var _a, _b, _c;
  // ensure remoteJid and participant doesn't have device or agent in it
  if (
    (0, WABinary_1.isHostedPnUser)(message.key.remoteJid) ||
    (0, WABinary_1.isHostedLidUser)(message.key.remoteJid)
  ) {
    message.key.remoteJid = (0, WABinary_1.jidEncode)(
      (_b = (0, WABinary_1.jidDecode)(
        (_a = message.key) === null || _a === void 0 ? void 0 : _a.remoteJid,
      )) === null || _b === void 0
        ? void 0
        : _b.user,
      (0, WABinary_1.isHostedPnUser)(message.key.remoteJid)
        ? "s.whatsapp.net"
        : "lid",
    );
  } else {
    message.key.remoteJid = (0, WABinary_1.jidNormalizedUser)(
      message.key.remoteJid,
    );
  }
  if (
    (0, WABinary_1.isHostedPnUser)(message.key.participant) ||
    (0, WABinary_1.isHostedLidUser)(message.key.participant)
  ) {
    message.key.participant = (0, WABinary_1.jidEncode)(
      (_c = (0, WABinary_1.jidDecode)(message.key.participant)) === null ||
        _c === void 0
        ? void 0
        : _c.user,
      (0, WABinary_1.isHostedPnUser)(message.key.participant)
        ? "s.whatsapp.net"
        : "lid",
    );
  } else {
    message.key.participant = (0, WABinary_1.jidNormalizedUser)(
      message.key.participant,
    );
  }
  const content = (0, messages_1.normalizeMessageContent)(message.message);
  // if the message has a reaction, ensure fromMe & remoteJid are from our perspective
  if (
    content === null || content === void 0 ? void 0 : content.reactionMessage
  ) {
    normaliseKey(content.reactionMessage.key);
  }
  if (
    content === null || content === void 0 ? void 0 : content.pollUpdateMessage
  ) {
    normaliseKey(content.pollUpdateMessage.pollCreationMessageKey);
  }
  function normaliseKey(msgKey) {
    // if the reaction is from another user
    // we've to correctly map the key to this user's perspective
    if (!message.key.fromMe) {
      // if the sender believed the message being reacted to is not from them
      // we've to correct the key to be from them, or some other participant
      msgKey.fromMe = !msgKey.fromMe
        ? (0, WABinary_1.areJidsSameUser)(
            msgKey.participant || msgKey.remoteJid,
            meId,
          ) ||
          (0, WABinary_1.areJidsSameUser)(
            msgKey.participant || msgKey.remoteJid,
            meLid,
          )
        : // if the message being reacted to, was from them
          // fromMe automatically becomes false
          false;
      // set the remoteJid to being the same as the chat the message came from
      // TODO: investigate inconsistencies
      msgKey.remoteJid = message.key.remoteJid;
      // set participant of the message
      msgKey.participant = msgKey.participant || message.key.participant;
    }
  }
};
exports.cleanMessage = cleanMessage;
// TODO: target:audit AUDIT THIS FUNCTION AGAIN
const isRealMessage = (message) => {
  const normalizedContent = (0, messages_1.normalizeMessageContent)(
    message.message,
  );
  const hasSomeContent = !!(0, messages_1.getContentType)(normalizedContent);
  return (
    (!!normalizedContent ||
      REAL_MSG_STUB_TYPES.has(message.messageStubType) ||
      REAL_MSG_REQ_ME_STUB_TYPES.has(message.messageStubType)) &&
    hasSomeContent &&
    !(normalizedContent === null || normalizedContent === void 0
      ? void 0
      : normalizedContent.protocolMessage) &&
    !(normalizedContent === null || normalizedContent === void 0
      ? void 0
      : normalizedContent.reactionMessage) &&
    !(normalizedContent === null || normalizedContent === void 0
      ? void 0
      : normalizedContent.pollUpdateMessage)
  );
};
exports.isRealMessage = isRealMessage;
const shouldIncrementChatUnread = (message) =>
  !message.key.fromMe && !message.messageStubType;
exports.shouldIncrementChatUnread = shouldIncrementChatUnread;
/**
 * Get the ID of the chat from the given key.
 * Typically -- that'll be the remoteJid, but for broadcasts, it'll be the participant
 */
const getChatId = ({ remoteJid, participant, fromMe }) => {
  if (
    (0, WABinary_1.isJidBroadcast)(remoteJid) &&
    !(0, WABinary_1.isJidStatusBroadcast)(remoteJid) &&
    !fromMe
  ) {
    return participant;
  }
  return remoteJid;
};
exports.getChatId = getChatId;
/**
 * Decrypt a poll vote
 * @param vote encrypted vote
 * @param ctx additional info about the poll required for decryption
 * @returns list of SHA256 options
 */
function decryptPollVote(
  { encPayload, encIv },
  { pollCreatorJid, pollMsgId, pollEncKey, voterJid },
) {
  const sign = Buffer.concat([
    toBinary(pollMsgId),
    toBinary(pollCreatorJid),
    toBinary(voterJid),
    toBinary("Poll Vote"),
    new Uint8Array([1]),
  ]);
  const key0 = (0, crypto_1.hmacSign)(pollEncKey, new Uint8Array(32), "sha256");
  const decKey = (0, crypto_1.hmacSign)(sign, key0, "sha256");
  const aad = toBinary(`${pollMsgId}\u0000${voterJid}`);
  const decrypted = (0, crypto_1.aesDecryptGCM)(encPayload, decKey, encIv, aad);
  return index_js_1.proto.Message.PollVoteMessage.decode(decrypted);
  function toBinary(txt) {
    return Buffer.from(txt);
  }
}
/**
 * Decrypt an event edit
 * @param edit encrypted event edit
 * @returns message
 */
function decryptEventEdit(
  { encPayload, encIv },
  { eventCreatorJid, eventMsgId, eventEncKey, responderJid },
) {
  const sign = Buffer.concat([
    toBinary(eventMsgId),
    toBinary(eventCreatorJid),
    toBinary(responderJid),
    toBinary("Event Edit"),
    new Uint8Array([1]),
  ]);

  const key0 = crypto_1.hmacSign(eventEncKey, new Uint8Array(32), "sha256");
  const decKey = crypto_1.hmacSign(sign, key0, "sha256");
  const decrypted = crypto_1.aesDecryptGCM(encPayload, decKey, encIv, null);

  return WAProto_1.proto.Message.decode(decrypted);

  function toBinary(txt) {
    return Buffer.from(txt);
  }
}

/**
 * Decrypt an event response
 * @param response encrypted event response
 * @param ctx additional info about the event required for decryption
 * @returns event response message
 */
function decryptEventResponse(
  { encPayload, encIv },
  { eventCreatorJid, eventMsgId, eventEncKey, responderJid },
) {
  const sign = Buffer.concat([
    toBinary(eventMsgId),
    toBinary(eventCreatorJid),
    toBinary(responderJid),
    toBinary("Event Response"),
    new Uint8Array([1]),
  ]);

  const key0 = crypto_1.hmacSign(eventEncKey, new Uint8Array(32), "sha256");
  const decKey = crypto_1.hmacSign(sign, key0, "sha256");
  const aad = toBinary(`${eventMsgId}\u0000${responderJid}`);
  const decrypted = crypto_1.aesDecryptGCM(encPayload, decKey, encIv, aad);

  return WAProto_1.proto.Message.EventResponseMessage.decode(decrypted);

  function toBinary(txt) {
    return Buffer.from(txt);
  }
}

/**
 * Decrypt an comment message
 * @param comment encrypted comment message
 * @returns message
 */
function decryptComment(
  { encPayload, encIv },
  { commentCreatorJid, commentMsgId, commentEncKey, commentJid },
) {
  const sign = Buffer.concat([
    toBinary(commentMsgId),
    toBinary(commentCreatorJid),
    toBinary(commentJid),
    toBinary("Enc Comment"),
    new Uint8Array([1]),
  ]);

  const key0 = crypto_1.hmacSign(commentEncKey, new Uint8Array(32), "sha256");
  const decKey = crypto_1.hmacSign(sign, key0, "sha256");
  const decrypted = crypto_1.aesDecryptGCM(encPayload, decKey, encIv, null);

  return WAProto_1.proto.Message.decode(decrypted);

  function toBinary(txt) {
    return Buffer.from(txt);
  }
}

/**
 * Decrypt an reaction
 * @param reaction encrypted reaction
 * @returns reaction message
 */
function decryptReaction(
  { encPayload, encIv },
  { reactionCreatorJid, reactionMsgId, reactionEncKey, reactionJid },
) {
  const sign = Buffer.concat([
    toBinary(reactionMsgId),
    toBinary(reactionCreatorJid),
    toBinary(reactionJid),
    toBinary("Enc Reaction"),
    new Uint8Array([1]),
  ]);

  const key0 = crypto_1.hmacSign(reactionEncKey, new Uint8Array(32), "sha256");
  const decKey = crypto_1.hmacSign(sign, key0, "sha256");
  const decrypted = crypto_1.aesDecryptGCM(encPayload, decKey, encIv, null);

  return WAProto_1.proto.Message.ReactionMessage.decode(decrypted);

  function toBinary(txt) {
    return Buffer.from(txt);
  }
}
const processMessage = async (
  message,
  {
    shouldProcessHistoryMsg,
    placeholderResendCache,
    ev,
    creds,
    signalRepository,
    keyStore,
    logger,
    options,
    getMessage,
  },
) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
  const meLid = creds.me.lid;
  const meId = creds.me.id;
  const { accountSettings } = creds;
  const chat = {
    id: (0, WABinary_1.jidNormalizedUser)((0, exports.getChatId)(message.key)),
  };
  const isRealMsg = (0, exports.isRealMessage)(message);
  if (isRealMsg) {
    chat.messages = [{ message }];
    chat.conversationTimestamp = (0, generics_1.toNumber)(
      message.messageTimestamp,
    );
    // only increment unread count if not CIPHERTEXT and from another person
    if ((0, exports.shouldIncrementChatUnread)(message)) {
      chat.unreadCount = (chat.unreadCount || 0) + 1;
    }
  }
  const content = (0, messages_1.normalizeMessageContent)(message.message);
  // unarchive chat if it's a real message, or someone reacted to our message
  // and we've the unarchive chats setting on
  if (
    (isRealMsg ||
      ((_b =
        (_a =
          content === null || content === void 0
            ? void 0
            : content.reactionMessage) === null || _a === void 0
          ? void 0
          : _a.key) === null || _b === void 0
        ? void 0
        : _b.fromMe)) &&
    (accountSettings === null || accountSettings === void 0
      ? void 0
      : accountSettings.unarchiveChats)
  ) {
    chat.archived = false;
    chat.readOnly = false;
  }
  const protocolMsg =
    content === null || content === void 0 ? void 0 : content.protocolMessage;
  if (protocolMsg) {
    switch (protocolMsg.type) {
      case index_js_1.proto.Message.ProtocolMessage.Type
        .HISTORY_SYNC_NOTIFICATION:
        const histNotification = protocolMsg.historySyncNotification;
        const process = shouldProcessHistoryMsg;
        const isLatest = !((_c = creds.processedHistoryMessages) === null ||
        _c === void 0
          ? void 0
          : _c.length);
        logger === null || logger === void 0
          ? void 0
          : logger.info(
              {
                histNotification,
                process,
                id: message.key.id,
                isLatest,
              },
              "got history notification",
            );
        if (process) {
          // TODO: investigate
          if (
            histNotification.syncType !==
            index_js_1.proto.HistorySync.HistorySyncType.ON_DEMAND
          ) {
            ev.emit("creds.update", {
              processedHistoryMessages: [
                ...(creds.processedHistoryMessages || []),
                {
                  key: message.key,
                  messageTimestamp: message.messageTimestamp,
                },
              ],
            });
          }
          const data = await (0,
          history_1.downloadAndProcessHistorySyncNotification)(
            histNotification,
            options,
          );
          ev.emit("messaging-history.set", {
            ...data,
            isLatest:
              histNotification.syncType !==
              index_js_1.proto.HistorySync.HistorySyncType.ON_DEMAND
                ? isLatest
                : undefined,
            peerDataRequestSessionId: histNotification.peerDataRequestSessionId,
          });
        }
        break;
      case index_js_1.proto.Message.ProtocolMessage.Type
        .APP_STATE_SYNC_KEY_SHARE:
        const keys = protocolMsg.appStateSyncKeyShare.keys;
        if (keys === null || keys === void 0 ? void 0 : keys.length) {
          let newAppStateSyncKeyId = "";
          await keyStore.transaction(async () => {
            const newKeys = [];
            for (const { keyData, keyId } of keys) {
              const strKeyId = Buffer.from(keyId.keyId).toString("base64");
              newKeys.push(strKeyId);
              await keyStore.set({
                "app-state-sync-key": { [strKeyId]: keyData },
              });
              newAppStateSyncKeyId = strKeyId;
            }
            logger === null || logger === void 0
              ? void 0
              : logger.info(
                  { newAppStateSyncKeyId, newKeys },
                  "injecting new app state sync keys",
                );
          }, meId);
          ev.emit("creds.update", { myAppStateKeyId: newAppStateSyncKeyId });
        } else {
          logger === null || logger === void 0
            ? void 0
            : logger.info({ protocolMsg }, "recv app state sync with 0 keys");
        }
        break;
      case index_js_1.proto.Message.ProtocolMessage.Type.REVOKE:
        ev.emit("messages.update", [
          {
            key: {
              ...message.key,
              id: protocolMsg.key.id,
            },
            update: {
              message: null,
              messageStubType: Types_1.WAMessageStubType.REVOKE,
              key: message.key,
            },
          },
        ]);
        break;
      case index_js_1.proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING:
        Object.assign(chat, {
          ephemeralSettingTimestamp: (0, generics_1.toNumber)(
            message.messageTimestamp,
          ),
          ephemeralExpiration: protocolMsg.ephemeralExpiration || null,
        });
        break;
      case index_js_1.proto.Message.ProtocolMessage.Type
        .PEER_DATA_OPERATION_REQUEST_RESPONSE_MESSAGE:
        const response = protocolMsg.peerDataOperationRequestResponseMessage;
        if (response) {
          await (placeholderResendCache === null ||
          placeholderResendCache === void 0
            ? void 0
            : placeholderResendCache.del(response.stanzaId));
          // TODO: IMPLEMENT HISTORY SYNC ETC (sticker uploads etc.).
          const { peerDataOperationResult } = response;
          for (const result of peerDataOperationResult) {
            const { placeholderMessageResendResponse: retryResponse } = result;
            //eslint-disable-next-line max-depth
            if (retryResponse) {
              const webMessageInfo = index_js_1.proto.WebMessageInfo.decode(
                retryResponse.webMessageInfoBytes,
              );
              // wait till another upsert event is available, don't want it to be part of the PDO response message
              // TODO: parse through proper message handling utilities (to add relevant key fields)
              setTimeout(() => {
                ev.emit("messages.upsert", {
                  messages: [webMessageInfo],
                  type: "notify",
                  requestId: response.stanzaId,
                });
              }, 500);
            }
          }
        }
        break;
      case index_js_1.proto.Message.ProtocolMessage.Type.MESSAGE_EDIT:
        ev.emit("messages.update", [
          {
            // flip the sender / fromMe properties because they're in the perspective of the sender
            key: {
              ...message.key,
              id:
                (_d = protocolMsg.key) === null || _d === void 0
                  ? void 0
                  : _d.id,
            },
            update: {
              message: {
                editedMessage: {
                  message: protocolMsg.editedMessage,
                },
              },
              messageTimestamp: protocolMsg.timestampMs
                ? Math.floor(
                    (0, generics_1.toNumber)(protocolMsg.timestampMs) / 1000,
                  )
                : message.messageTimestamp,
            },
          },
        ]);
        break;
      case index_js_1.proto.Message.ProtocolMessage.Type
        .LID_MIGRATION_MAPPING_SYNC:
        const encodedPayload =
          (_e = protocolMsg.lidMigrationMappingSyncMessage) === null ||
          _e === void 0
            ? void 0
            : _e.encodedMappingPayload;
        const { pnToLidMappings, chatDbMigrationTimestamp } =
          index_js_1.proto.LIDMigrationMappingSyncPayload.decode(
            encodedPayload,
          );
        logger === null || logger === void 0
          ? void 0
          : logger.debug(
              { pnToLidMappings, chatDbMigrationTimestamp },
              "got lid mappings and chat db migration timestamp",
            );
        const pairs = [];
        for (const { pn, latestLid, assignedLid } of pnToLidMappings) {
          const lid = latestLid || assignedLid;
          pairs.push({ lid: `${lid}@lid`, pn: `${pn}@s.whatsapp.net` });
        }
        await signalRepository.lidMapping.storeLIDPNMappings(pairs);
        if (pairs.length) {
          for (const { pn, lid } of pairs) {
            await signalRepository.migrateSession(pn, lid);
          }
        }
    }
  } else if (
    content === null || content === void 0 ? void 0 : content.reactionMessage
  ) {
    const reaction = {
      ...content.reactionMessage,
      key: message.key,
    };
    ev.emit("messages.reaction", [
      {
        reaction,
        key:
          (_f = content.reactionMessage) === null || _f === void 0
            ? void 0
            : _f.key,
      },
    ]);
  } else if (message.messageStubType) {
    const jid =
      (_g = message.key) === null || _g === void 0 ? void 0 : _g.remoteJid;
    //let actor = whatsappID (message.participant)
    let participants;
    const emitParticipantsUpdate = (action) =>
      ev.emit("group-participants.update", {
        id: jid,
        author: message.key.participant,
        authorPn: message.key.participantAlt,
        participants,
        action,
      });
    const emitGroupUpdate = (update) => {
      var _a;
      ev.emit("groups.update", [
        {
          id: jid,
          ...update,
          author:
            (_a = message.key.participant) !== null && _a !== void 0
              ? _a
              : undefined,
          authorPn: message.key.participantAlt,
        },
      ]);
    };
    const emitGroupRequestJoin = (participant, action, method) => {
      ev.emit("group.join-request", {
        id: jid,
        author: message.key.participant,
        authorPn: message.key.participantAlt,
        participant: participant.lid,
        participantPn: participant.pn,
        action,
        method: method,
      });
    };
    const participantsIncludesMe = () =>
      participants.find((jid) =>
        (0, WABinary_1.areJidsSameUser)(meId, jid.phoneNumber),
      ); // ADD SUPPORT FOR LID
    switch (message.messageStubType) {
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_CHANGE_NUMBER:
        participants =
          message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("modify");
        break;
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_LEAVE:
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_REMOVE:
        participants =
          message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("remove");
        // mark the chat read only if you left the group
        if (participantsIncludesMe()) {
          chat.readOnly = true;
        }
        break;
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_ADD:
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_INVITE:
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_ADD_REQUEST_JOIN:
        participants =
          message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        if (participantsIncludesMe()) {
          chat.readOnly = false;
        }
        emitParticipantsUpdate("add");
        break;
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_DEMOTE:
        participants =
          message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("demote");
        break;
      case Types_1.WAMessageStubType.GROUP_PARTICIPANT_PROMOTE:
        participants =
          message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("promote");
        break;
      case Types_1.WAMessageStubType.GROUP_CHANGE_ANNOUNCE:
        const announceValue =
          (_h = message.messageStubParameters) === null || _h === void 0
            ? void 0
            : _h[0];
        emitGroupUpdate({
          announce: announceValue === "true" || announceValue === "on",
        });
        break;
      case Types_1.WAMessageStubType.GROUP_CHANGE_RESTRICT:
        const restrictValue =
          (_j = message.messageStubParameters) === null || _j === void 0
            ? void 0
            : _j[0];
        emitGroupUpdate({
          restrict: restrictValue === "true" || restrictValue === "on",
        });
        break;
      case Types_1.WAMessageStubType.GROUP_CHANGE_SUBJECT:
        const name =
          (_k = message.messageStubParameters) === null || _k === void 0
            ? void 0
            : _k[0];
        chat.name = name;
        emitGroupUpdate({ subject: name });
        break;
      case Types_1.WAMessageStubType.GROUP_CHANGE_DESCRIPTION:
        const description =
          (_l = message.messageStubParameters) === null || _l === void 0
            ? void 0
            : _l[0];
        chat.description = description;
        emitGroupUpdate({ desc: description });
        break;
      case Types_1.WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
        const code =
          (_m = message.messageStubParameters) === null || _m === void 0
            ? void 0
            : _m[0];
        emitGroupUpdate({ inviteCode: code });
        break;
      case Types_1.WAMessageStubType.GROUP_MEMBER_ADD_MODE:
        const memberAddValue =
          (_o = message.messageStubParameters) === null || _o === void 0
            ? void 0
            : _o[0];
        emitGroupUpdate({ memberAddMode: memberAddValue === "all_member_add" });
        break;
      case Types_1.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_MODE:
        const approvalMode =
          (_p = message.messageStubParameters) === null || _p === void 0
            ? void 0
            : _p[0];
        emitGroupUpdate({ joinApprovalMode: approvalMode === "on" });
        break;
      case Types_1.WAMessageStubType
        .GROUP_MEMBERSHIP_JOIN_APPROVAL_REQUEST_NON_ADMIN_ADD: // TODO: Add other events
        const participant = JSON.parse(
          (_q = message.messageStubParameters) === null || _q === void 0
            ? void 0
            : _q[0],
        );
        const action =
          (_r = message.messageStubParameters) === null || _r === void 0
            ? void 0
            : _r[1];
        const method =
          (_s = message.messageStubParameters) === null || _s === void 0
            ? void 0
            : _s[2];
        emitGroupRequestJoin(participant, action, method);
        break;
    }
  } else if (content?.pollUpdateMessage) {
    const pollUpdate = content.pollUpdateMessage;
    const creationMsgKey = pollUpdate.pollCreationMessageKey;

    // we need to fetch the poll creation message to get the poll enc key
    const pollMsg = await getMessage(creationMsgKey);
    if (pollMsg) {
      try {
        const meLidNormalised = WABinary_1.jidNormalizedUser(meLid);
        const getDevice = messages_1.getDevice(creationMsgKey.id);
        const pollCreationFromMe = getDevice === "baileys" ? true : false;
        const pollEncKey = pollMsg.messageContextInfo?.messageSecret;
        const voterJid = generics_1.getKeyAuthor(message.key, meLidNormalised);

        let pollCreatorJid = generics_1.getKeyAuthor(
          creationMsgKey,
          meLidNormalised,
        );

        if (pollCreationFromMe) {
          pollCreatorJid = meLidNormalised;
        }

        if (!pollEncKey) {
          logger?.warn(
            { vote: pollUpdate.vote, creationMsgKey },
            "poll creation: missing messageSecret for decryption",
          );
        } else {
          const voteMsg = decryptPollVote(pollUpdate.vote, {
            pollEncKey,
            pollCreatorJid,
            pollMsgId: creationMsgKey.id,
            voterJid,
          });

          ev.emit("messages.update", [
            {
              key: creationMsgKey,
              update: {
                pollUpdates: [
                  {
                    pollUpdateMessageKey: message.key,
                    vote: voteMsg,
                    senderTimestampMs:
                      content.pollUpdateMessage.senderTimestampMs.toNumber(),
                  },
                ],
              },
            },
          ]);
        }
      } catch (err) {
        logger?.warn({ err, creationMsgKey }, "failed to decrypt poll vote");
      }
    } else {
      logger?.warn(
        { creationMsgKey },
        "poll creation message not found, cannot decrypt update",
      );
    }
  } else if (content?.secretEncryptedMessage) {
    const encEventEdit = content.secretEncryptedMessage;
    const creationMsgKey = encEventEdit.targetMessageKey;

    if (
      WAProto_1.proto.Message.SecretEncryptedMessage.SecretEncType[
        encEventEdit.secretEncType
      ] !== "EVENT_EDIT"
    )
      return;

    // we need to fetch the event creation message to get the event enc key
    const eventMsg = await getMessage(creationMsgKey);
    console.log("eventMsgedit", eventMsg);
    if (eventMsg) {
      try {
        const meLidNormalised = WABinary_1.jidNormalizedUser(meLid);
        const eventCreatorJid = generics_1.getKeyAuthor(
          message.key,
          meLidNormalised,
        );
        const responderJid = generics_1.getKeyAuthor(
          message.key,
          meLidNormalised,
        );
        const eventEncKey = eventMsg.messageContextInfo?.messageSecret;

        if (!eventEncKey) {
          logger?.warn(
            { encEventEdit, creationMsgKey },
            "event edit: missing messageSecret for decryption",
          );
        } else {
          const responseMsg = decryptEventEdit(encEventEdit, {
            eventEncKey,
            eventCreatorJid,
            eventMsgId: creationMsgKey.id,
            responderJid,
          });
          const content = messages_1.normalizeMessageContent(responseMsg);
          const protocolMsg = content?.protocolMessage;

          ev.emit("messages.update", [
            {
              key: { ...message.key, id: protocolMsg.key?.id },
              update: {
                message: {
                  messageContextInfo: responseMsg.messageContextInfo,
                  editedMessage: {
                    message: protocolMsg.editedMessage,
                  },
                },
                messageTimestamp: protocolMsg.timestampMs
                  ? Math.floor(
                      generics_1.toNumber(protocolMsg.timestampMs) / 1000,
                    )
                  : message.messageTimestamp,
              },
            },
          ]);
        }
      } catch (err) {
        logger?.warn(
          { err, creationMsgKey, encEventEdit },
          "failed to decrypt event edit",
        );
      }
    } else {
      logger?.warn(
        { encEventEdit, creationMsgKey },
        "event creation message not found, cannot decrypt update",
      );
    }
  } else if (content?.encEventResponseMessage) {
    const encEventResponse = content.encEventResponseMessage;
    const creationMsgKey = encEventResponse.eventCreationMessageKey;

    // we need to fetch the event creation message to get the event enc key
    const eventMsg = await getMessage(creationMsgKey);
    console.log("eventMsgresponse", eventMsg);
    if (eventMsg) {
      try {
        const meLidNormalised = WABinary_1.jidNormalizedUser(meLid);
        const eventCreatorJid = generics_1.getKeyAuthor(
          creationMsgKey,
          meLidNormalised,
        );
        const responderJid = generics_1.getKeyAuthor(
          message.key,
          meLidNormalised,
        );
        const eventEncKey = eventMsg.messageContextInfo?.messageSecret;

        if (!eventEncKey) {
          logger?.warn(
            { encEventResponse, creationMsgKey },
            "event response: missing messageSecret for decryption",
          );
        } else {
          const responseMsg = decryptEventResponse(encEventResponse, {
            eventEncKey,
            eventCreatorJid,
            eventMsgId: creationMsgKey.id,
            responderJid,
          });

          const eventResponse = {
            eventResponseMessageKey: message.key,
            senderTimestampMs: responseMsg.timestampMs,
            response: responseMsg,
          };

          ev.emit("messages.update", [
            {
              key: creationMsgKey,
              update: {
                eventResponses: [eventResponse],
              },
            },
          ]);
        }
      } catch (err) {
        logger?.warn(
          { err, creationMsgKey, encEventResponse },
          "failed to decrypt event response",
        );
      }
    } else {
      logger?.warn(
        { encEventResponse, creationMsgKey },
        "event creation message not found, cannot decrypt update",
      );
    }
  } else if (content?.encCommentMessage) {
    const encComment = content.encCommentMessage;
    const creationMsgKey = encComment.targetMessageKey;

    // we need to fetch the message to get the reaction enc key
    const commentMsg = await getMessage(creationMsgKey);
    if (commentMsg) {
      try {
        const meLidNormalised = WABinary_1.jidNormalizedUser(meLid);
        const commentCreatorJid = creationMsgKey.participant
          ? creationMsgKey.participant
          : message.key?.participant
            ? message.key.participant
            : meLidNormalised;
        const commentJid = message.key?.participant
          ? message.key.participant
          : creationMsgKey.participant
            ? creationMsgKey.participant
            : meLidNormalised;
        const commentEncKey = commentMsg.messageContextInfo?.messageSecret;

        if (!commentEncKey) {
          logger?.warn(
            { encComment, creationMsgKey },
            "comment message: missing messageSecret for decryption",
          );
        } else {
          const responseMsg = decryptComment(encComment, {
            commentEncKey,
            commentCreatorJid,
            commentMsgId: creationMsgKey.id,
            commentJid,
          });

          ev.emit("messages.upsert", {
            messages: [
              {
                key: message.key,
                message: responseMsg,
              },
            ],
            type: "append",
          });
        }
      } catch (err) {
        logger?.warn(
          { err, creationMsgKey, encComment },
          "failed to decrypt comment message",
        );
      }
    } else {
      logger?.warn(
        { encComment, creationMsgKey },
        "creation message not found, cannot decrypt",
      );
    }
  } else if (content?.encReactionMessage) {
    const encReaction = content.encReactionMessage;
    const creationMsgKey = encReaction.targetMessageKey;

    // we need to fetch the message to get the reaction enc key
    const reactMsg = await getMessage(creationMsgKey);
    if (reactMsg) {
      try {
        const meLidNormalised = WABinary_1.jidNormalizedUser(meLid);
        const reactionCreatorJid = creationMsgKey.participant
          ? creationMsgKey.participant
          : message.key?.participant
            ? message.key.participant
            : meLidNormalised;
        const reactionJid = message.key?.participant
          ? message.key.participant
          : creationMsgKey.participant
            ? creationMsgKey.participant
            : meLidNormalised;
        const reactionEncKey = reactMsg.messageContextInfo?.messageSecret;

        if (!reactionEncKey) {
          logger?.warn(
            { encReaction, creationMsgKey },
            "reaction: missing messageSecret for decryption",
          );
        } else {
          const responseMsg = decryptReaction(encReaction, {
            reactionEncKey,
            reactionCreatorJid,
            reactionMsgId: creationMsgKey.id,
            reactionJid,
          });

          const Reaction = {
            key: message.key,
            message: {
              reactionMessage: {
                key: creationMsgKey,
                text: responseMsg.text,
                senderTimestampMs: responseMsg.senderTimestampMs,
              },
            },
          };

          ev.emit("messages.upsert", {
            messages: [Reaction],
            type: "append",
          });
        }
      } catch (err) {
        logger?.warn(
          { err, creationMsgKey, encReaction },
          "failed to decrypt reaction",
        );
      }
    } else {
      logger?.warn(
        { encReaction, creationMsgKey },
        "creation message not found, cannot decrypt",
      );
    }
  }
  if (Object.keys(chat).length > 1) {
    ev.emit("chats.update", [chat]);
  }
};
exports.default = processMessage;
