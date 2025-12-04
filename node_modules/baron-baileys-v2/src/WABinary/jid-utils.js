"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferDevice =
  exports.jidNormalizedUser =
  exports.isJidBot =
  exports.isHostedLidUser =
  exports.isHostedPnUser =
  exports.isJidNewsletter =
  exports.isJidStatusBroadcast =
  exports.isJidGroup =
  exports.isJidBroadcast =
  exports.isLidUser =
  exports.isPnUser =
  exports.isJidMetaAI =
  exports.areJidsSameUser =
  exports.jidDecode =
  exports.jidEncode =
  exports.getServerFromDomainType =
  exports.WAJIDDomains =
  exports.META_AI_JID =
  exports.STORIES_JID =
  exports.PSA_WID =
  exports.SERVER_JID =
  exports.OFFICIAL_BIZ_JID =
  exports.S_WHATSAPP_NET =
    void 0;
exports.S_WHATSAPP_NET = "@s.whatsapp.net";
exports.OFFICIAL_BIZ_JID = "16505361212@c.us";
exports.SERVER_JID = "server@c.us";
exports.PSA_WID = "0@c.us";
exports.STORIES_JID = "status@broadcast";
exports.META_AI_JID = "13135550002@c.us";
var WAJIDDomains;
(function (WAJIDDomains) {
  WAJIDDomains[(WAJIDDomains["WHATSAPP"] = 0)] = "WHATSAPP";
  WAJIDDomains[(WAJIDDomains["LID"] = 1)] = "LID";
  WAJIDDomains[(WAJIDDomains["HOSTED"] = 128)] = "HOSTED";
  WAJIDDomains[(WAJIDDomains["HOSTED_LID"] = 129)] = "HOSTED_LID";
})(WAJIDDomains || (exports.WAJIDDomains = WAJIDDomains = {}));
const getServerFromDomainType = (initialServer, domainType) => {
  switch (domainType) {
    case WAJIDDomains.LID:
      return "lid";
    case WAJIDDomains.HOSTED:
      return "hosted";
    case WAJIDDomains.HOSTED_LID:
      return "hosted.lid";
    case WAJIDDomains.WHATSAPP:
    default:
      return initialServer;
  }
};
exports.getServerFromDomainType = getServerFromDomainType;
const jidEncode = (user, server, device, agent) => {
  return `${user || ""}${!!agent ? `_${agent}` : ""}${!!device ? `:${device}` : ""}@${server}`;
};
exports.jidEncode = jidEncode;
const jidDecode = (jid) => {
  // todo: investigate how to implement hosted ids in this case
  const sepIdx = typeof jid === "string" ? jid.indexOf("@") : -1;
  if (sepIdx < 0) {
    return undefined;
  }
  const server = jid.slice(sepIdx + 1);
  const userCombined = jid.slice(0, sepIdx);
  const [userAgent, device] = userCombined.split(":");
  const [user, agent] = userAgent.split("_");
  let domainType = WAJIDDomains.WHATSAPP;
  if (server === "lid") {
    domainType = WAJIDDomains.LID;
  } else if (server === "hosted") {
    domainType = WAJIDDomains.HOSTED;
  } else if (server === "hosted.lid") {
    domainType = WAJIDDomains.HOSTED_LID;
  } else if (agent) {
    domainType = parseInt(agent);
  }
  return {
    server: server,
    user: user,
    domainType,
    device: device ? +device : undefined,
  };
};

// const jidDecode = (jid) => {
//     const sepIdx = typeof jid === 'string' ? jid.indexOf('@') : -1
//     if (sepIdx < 0) {
//         return undefined
//     }
//     const server = jid.slice(sepIdx + 1)
//     const userCombined = jid.slice(0, sepIdx)
//     const [userAgent, device] = userCombined.split(':')
//     const user = userAgent.split('_')[0]
//     return {
//         server: server,
//         user,
//         domainType: server === 'lid' ? 1 : 0,
//         device: device ? +device : undefined
//     }
// }
exports.jidDecode = jidDecode;

/** is the jid a user */
const areJidsSameUser = (jid1, jid2) => {
  return jidDecode(jid1)?.user === jidDecode(jid2)?.user;
};
const isHostedPnUser = (jid) => jid?.endsWith("@hosted");

const isHostedLidUser = (jid) => jid?.endsWith("@hosted.lid");
/** is the jid Meta AI */
const isJidMetaAI = (jid) => jid?.endsWith("@bot");

/** is the jid a user */
const isJidUser = (jid) => jid?.endsWith("@s.whatsapp.net");
const isPnUser = (jid) => jid?.endsWith("@s.whatsapp.net");
/** is the lid a user */
const isLidUser = (jid) => jid?.endsWith("@lid");

/** is the jid a broadcast */
const isJidBroadcast = (jid) => jid?.endsWith("@broadcast");

/** is the jid a group */
const isJidGroup = (jid) => jid?.endsWith("@g.us");

/** is the jid the status broadcast */
const isJidStatusBroadcast = (jid) => jid === "status@broadcast";

/** is the jid a newsletter */
const isJidNewsletter = (jid) => jid?.endsWith("@newsletter");

exports.isHostedLidUser = isHostedLidUser;
exports.isHostedPnUser = isHostedPnUser;
exports.isJidNewsletter = isJidNewsletter;
exports.isJidStatusBroadcast = isJidStatusBroadcast;
exports.areJidsSameUser = areJidsSameUser;
exports.isJidMetaAI = isJidMetaAI;
exports.isPnUser = isPnUser;
exports.isJidUser = isJidUser;
exports.isLidUser = isLidUser;
exports.isJidBroadcast = isJidBroadcast;
exports.isJidGroup = isJidGroup;

const botRegexp = /^1313555\d{4}$|^131655500\d{2}$/;
const isJidBot = (jid) =>
  jid && botRegexp.test(jid.split("@")[0]) && jid.endsWith("@c.us");
exports.isJidBot = isJidBot;
const jidNormalizedUser = (jid) => {
  const result = (0, exports.jidDecode)(jid);
  if (!result) {
    return "";
  }
  const { user, server } = result;
  return (0, exports.jidEncode)(
    user,
    server === "c.us" ? "s.whatsapp.net" : server,
  );
};
exports.jidNormalizedUser = jidNormalizedUser;
const transferDevice = (fromJid, toJid) => {
  const fromDecoded = (0, exports.jidDecode)(fromJid);
  const deviceId =
    (fromDecoded === null || fromDecoded === void 0
      ? void 0
      : fromDecoded.device) || 0;
  const { server, user } = (0, exports.jidDecode)(toJid);
  return (0, exports.jidEncode)(user, server, deviceId);
};
exports.transferDevice = transferDevice;
