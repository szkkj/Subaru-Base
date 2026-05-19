/*
 * Oi, se tá lendo isso, é porque tem interesse no bot. Muito obrigado!
 * Esse bot é gratuito, se pagou por ele, exija seu dinheiro de volta.
 * Achou o bot legal ou tá pensando em kibar algo? Pelo menos segue o meu canal, kk
 * Raikken-API: https://whatsapp.com/channel/0029VbB75r1HFxOvPXYp7Z10
 * Para os comandos da API funcionar, precisa de uma Key, acesse o site oficial!
 *
 */

/* ===========================//CONSTS\\================================//*/
import * as baileysPkg from "@whiskeysockets/baileys";
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidStatusBroadcast,
  proto,
  makeCacheableSignalKeyStore,
  downloadContentFromMessage,
  generateWAMessageFromContent,
  generateWAMessageContent,
  downloadMediaMessage,
  prepareWAMessageMedia,
  getContentType,
  BufferJSON,
  WAMessageStubType,
  WA_DEFAULT_EPHEMERAL,
} = baileysPkg;
import { cacheService } from "./database/dev/cacheService.js";
import {
  sendInteractiveMessage,
  InteractiveValidationError,
  sendButtons,
} from "./database/dev/botoes.js";

import {
  os,
  fs,
  path,
  exec,
  spawn,
  crypto,
  axios,
  fetch,
  FormData,
  moment,
  mss,
  sendPoll,
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
  imageToWebp2,
  videoToWebp2,
  writeExifImg2,
  writeExifVid2,
  getMembros,
  getAdmins,
  util,
  rgtake,
  botSemKey,
} from "./dono/exports.js";

import { createRequire } from "module";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const {
  prefix,
  botName,
  donoName,
  donoNmr,
  RaikkenKey,
  baseRaikken,
  idCanal,
  botNumber,
  donoLid,
  botLid,
  baseRaikkenTinder,
} = require("./dono/configs/settings.json");

import {
  menumembros,
  menuAdm,
  menubn,
  menudono,
  menugeral,
} from "./dono/configs/menus.js";

import {
  getPlugin,
  loadPlugins,
  escolherPersonalidadeSubaru,
  escolherVideoPorRota,
  getFileBuffer,
  checkPrefix,
  fetchJson,
  getBuffer,
  data,
  hora,
  loadJSON,
  saveJSON,
  onlyNumbers,
  toUserLid,
  toUserOrGroupJid,
  gerarlinkUploadCatbox,
  bytesParaMB,
  getBufferFromUrl,
  checarVersao,
  atualizarBot,
  delay,
  getFamiliaData,
  UploadFileUgu,
  CatBox,
  dellCase,
  groupConfigCache
} from "./dono/functions.js";

import {
  selogpt,
  seloCriador,
  seloGpt,
  seloMeta,
  seloLuzia,
  seloLaura,
  seloCopilot,
  seloNubank,
  seloBb,
  seloBradesco,
  seloSantander,
  seloItau,
  selodoc,
  pay,
  seloSz,
  seloface,
  seloluzia,
  seloloc,
  seloSticker,
  spiral,
} from "./dono/fileSz.js";
import { getSimilarity } from "./database/outros/similaridade.js";
const selo = seloSz;

const {
  menuimg,
  erroImg,
  defaultAvatar,
  imgnazista,
  imggay,
  imgcorno,
  imggostosa,
  imggostoso,
  imgfeio,
  imgvesgo,
  imgbebado,
  imggado,
  matarcmd,
  deathcmd,
  beijocmd,
  chutecmd,
  tapacmd,
  rnkgay,
  rnkgado,
  cmdmenu,
  rnkcorno,
  rnkgostoso,
  rnkgostosa,
  rnknazista,
  rnkotaku,
  rnkpau,
  suruba,
  minado_bomb,
  thumbnail,
  imgsigma,
  imgbeta,
  imgbaiano,
  imgbaiana,
  imgcarioca,
  imglouco,
  imglouca,
  imgsafada,
  imgsafado,
  imgmacaco,
  imgmacaca,
  imgputa,
  rnksigma,
  rnkbeta,
  rnkbaiano,
  rnkbaiana,
  rnkcarioca,
  rnklouco,
  rnklouca,
  rnksafada,
  rnksafado,
  rnkmacaco,
  rnkmacaca,
  errocmd,
  rnkputa,
} = require("./dono/configs/links.json");

async function getGroupMetadataSafe(groupId, subaru) {
  const cached = cacheService.getGroupMetadata(groupId);
  if (cached) return cached;
  const meta = await cacheService.updateFromAPI(groupId, subaru);
  if (meta) return meta;
  return { id: groupId, subject: "Grupo Desconhecido", participants: [] };
}

function getGroupConfig(id) {
  const cached = groupConfigCache.get(id);
  if (cached) return cached;
  if (!fs.existsSync(`./database/grupos/${id}.json`)) return null;
  const config = JSON.parse(fs.readFileSync(`./database/grupos/${id}.json`));
  groupConfigCache.set(id, config);
  return config;
}

/* ===========================//INICIO\\================================ */
const handleCmds = async (subaru, msg) => {
  const info = msg;
  const content =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.message?.templateButtonReplyMessage?.selectedId ||
    msg.message?.interactiveResponseMessage?.body?.text ||
    "";
  const body =
    info.message?.conversation ||
    info.message?.viewOnceMessageV2?.message?.imageMessage?.caption ||
    info.message?.viewOnceMessageV2?.message?.videoMessage?.caption ||
    info.message?.imageMessage?.caption ||
    info.message?.videoMessage?.caption ||
    info.message?.extendedTextMessage?.text ||
    info.message?.viewOnceMessage?.message?.videoMessage?.caption ||
    info.message?.viewOnceMessage?.message?.imageMessage?.caption ||
    info.message?.documentWithCaptionMessage?.message?.documentMessage
      ?.caption ||
    info.message?.buttonsMessage?.imageMessage?.caption ||
    info.message?.buttonsResponseMessage?.selectedButtonId ||
    info.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    info.message?.templateButtonReplyMessage?.selectedId ||
    info?.text ||
    info.message?.editedMessage?.message?.protocolMessage?.editedMessage
      ?.extendedTextMessage?.text ||
    info.message?.editedMessage?.message?.protocolMessage?.editedMessage
      ?.imageMessage?.caption ||
    info.message?.conversation ||
    info.message?.viewOnceMessageV2?.message?.imageMessage?.caption ||
    info.message?.viewOnceMessageV2?.message?.videoMessage?.caption ||
    info.message?.imageMessage?.caption ||
    info.message?.videoMessage?.caption ||
    info.message?.extendedTextMessage?.text ||
    info.message?.viewOnceMessage?.message?.videoMessage?.caption ||
    info.message?.viewOnceMessage?.message?.imageMessage?.caption ||
    info.message?.documentWithCaptionMessage?.message?.documentMessage
      ?.caption ||
    info.message?.buttonsMessage?.imageMessage?.caption ||
    info.message?.buttonsResponseMessage?.selectedButtonId ||
    info.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    info.message?.templateButtonReplyMessage?.selectedId ||
    JSON.parse(
      info.message?.interactiveResponseMessage?.nativeFlowResponseMessage
        ?.paramsJson || "{}",
    )?.id ||
    info?.text ||
    "";
  const command = body
    .slice(prefix.length)
    .trim()
    .split(/ +/)
    .shift()
    .toLowerCase();
  const args = body.trim().split(/ +/).slice(1);
  const q = args.join(" ");
  const sz = q;
  const from = msg.key.remoteJid || msg.key.remoteLid || msg.key.remoteLid;
  const isGroup = from.endsWith("@g.us");
  const sender =
    msg.key.participant ||
    msg.key.remoteJid ||
    msg.key.remoteLid ||
    msg.key.participantLid ||
    msg.key.participantAlt;
  const userJid = info?.key?.participant?.replace(/:[0-9][0-9]|:[0-9]/g, "");
  const type = msg.type;
  const isJsonIncludes = (json, value) => {
    if (JSON.stringify(json).includes(value)) return true;
    return false;
  };
  const menc_prt =
    info?.message?.extendedTextMessage?.contextInfo?.participant ||
    info?.message?.key?.participantLid ||
    null;
  const menc_jid = args?.join(" ").includes("@")
    ? args.join(" ").replace(/[^0-9]/g, "") + "@s.whatsapp.net"
    : "";
  const menc_jid2 =
    info?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const sender_ou_n = q.includes("@") ? menc_jid : sender;
  const menc_os2 = q.includes("@") ? menc_jid : menc_prt;
  const usuariosMencionados =
    info?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const usuarioRespondido =
    info?.message?.extendedTextMessage?.contextInfo?.participant || null;
  const alvo =
    usuariosMencionados.length > 0 ? usuariosMencionados[0] : usuarioRespondido;
  const botLid2 =
    botLid || subaru.user?.lid.split(":")[0] + "@lid" || "não catou";
  const baileysIs = (msg, type) => !!msg?.message?.[type];
  const isImage = baileysIs(info, "imageMessage");
  const isVideo = baileysIs(info, "videoMessage");
  const isSticker = baileysIs(info, "stickerMessage");
  const isAudio = baileysIs(info, "audioMessage");
  const isDocument = baileysIs(info, "documentMessage");
  const isVisuU2 = baileysIs(info, "viewOnceMessageV2");
  const isContact = baileysIs(info, "contactMessage");
  const isLocation = baileysIs(info, "locationMessage");
  const isProduct = baileysIs(info, "productMessage");
  const isMedia = isImage || isVideo || isSticker || isAudio || isVisuU2;
  const quoted =
    info.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    info.quoted ||
    false;
  const quotedType = quoted ? Object.keys(quoted)[0] : null;
  const isQuotedMsg = quotedType === "conversation";
  const isQuotedMsg2 = quotedType === "text";
  const isQuotedText = quotedType === "extendedTextMessage";
  const isQuotedImage = quotedType === "imageMessage";
  const isQuotedVideo = quotedType === "videoMessage";
  const isQuotedAudio = quotedType === "audioMessage";
  const isQuotedDocument = quotedType === "documentMessage";
  const isQuotedSticker = quotedType === "stickerMessage";
  const isQuotedContact = quotedType === "contactMessage";
  const isQuotedLocation = quotedType === "locationMessage";
  const isQuotedProduct = quotedType === "productMessage";
  const isQuotedViewOnce =
    quotedType === "viewOnceMessage" || quotedType === "viewOnceMessageV2";
  const isQuotedDocW = quotedType === "documentWithCaptionMessage";
  const imgCaption = (isQuotedImage ? quoted?.imageMessage?.caption : info.message?.imageMessage?.caption) || "";
  const vidCaption = (isQuotedVideo ? quoted?.videoMessage?.caption : info.message?.videoMessage?.caption) || "";
  const convText = (isQuotedMsg ? quoted?.conversation : info.message?.conversation) || "";
  const extdText = (isQuotedText ? quoted?.extendedTextMessage?.text : info.message?.extendedTextMessage?.text) || "";
  const docNoCap = (isQuotedDocument ? quoted?.documentMessage?.caption : info.message?.documentMessage?.caption) || "";
  const docWCap =
    (isQuotedDocW
      ? quoted?.documentWithCaptionMessage?.message?.documentMessage?.caption
      : info.message?.documentWithCaptionMessage?.message?.documentMessage
          ?.caption) || "";
  const mediaInfo = isQuotedImage ? JSON.parse(JSON.stringify(info).replace("quotedM", "m")).message.extendedTextMessage.contextInfo.message.imageMessage : isQuotedVideo ? JSON.parse(JSON.stringify(info).replace("quotedM", "m")).message.extendedTextMessage.contextInfo.message.videoMessage : isQuotedSticker ? JSON.parse(JSON.stringify(info).replace("quotedM", "m")).message.extendedTextMessage.contextInfo.message.stickerMessage : info;

  function getGroupAdmins(participants) {
    let admins = [];
    for (let i of participants) {
      if (i.admin == "admin") admins.push(i.id);
      if (i.admin == "superadmin") admins.push(i.id);
    }
    return admins;
  }

  const toJid = (id) => {
    if (!id) return "";
    if (id.endsWith("@lid")) return id.replace("@lid", "@s.whatsapp.net");
    if (id.includes("@")) return id;
    return `${id}@s.whatsapp.net`;
  };

  function getSenderLid(msg) {
    const { jidDecode, jidEncode } = baileysPkg;
    try {
      const sender = msg?.key?.participant || msg?.key?.remoteJid || msg?.key?.remoteLid || msg?.key?.participantLid || msg?.key?.participantAlt || "";
      const user = jidDecode(sender)?.user || sender.split("@")[0] || "";
      const lid = jidEncode(user, "lid");
      return { jid: sender, lid };
    } catch (err) {
      // console.error('Erro ao gerar LID do remetente:', err);
      return { jid: null, lid: null };
    }
  }
  const emoji = "🌹"
  const groupMetadata = isGroup ? await getGroupMetadataSafe(from, subaru) : "";
  const participants = isGroup ? await groupMetadata.participants : "";
  const groupName = isGroup ? groupMetadata.subject : "";
  const groupDesc = isGroup ? groupMetadata.desc : "";
  const groupMembers = isGroup ? groupMetadata.participants : [];
  const groupMemb2 = isGroup ? groupMetadata.participants.map((p) => p.id) : [];
  const groupAdmins = isGroup ? getGroupAdmins(groupMembers) : "";
  let senderJid;
  if (isGroup) {
    const participant = info.key.participant;
    if (!participant) {
      senderJid = null;
    } else if (participant.includes(":")) {
      senderJid = participant.split(":")[0] + "@s.whatsapp.net";
    } else if (participant.endsWith("@lid")) {
      const membro = groupMembers.find((m) => m.lid === participant);
      senderJid = membro ? membro.jid : null;
    } else {
      senderJid = participant;
    }
  } else {
    senderJid = info.key.remoteJid;
  }

  const senderObject = groupMembers.find(
    (member) =>
      member.jid === sender || member.id === sender || member.lid === sender,
  );
  let senderLid = senderObject ? senderObject.lid || senderObject.id : null;
  const sender2 = senderLid || senderJid;
  const isCmd = content.startsWith(prefix);
  const cmd = isCmd
    ? content.slice(1).trim().split(/ +/).shift().toLocaleLowerCase()
    : null;
  const comando = cmd;
  const pushname = info.pushName ? info.pushName : "";
  const numeroBot = subaru.user.id.split(":")[0] + "@s.whatsapp.net";
  const isDono = sender.includes(donoNmr) || sender === donoLid;
  const isBotGroupAdmins = groupAdmins.includes(botLid2) || groupAdmins.includes(numeroBot) || false;
  const isGroupAdmins = groupAdmins.includes(sender) || groupAdmins.includes(senderLid) || groupAdmins.includes(senderJid) || groupAdmins.includes(sender2) || isDono || false;
  const isAdm = isGroupAdmins;
  const participantes = isGroup
    ? groupMetadata.participants.map((usuario) => usuario.id)
    : "";
  const mencionados = isGroup
    ? participantes.sort(() => 0.5 - Math.random()).slice(0, 5)
    : "";
  var budy =
    info?.message?.conversation ||
    info?.message?.extendedTextMessage?.text ||
    "";
  const adivinha =
    info.key.id.length > 21
      ? "Android"
      : info.key.id.substring(0, 2) == "3A"
        ? "iPhone"
        : "WhatsApp Web";
  const somembros = isGroup
    ? groupMembers.length > 0
      ? getMembros(groupMembers)
      : getAdmins(groupMembers)
    : [];
  //====================( FACILITADORES )====================//
  const esperar = (tempo) => {
    return new Promise((resolve) => setTimeout(resolve, tempo));
  };

  // Converte uma stream de dados em um buffer.
  async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return chunks;
  }

  //====================( FUNÇÕES DE ENVIO DE MÍDIA )====================//
  // Envia uma resposta de texto estilizada como se fosse de um canal.
  async function reply(texto) {
    await subaru.sendPresenceUpdate("composing", from);
    await esperar(1000);
    subaru.sendMessage(
      from,
      {
        text: texto,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: `${idCanal}`,
            newsletterName: "『𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞』",
          },
        },
      },
      { quoted: info },
    );
  }

  async function reply2(texto) {
    await subaru.sendPresenceUpdate("composing", from);
    await esperar(1000);
    subaru.sendMessage(from, { text: texto }, { quoted: info });
  }

  async function DLT_FL(file) {
    try {
      fs.unlinkSync(file);
    } catch (error) {}
  }

  // Envia uma mensagem de texto, mas com um quoted de loc.

  //enviar mensagem de texto simples.
  const enviar = (texto) => {
    subaru.sendMessage(from, { text: texto }, { quoted: info });
  };

  // Envia uma imagem a partir de um link.
  const enviarImg = (link) => {
    subaru.sendMessage(from, { image: { url: link } }, { quoted: info });
  };

  // Envia uma imagem com legenda.
  const enviarImg2 = (link, texto) => {
    subaru.sendMessage(
      from,
      { image: { url: link }, caption: texto },
      { quoted: info },
    );
  };

  // Envia um vídeo a partir de um link.
  const enviarVd = (link) => {
    subaru.sendMessage(
      from,
      { video: { url: link }, mimetype: "video/mp4" },
      { quoted: info },
    );
  };

  // Envia um vídeo com legenda.
  const enviarVd2 = (link, texto) => {
    subaru.sendMessage(
      from,
      { video: { url: link }, caption: texto, mimetype: "video/mp4" },
      { quoted: info },
    );
  };

  // Envia um áudio (como se fosse gravado).
  const enviarAd = (link) => {
    subaru.sendMessage(
      from,
      {
        audio: { url: link },
        mimetype: "audio/mpeg",
        ptt: true,
        contextInfo: { forwardingScore: 999, isForwarded: true },
      },
      { quoted: info },
    );
  };
  //====================( FUNÇÕES DE MENÇÃO )====================//
  // Envia uma imagem mencionando usuários no texto.
  const mencionarIMG = async (teks = "", FileN, membrosGrupo = []) => {
    const memberr = [];
    const senderInfo = getSenderLid(somembros);
    const senderJid = toJid(senderInfo.lid);
    memberr.push(senderJid);
    const palavras = teks.split(/\s+/);
    for (const palavra of palavras) {
      if (palavra.startsWith("@")) {
        const tag = palavra.replace("@", "").replace(/\D/g, "");
        const member = membrosGrupo.find((m) => m.includes(tag));
        if (member && !memberr.includes(member)) {
          memberr.push(member);
        }
      }
    }
    await subaru
      .sendMessage(
        from,
        { image: { url: FileN }, caption: teks.trim(), mentions: memberr },
        { quoted: seloSz },
      )
      .catch(async () => {
        await subaru.sendMessage(
          from,
          { text: "Erro ao enviar imagem." },
          { quoted: seloSz },
        );
      });
  };

  // Envia um texto mencionando um array de usuários.
  const mentions = async (teks = "", membrosGrupo = [], id = null) => {
    const memberr = [];
    const senderInfo = getSenderLid(info);
    const senderJid = toJid(senderInfo.lid);
    memberr.push(senderJid);
    const lines = teks.split("\n");
    for (const line of lines) {
      for (const word of line.split(" ")) {
        if (word.startsWith("@")) {
          const tag = word.replace("@", "").replace(/\D/g, "");
          const member = membrosGrupo.find((m) => m.includes(tag));
          if (member && !memberr.includes(member)) {
            memberr.push(member);
          }
        }
      }
    }

    if (!id) {
      await subaru.sendMessage(from, { text: teks.trim(), mentions: memberr });
    } else {
      await subaru.sendMessage(
        from,
        { text: teks.trim(), mentions: memberr },
        { quoted: seloSz },
      );
    }
  };

  const mention = async (teks = "", membrosGrupo = []) => {
    const members = [];
    const senderInfo = getSenderLid(info);
    const senderJid = toJid(senderInfo.lid);
    members.push(senderJid);
    const lines = teks.split("\n");
    for (const line of lines) {
      for (const word of line.split(" ")) {
        if (word.startsWith("@")) {
          const tag = word.replace("@", "").replace(/\D/g, "");
          const member = membrosGrupo.find((m) => m.includes(tag));
          if (member && !members.includes(member)) {
            members.push(member);
          }
        }
      }
    }

    await subaru
      .sendMessage(
        from,
        { text: teks.trim(), mentions: members },
        { quoted: seloSz },
      )
      .catch(async () => {
        await subaru.sendMessage(
          from,
          { text: "Erro ao enviar mensagem." },
          { quoted: seloSz },
        );
      });
  };

  //====================( FUNÇÕES DO RENAME )====================//
  const { Sticker } = require("./database/outros/sticker/rename/sticker.cjs");
  const figname = JSON.parse(
    fs.readFileSync("./database/outros/sticker/figname.json"),
  );
  const permuteFigPackName = (secondtxt, usu = sender) => {
    if (isJsonIncludes(figname, usu)) {
      let AB = figname.map((i) => i.id).indexOf(usu);
      if (isJsonIncludes(figname[AB].fig, "pack")) {
        let BC = figname[AB].fig.map((i) => i.mod).indexOf("pack");
        return figname[AB].fig[BC].pack;
      } else return secondtxt;
    } else return secondtxt;
  };
  const permuteFigAuthorName = (secondtxt, usu = sender) => {
    if (isJsonIncludes(figname, usu)) {
      AB = figname.map((i) => i.id).indexOf(usu);
      if (isJsonIncludes(figname[AB].fig, "author")) {
        BC = figname[AB].fig.map((i) => i.mod).indexOf("author");
        return figname[AB].fig[BC].author;
      } else return secondtxt;
    } else return secondtxt;
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function renameContextSticker3(pack, autor, txt = ``, hehe) {
    let AB;
    let BC;
    let getFile;
    const isJsonIncludes = (json, value) => {
      if (JSON.stringify(json).includes(value)) return true;
      return false;
    };
    const permuteFigPackName = (secondtxt, usu = sender) => {
      if (isJsonIncludes(figname, usu)) {
        AB = figname.map((i) => i.id).indexOf(usu);
        if (isJsonIncludes(figname[AB].fig, "pack")) {
          BC = figname[AB].fig.map((i) => i.mod).indexOf("pack");
          return figname[AB].fig[BC].pack;
        } else return secondtxt;
      } else return secondtxt;
    };
    const permuteFigAuthorName = (secondtxt, usu = sender) => {
      if (isJsonIncludes(figname, usu)) {
        AB = figname.map((i) => i.id).indexOf(usu);
        if (isJsonIncludes(figname[AB].fig, "author")) {
          BC = figname[AB].fig.map((i) => i.mod).indexOf("author");
          return figname[AB].fig[BC].author;
        } else return secondtxt;
      } else return secondtxt;
    };
    try {
      getfile = await getFileBuffer(
        info.message.extendedTextMessage.contextInfo.quotedMessage
          .stickerMessage,
        "sticker",
      );
      var _sticker = new Sticker();
      _sticker.addFile(getfile);
      _sticker.options.metadata = {
        pack: pack,
        author: autor,
        emojis: ["🤠", "🥶", "😻"],
      };
      resultadoSt = await _sticker.start();
      await subaru.sendMessage(
        from,
        {
          sticker: fs.readFileSync(resultadoSt[0].value),
          contextInfo: {
            externalAdReply: {
              title: txt,
              body: "",
              previewType: "PHOTO",
              thumbnail: fs.readFileSync(resultadoSt[0].value),
            },
          },
        },
        { quoted: seloSz },
      );
      await fs.unlinkSync(resultadoSt[0].value);
    } catch (e) {
      console.log(e);
    }
  }
  //====================( FIM - FUNÇÕES DO RENAME )====================//

  //====================( FUNÇÕES DE REAÇÃO )====================//
  // Reage a uma mensagem
  const react = (reassao) => {
    subaru.sendMessage(from, { react: { text: reassao, key: info.key } });
  };

  const reagir = (reassao) => {
    subaru.sendMessage(from, { react: { text: reassao, key: info.key } });
  };

  // Atalhos para reações comuns.
  const successReact = () => react("✅");
  const waitReact = () => react("⏳");
  const warningReact = () => react("⚠️");
  const errorReact = () => react("❌");

  //====================( FUNÇÕES DE FIGURINHA / STICKER )====================//
  // Converte imagem para figurinha.
  const sendImageAsSticker2 = async (
    subaru,
    jid,
    path,
    quoted,
    options = {},
  ) => {
    let buff = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
        ? Buffer.from(path.split`,`[1], "base64")
        : /^https?:\/\//.test(path)
          ? await await getBuffer(path)
          : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifImg2(buff, options);
    } else {
      buffer = await imageToWebp2(buff);
    }
    await subaru.sendMessage(
      jid,
      { sticker: { url: buffer }, ...options },
      { quoted },
    );
    return buffer;
  };

  // Converte vídeo para figurinha.
  const sendVideoAsSticker2 = async (
    subaru,
    jid,
    path,
    quoted,
    options = {},
  ) => {
    let buff = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
        ? Buffer.from(path.split`,`[1], "base64")
        : /^https?:\/\//.test(path)
          ? await await getBuffer(path)
          : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifVid2(buff, options);
    } else {
      buffer = await videoToWebp2(buff);
    }
    await subaru.sendMessage(
      jid,
      { sticker: { url: buffer }, ...options },
      { quoted },
    );
    return buffer;
  };
  //====================( FUNÇÕES DE GRUPOS )====================//
  const pastaDosGrupos = "./database/grupos/";
  if (!fs.existsSync(pastaDosGrupos)) {
    fs.mkdirSync(pastaDosGrupos, { recursive: true });
  }

  const PastaDeGrupos = `${pastaDosGrupos}${from}.json`;
  if (isGroup && !fs.existsSync(PastaDeGrupos)) {
    var datea = [
      {
        name: groupName,
        antilink: false,
        bemVindo: [
          {
            ativo: false,
            foto: "LINK",
            entrou:
              "Opa, %numero%\n\nAntes de sair clicando por aí, dá uma olhada nas regras pra não se perder:\n1️⃣ Seja respeitoso com todos.\n2️⃣ Nada de flood ou spam.\n3️⃣ Aproveite o grupo e participe das interações!\n\nSeja bem-vindo e bora se divertir! 💙",
            saiu: "Oh não… %numero% saiu do grupo! 😢\n\nEsperamos que você volte logo, mas enquanto isso, o Subaru-Bot segue firme e forte! 💪\n\nSe cuida por aí!",
          },
        ],
        antiimg: false,
        antivideo: false,
        antiaudio: false,
        antisticker: false,
        antidoc: false,
        antictt: false,
        antiloc: false,
        banchat: true,
        simih: false,
        modobn: false,
        autosticker: false,
        autodown: false,
        leveling: false,
        listanegra: [],
        advertir: [],
        antiarquivamento: {
          ativo: false,
          autorizados: [],
        },
      },
    ];
    fs.writeFileSync(PastaDeGrupos, JSON.stringify(datea, null, 2) + "\n");
  }
  const ArquivosDosGrupos = isGroup ? getGroupConfig(from) : undefined;

  function ModificaGrupo(index) {
    fs.writeFileSync(PastaDeGrupos, JSON.stringify(index, null, 2) + "\n");
    groupConfigCache.set(from, index); 
  }
  function setNes(index) {
    fs.writeFileSync(nescj, JSON.stringify(index, null, 2) + "\n");
    groupConfigCache.set(from, index); 
  }
  function setGp(index) {
    fs.writeFileSync(PastaDeGrupos, JSON.stringify(index, null, 2) + "\n");
  }

  //====================( CONSTS DE GRUPOS )====================//
  const isAntiLink = isGroup ? ArquivosDosGrupos?.[0]?.antilink : undefined;
  const BemVindoAcao = isGroup ? ArquivosDosGrupos?.[0]?.bemVindo?.[0] : undefined;
  const isBemVindo = isGroup ? ArquivosDosGrupos?.[0]?.bemVindo?.[0]?.ativo : undefined;
  const isAntiImg = isGroup ? ArquivosDosGrupos?.[0]?.antiimg : undefined;
  const isAntiVid = isGroup ? ArquivosDosGrupos?.[0]?.antivideo : undefined;
  const isAntiAudio = isGroup ? ArquivosDosGrupos?.[0]?.antiaudio : undefined;
  const isAntiSticker = isGroup ? ArquivosDosGrupos?.[0]?.antisticker : undefined;
  const isAntiDoc = isGroup ? ArquivosDosGrupos?.[0]?.antidoc : undefined;
  const isAntiCtt = isGroup ? ArquivosDosGrupos?.[0]?.antictt : undefined;
  const isAntiLoc = isGroup ? ArquivosDosGrupos[0].antiloc : undefined;
  const isBanchat = isGroup ? ArquivosDosGrupos?.[0].banchat : undefined;
  const isSimih = isGroup ? ArquivosDosGrupos?.[0].simih : undefined;
  const isModobn = isGroup ? ArquivosDosGrupos?.[0].modobn : undefined;
  const isAntiArq = isGroup ? ArquivosDosGrupos?.[0].antiarquivamento.ativo : undefined;
  const isAutoSticker = isGroup ? ArquivosDosGrupos?.[0].autosticker : undefined;
  const isAutoDown = isGroup ? ArquivosDosGrupos?.[0].autodown : undefined;
  //====================( FIM CONSTS DE GRUPOS )====================//

  //====================( AUTO STICKER )====================//
  if (isAutoSticker && isGroup) {
    async function autofiguf() {
      setTimeout(async () => {
        if (budy.startsWith(prefix)) return;
        if (!isImage && !isVideo) return;
        let packauto = `⚝ ⇝ Grupo:\n${groupName}`;
        let authorauto = `⚝ ⇝ User ⚒${pushname}\n`;
        let boij2 =
          info.message?.imageMessage ||
          info.message?.viewOnceMessage?.message?.imageMessage ||
          info.message?.viewOnceMessageV2?.message?.imageMessage;
        let boij =
          info.message?.videoMessage ||
          info.message?.viewOnceMessage?.message?.videoMessage ||
          info.message?.viewOnceMessageV2?.message?.videoMessage;
        try {
          if (boij2) {
            let owgi = await getFileBuffer(boij2, "image");
            let encmediaa = await sendImageAsSticker2(
              subaru,
              from,
              owgi,
              info,
              {
                packname: packauto,
                author: authorauto,
              },
            );
            await DLT_FL(encmediaa);
          } else if (boij && boij.seconds < 11) {
            let owgi = await getFileBuffer(boij, "video");
            let encmedia = await sendVideoAsSticker2(subaru, from, owgi, info, {
              packname: packauto,
              author: authorauto,
            });
            await DLT_FL(encmedia);
          }
        } catch (e) {
          console.error("Erro no autosticker:", e);
        }
      }, 100);
    }
    autofiguf().catch((e) => console.error(e));
  }

  //====================( SIMILARITY / SIMILARIDADE )====================//
  let findindex = fs.readFileSync("index.js").toString().match(/case\s+'(.+?)'/g);
  
  const getallcases = () => {
    const content = fs.readFileSync("index.js", "utf-8");
    const matches = content.matchAll(/case\s+'(.+?)'/g);
    return [...matches].map(match => match[1]);
};
  const rmLetras = (txt) => {
    return txt
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };
  const allCases = getallcases();
  const similarityCmd = (txt) => {
    let getsmlrt = getSimilarity(allCases, txt);
    if (rmLetras(getsmlrt.nome).includes("nao encontrado"))
      return [{ comando: getsmlrt.nome, porcentagem: getsmlrt.porcentagem }];
    return [
      {
        comando: prefix + getsmlrt.nome,
        porcentagem: Number(getsmlrt.porcentagem).toFixed(1),
      },
    ];
  };
  //====================( FIM SIMILARITY / SIMILARIDADE )====================//

  const identifyAtSign = (number) => {
    const cleanNumber = number.includes("@") ? number.split("@")[1] : number;
    return (
      cleanNumber.replace(new RegExp("[()+-/ +/]", "gi"), "") +
      "@s.whatsapp.net"
    );
  };
  const detectTinder = (query) => {
    return query.replace(/#p#/g, prefix).replace(/#pc#/g, prefix + comando);
  };

  //======(JOGO-DA-VELHA)=======(Função)===\\
  //=========(FUNÇÃO-JOGO-DA-VELHA)=========\\
  //By: Spiral
  //Agora menciona a pessoa ao invés de mostrar o lid
  const { validmove, setGame } = require("./database/tictactoe/index.js");
  const argss = body.split(/ +/g);
  function normalizeJid(jid = "") {
    if (!jid) return "";
    return jid.replace(/@.+/, "").trim();
  }

  let JOGO_D_V = fs.existsSync(`./database/tictactoe/db/${from}.json`)
    ? JSON.parse(fs.readFileSync(`./database/tictactoe/db/${from}.json`))
    : false;
  async function joguinhodavelha() {
    console.log(
      "🚀 joguinhodavelha() chamada — from:",
      from,
      "sender:",
      sender,
      "mensagem:",
      budy,
    );
    const cmde = (budy || "").trim().toLowerCase();
    const arrNum = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let boardnow;
    if (JOGO_D_V != false) {
      boardnow = setGame(`${from}`);
      const normalizedSender = normalizeJid(sender);
      if (["s", "sim", "ok"].includes(cmde)) {
        console.log("✅ Recebeu aceitação ('s')");
        if (normalizeJid(boardnow.O) === normalizedSender) {
          if (boardnow.status) return reply("O jogo já começou antes!");
          boardnow.status = true;
          fs.writeFileSync(
            `./database/tictactoe/db/${from}.json`,
            JSON.stringify(boardnow, null, 2),
          );

          const matrix = boardnow._matrix;
          const chatAccept = `*🎮 JOGO DA VELHA 🕹️*
❌ : @${normalizeJid(boardnow.X)}
⭕ : @${normalizeJid(boardnow.O)}

Sua vez... : @${boardnow.turn == "X" ? normalizeJid(boardnow.X) : normalizeJid(boardnow.O)}

${matrix[0][0]}${matrix[0][1]}${matrix[0][2]}
${matrix[1][0]}${matrix[1][1]}${matrix[1][2]}
${matrix[2][0]}${matrix[2][1]}${matrix[2][2]}
`;
          await subaru.sendMessage(from, {
            text: chatAccept,
            mentions: [
              boardnow.X,
              boardnow.O,
              boardnow.turn == "X" ? boardnow.X : boardnow.O,
            ],
          });
        }
        return;
      } else if (["n", "não", "nao", "no"].includes(cmde)) {
        console.log("❌ Recebeu recusa ('n')");
        if (normalizeJid(boardnow.O) === normalizedSender) {
          if (boardnow.status) return reply("O jogo já começou!");
          DLT_FL(`./database/tictactoe/db/${from}.json`);
          await subaru.sendMessage(from, {
            text: `@${normalizeJid(boardnow.X)} *_Infelizmente seu oponente não aceitou o desafio ❌😕_*`,
            mentions: [boardnow.X],
          });
        }
        return;
      }
    }

    if (arrNum.includes(cmde)) {
      boardnow = setGame(`${from}`);
      const normalizedSender = normalizeJid(sender);
      if (!boardnow.status)
        return reply("Parece que seu oponente não aceitou o desafio ainda...");

      const currentPlayer = boardnow.turn == "X" ? boardnow.X : boardnow.O;
      if (normalizeJid(currentPlayer) != normalizedSender) {
        console.log("Não é o turno desse usuário, ignorando movimento.");
        return;
      }

      const moving = validmove(Number(cmde), `${from}`);
      const matrix = moving._matrix;

      if (moving.isWin) {
        if (moving.winner == "SERI") {
          reply("*🎮 Jogo termina empatado 😐*");
          DLT_FL(`./database/tictactoe/db/${from}.json`);
          return;
        }

        const winnerJID = moving.winner == "O" ? moving.O : moving.X;
        const chatWon = `*🎮 Vencido por @${normalizeJid(winnerJID)} 😎👑*`;

        await subaru.sendMessage(from, {
          text: chatWon,
          mentions: [winnerJID, moving.X, moving.O],
        });

        setTimeout(() => {
          if (fs.existsSync(`./database/tictactoe/db/${from}.json`)) {
            DLT_FL(`./database/tictactoe/db/${from}.json`);
            reply("*🕹️JOGO DA VELHA RESETADO...🕹️*");
          }
        }, 300000);

        await subaru.sendMessage(from, {
          text: `_*🥳Parabéns @${normalizeJid(winnerJID)}, você ganhou! 🎉*_`,
          mentions: [winnerJID],
        });

        DLT_FL(`./database/tictactoe/db/${from}.json`);
      } else {
        const chatMove = `*🎮 JOGO DA VELHA 🕹️*
❌ : @${normalizeJid(moving.X)}
⭕ : @${normalizeJid(moving.O)}

Sua vez : @${normalizeJid(moving.turn == "X" ? moving.X : moving.O)}

${matrix[0][0]}${matrix[0][1]}${matrix[0][2]}
${matrix[1][0]}${matrix[1][1]}${matrix[1][2]}
${matrix[2][0]}${matrix[2][1]}${matrix[2][2]}
`;
        await subaru.sendMessage(from, {
          text: chatMove,
          mentions: [
            moving.X,
            moving.O,
            moving.turn == "X" ? moving.X : moving.O,
          ],
        });
      }
    }
  }

  if (fs.existsSync(`./database/tictactoe/db/${from}.json`)) {
    await joguinhodavelha();
  }
  //===========================================\\

  if (isBanchat && !isDono) {
    return; //console.log(`Comando efetuado, mas tô off.`)
  }

  //==========( ABAIXO OS COMANDOS POR FIGURINHA )==========\\
  /* ⚠️LEMBRE SE DE MUDAR O ID DAS FIGURINHAS. ⚠️
   * Use o comando: stickerid para obter o id da figurinha.
   * O id correspondente você copia e cola no nome da case, como está abaixo.
   * Sim, é um número grande kkkj.
   */
  const ID_STICKER =
    info?.message?.stickerMessage?.fileSha256?.toString("base64");
  switch (ID_STICKER) {
    case "224,29,192,69,230,158,143,233,214,97,171,139,34,202,216,5,213,12,19,109,66,2,13,44,190,228,78,235,5,183,50,44": {
      if (!isAdm && !isDono) return;
      await subaru.groupSettingUpdate(from, "not_announcement");
      await reply("Grupo aberto!");
      break;
    }

    case "255,188,36,70,82,133,151,88,212,31,209,208,178,175,33,239,17,88,170,129,25,64,163,175,2,13,240,49,94,160,133,2": {
      if (!isAdm && !isDono) return;
      await subaru.groupSettingUpdate(from, "announcement");
      await reply("Grupo fechado!");
      break;
    }

    default:
    //console.log('ID da figurinha não reconhecido:', ID_STICKER);
  } //CUIDADO! AQUI FECHA O SWITCH DOS COMANDOS POR FIGURINHA!!

  //=====( ABAIXO OS COMANDOS SEM PREFIXO )=====\\

  if (!checkPrefix(body, prefix)) {
    switch (body.toLowerCase().trim()) {
      case "prefixo": {
        await sendButtons(
          subaru,
          from,
          {
            text: `> ┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓֪࣪
> │ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
> ┃࣪ ┃֪ׅ࣪ׄ᨞⁞❄️✿𖥔࣪ Olá, eu sou o ${botName} ❄️
> ┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ Esse é o meu prefixo: ${prefix}
> ┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ Leia o 『 ${prefix}menu 』
> ┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
> ┗╾ׁ┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`,
            footer: `_By ${donoName}_`,
            buttons: [
              {
                id: `${prefix}menu`,
                text: "📜 Menu",
              },
            ],
          },
          { quoted: info },
        );
        break;
      }
    } //SWITCH COMANDOS SEM PREFIXO

    if (body && /^p\s+/i.test(body.trim())) {
      const q1 = body.trim().slice(1).trim();
      await react("🎵");
      try {
        let videoUrl, titulo, duracao, thumb, canal, views;
        let data = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY");
        let hora = moment().tz("America/Sao_Paulo").format("HH:mm:ss");
        if (/https?:\/\/(www\.)?youtube\.com\/|youtu\.be\//.test(q1)) {
          videoUrl = q1;
          let res = await fetch(
            `${baseRaikken}/api/mp3/url?url=${encodeURIComponent(q1)}&apikey=${RaikkenKey}`,
          );
          let json = await res.json();
          if (!json.success || !json.message)
            throw new Error(
              "Não foi possível processar o link. Tente novamente.",
            );
          let m = json.message;
          titulo = m.title;
          duracao = m.duration;
          thumb = m.thumbnail;
          canal = m.channel?.name || "Desconhecido";
          views = null;
        } else {
          reply("🔎 Buscando sua música...");
          let res = await fetch(
            `${baseRaikken}/api/play/search?query=${encodeURIComponent(q1)}&apikey=${RaikkenKey}`,
          );
          let json = await res.json();
          if (!json.success || !Array.isArray(json.message))
            throw new Error(
              "Não foi possível encontrar a música com esse nome.",
            );
          let result = json.message.find((r) => r.type === "video");
          if (!result)
            throw new Error("Nenhum vídeo encontrado para essa busca.");
          videoUrl = result.url;
          titulo = result.title;
          duracao = result.timestamp;
          thumb = result.image;
          canal = result.author?.name || "Desconhecido";
          views = result.views ?? null;
        }

        const thumbResponse = await fetch(thumb);
        const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
        const imageMedia = await prepareWAMessageMedia(
          { image: thumbBuffer },
          { upload: subaru.waUploadToServer },
        );

        const textin = `┏╾╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *🎵 Música Encontrada!*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Título:* ${titulo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Duração:* ${duracao}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Canal:* ${canal}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Views:* ${views ? views.toLocaleString("pt-BR") : "N/A"}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Link:* ${videoUrl}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Data:* ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Hora:* ${hora}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`;

        const interactiveMessage = {
          header: {
            ...imageMedia,
            hasMediaAttachment: true,
            title: "",
          },
          body: {
            text: textin,
          },
          footer: {
            text: "🎶 Selecione uma opção abaixo",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🎧 Áudio",
                  id: `${prefix}play ${videoUrl}`,
                }),
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "▶️ Vídeo",
                  id: `${prefix}playvideo ${videoUrl}`,
                }),
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "📄 Documento",
                  id: `${prefix}playdoc ${videoUrl}`,
                }),
              },
            ],
            messageParamsJson: "",
          },
        };
        await sendInteractiveMessage(
          subaru,
          from,
          { interactiveMessage },
          {
            additionalAttributes: {},
            useCachedGroupMetadata: true,
          },
        );
      } catch (e) {
        console.log(e);
        botSemKey(subaru, grupoName, comando);
      }
      return;
    }

    async function sendUrlText(
      id,
      textCaption,
      title,
      desc,
      imageUrl,
      linkAcess,
      quotedThis,
    ) {
      await subaru.sendMessage(
        id,
        {
          text: textCaption,
          contextInfo: {
            externalAdReply: {
              title: title,
              body: desc,
              thumbnail: await getBuffer(imageUrl),
              mediaType: 1,
              sourceUrl: linkAcess,
            },
          },
        },
        { quoted: quotedThis },
      );
    }

    if (body === "prefixo2") {
      subaru.sendMessage(from, { react: { text: `🙂‍↔`, key: info.key } });
      try {
        let ppimg = await subaru.profilePictureUrl(
          `${senderJid.split("@")[0]}@s.whatsapp.net`,
          "image",
        );
      } catch {
        ppimg = "https://i.postimg.cc/J0jC8w1f/perfil.jpg";
      }
      let prefixmsg2 = `> *Olá! Esse é meu Prefixo:『 ${prefix} 』*`;
      sendUrlText(
        from,
        prefixmsg2,
        botName,
        `${hora}, ${pushname}`,
        ppimg,
        `Subaru-Base `,
        info,
      );
    }

    if (body.toLowerCase().includes(`💀`)) {
      if (!isQuotedSticker) return;
      reply2("⏳ Aguarde, processando figurinha...");
      react("😎");
      renameContextSticker3(
        permuteFigPackName(null),
        permuteFigAuthorName(pushname),
        `It's from: ${pushname} ⚖️`,
        info,
      ).catch((err) => {
        reply2(`❌ Erro, tenta mais tarde`);
      });
    }

    if (body.trim().startsWith("$")) {
      if (!isDono) return;
      console.log("$");
      const isFreeCommand = body.startsWith("$free -h");
      new Promise((resolve, reject) => {
        exec(body.slice(1), (err, stdout) => {
          err ? reject(err) : resolve(stdout);
        });
      })
        .then((result) => {
          if (isFreeCommand) {
            const lines = result.trim().split("\n");
            const memInfo = lines[1].split(/\s+/);
            const swapInfo = lines[2].split(/\s+/);
            const message = `> Total de memória: ${memInfo[1]}
> Memória em uso: ${memInfo[2]}
> Memória livre: ${memInfo[3]}
> Memória compartilhada: ${memInfo[4]}
> Memória em cache: ${memInfo[5]}
> Memória disponível: ${memInfo[6]}
> Total de swap: ${swapInfo[1]}
> Swap em uso: ${swapInfo[2]}
> Swap livre: ${swapInfo[3]}`;
            reply(message);
          } else {
            reply(result);
          }
        })
        .catch((e) => {
          reply(util.inspect(e.message, { depth: null }));
        });
      return;
    }

    if (body.trim().startsWith("=>")) {
      if (!isDono) return;
      console.log("=>");
      new Promise((resolve, reject) => {
        try {
          resolve(eval(`(async () => { return ${body.slice(2)} })()`));
        } catch (e) {
          reject(e);
        }
      })
        .then((result) => {
          reply(util.inspect(result, { depth: null }));
        })
        .catch((e) => {
          reply(util.inspect(e, { depth: null }));
        });
      return;
    }

    if (body.trim().startsWith(">")) {
      try {
        if (!isDono) {
          return;
        }
        console.log(">");
        return subaru
          .sendMessage(from, {
            text: JSON.stringify(eval(budy.slice(2)), null, "\t"),
          })
          .catch((e) => {
            return reply(String(e));
          });
      } catch (e) {
        return reply(String(e));
      }
      return;
    }

    if (isSimih && isGroup && budy != undefined) {
      if (["imageMessage", "audioMessage", "stickerMessage"].includes(type) ||info.key.fromMe) {return; } //1
      try {
        const persona = escolherPersonalidadeSubaru();
        const simiPersonality = `${persona.prompt}`;
        const { data } = await axios.post(`${baseRaikken}/api/ia/chat-simi?apikey=${RaikkenKey}`,
          {message: budy,
            personality: simiPersonality,
          },);
        if (data && data.response) { await subaru.sendMessage( from, { text: data.response }, { quoted: info });
        } else {
          const errorMessage = "Não entendi! Pode me explicar melhor?";
          await subaru.sendMessage( from, { text: errorMessage }, { quoted: info });
        }
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          // await subaru.sendMessage(from, { text: err.response.data.error }, { quoted: info });
        } else {
          console.error(err);
          //await subaru.sendMessage(from, { text: `Erro ao consultar a IA.` }, { quoted: info });
        }
      }
    }

    //====================( AUTO DOWNLOAD )====================//
    if (isAutoDown && isGroup) {
      if (body.includes("youtube.com") || body.includes("youtu.be")) {
        reply("Link do youtube detectado, enviarei o áudio.");
        const endpoint = `${baseRaikken}/mp3/url?url=${encodeURIComponent(body)}&apikey=${RaikkenKey}`;
        try {
          const res = await fetch(endpoint);
          const json = await res.json();
          if (!json.status || !json.result?.success) {
            return subaru.sendMessage(from, {
              text: "❌ Não foi possível obter o áudio. Verifique a URL e tente novamente.",
            });
          }
          const title = json.result.data.title;
          const mp3 = json.result.data.downloadUrl;

          await subaru.sendMessage(
            from,
            {
              audio: { body: mp3 },
              mimetype: "audio/mp4",
              ptt: false,
              fileName: `${title}.mp3`,
            },
            { quoted: info },
          );
        } catch (err) {
          console.error("Erro no comando .play:", err);
          await subaru.sendMessage(chat, {
            text: "⚠️ Erro ao processar o áudio. Tente novamente mais tarde.",
          });
        }
      } else if (body.includes("instagram.com")) {
        reply2("Link do insta detectado, enviarei o video.");
        try {
          const urlApi = `${baseRaikken}/instagram?url=${encodeURIComponent(body)}&apikey=${RaikkenKey}`;
          const res = await axios.get(urlApi);
          const json = res.data;
          if (!json.status || !json.resultado?.video) {
            return reply(
              "❌ Não consegui baixar o vídeo. Verifique o link e tente novamente.",
            );
          }
          const { video, legenda, perfil } = json.resultado;
          const buffer = await getBuffer(video);

          await subaru.sendMessage(
            from,
            {
              video: buffer,
              caption: `🎬 *Reel de:* @${perfil}\n\n📝 ${legenda || "Sem legenda"}\n> ©Andy-Bot v2\n> ${Raikken}`,
            },
            { quoted: info },
          );
        } catch (e) {
          reply(`Eu ao baixar video do insta. ${e}`);
        }
      } else if (body.includes("tiktok.com")) {
        reply2("Link do tiktok detectado, enviarei o video.");
        try {
          const res = await fetch(
            `${baseRaikken}/tiktok-link?url=${encodeURIComponent(body)}&apikey=${RaikkenKey}`,
          );
          const json = await res.json();
          if (!json.status || !json.data || !json.data.length) {
            return enviar("⚠️ Vídeo não encontrado ou inválido.");
          }
          const videoHD =
            json.data.find((v) => v.type === "nowatermark_hd")?.url ||
            json.data.find((v) => v.type === "nowatermark")?.url ||
            json.data[0].url;

          const legenda = `
👤 Autor: ${json.author.nickname} (@${json.author.fullname})
📆 Postado em: ${json.taken_at}
📊 Visualizações: ${json.stats.views}
❤️ Curtidas: ${json.stats.likes}
🔄 Compartilhamentos: ${json.stats.share}

> ${Raikken}`.trim();
          await subaru.sendMessage(
            from,
            {
              video: { url: videoHD },
              caption: legenda,
              mimetype: "video/mp4",
            },
            { quoted: info },
          );
        } catch (e) {
          reply(`Erro ao baixar video do tiktok. ${e}`);
        }
      } else if (body.includes("x.com") || body.includes("twitter.com")) {
        reply2("Link do x/twitter detectado, enviarei o video.");
        try {
          const api = `${baseRaikken}/twitter?url=${encodeURIComponent(body)}&apikey=${RaikkenKey}`;
          const res = await axios.get(api);
          const data = res.data;
          if (!data.status)
            return reply(
              "❌ Não consegui processar o vídeo. Verifique o link.",
            );
          const { desc, HD } = data.resultado;
          await subaru.sendMessage(
            from,
            {
              video: { url: HD },
              caption: `🎬 *Twitter/X Downloader*\n\n📝 *Descrição:* ${desc}\n> ${Raikken}`,
              mimetype: "video/mp4",
            },
            { quoted: info },
          );
        } catch (err) {
          console.error(err);
          reply("❌ Erro ao acessar a API ou processar o link.");
        }
      } else if (body.includes("facebook.com") || body.includes("fb.watch")) {
        reply2("Link do facebook detectado, enviarei o video.");
        try {
          const urlapi = `${baseRaikken}/facebook?url=${encodeURIComponent(body)}&apikey=${RaikkenKey}`;
          const res = await axios.get(urlapi);
          const data = res.data;
          if (!data.status || !data.resultado || !data.resultado.status) {
            return reply(
              "❌ Não consegui processar esse vídeo. Link inválido ou protegido.",
            );
          }
          const { title, duration, thumbnail, links } = data.resultado;
          const linkHD = links.find((v) => v.quality.includes("720"))?.link;
          const linkSD = links.find((v) => v.quality.includes("360"))?.link;
          const finalLink = linkHD || linkSD;
          if (!finalLink) return reply("❌ Nenhum link de vídeo encontrado.");
          const buffer = await getBuffer(finalLink);
          await subaru.sendMessage(
            from,
            {
              video: buffer,
              mimetype: "video/mp4",
              caption: `🎬 *${title}*\n⏱ Duração: ${duration}\n> ${Raikken}`,
            },
            { quoted: info },
          );
        } catch (err) {
          console.error(err);
          reply("❌ Erro ao baixar ou enviar o vídeo. Tente novamente.");
        }
      }
    }
    //====================( FIM AUTODOWNLOAD )====================//

    //=====( ABAIXO AS FUNÇÕES DOS ANTIS )=====\\
    //Antilink
    if (isAntiLink) {
      try {
        const UrlLinks = ["https://", "wa.me", "http://"];
        for (let link of UrlLinks) {
          if (body.includes(link)) {
            if (info.key.fromMe) {
              return;
            }
            if (isGroupAdmins) {
              return;
            }
            enviarBan(`*Links não são permitidos aqui!*`);
            await subaru.sendMessage(from, {
              delete: {
                remoteJid: from,
                fromMe: false,
                id: info.key.id,
                participant: sender || senderLid,
              },
            });
            await subaru.groupParticipantsUpdate(
              from,
              [sender || senderLid],
              "remove",
            );
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
    //ANTI-IMAGEM
    if (isAntiImg && isBotGroupAdmins && isImage) {
      console.log("imagem");
      if (info.key.fromMe) {
        return;
      }
      if (isGroupAdmins) {
        return;
      }
      await enviarBan(`*Imagens não são permitidos aqui!*`);
      await subaru.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: info.key.id,
          participant: sender || senderLid,
        },
      });
      if (!JSON.stringify(groupMembers).includes(sender || senderLid)) return;
      await subaru.groupParticipantsUpdate(
        from,
        [sender || senderLid],
        "remove",
      );
    }
    //ANTI-CONTATO
    if (isAntiCtt && isBotGroupAdmins && isContact) {
      if (info.key.fromMe) {
        return;
      }
      if (isGroupAdmins) {
        return;
      }
      await enviarBan(`*Contatos não são permitidos aqui!*`);
      await subaru.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: info.key.id,
          participant: sender || senderLid,
        },
      });
      if (!JSON.stringify(groupMembers).includes(sender || senderLid)) return;
      await subaru.groupParticipantsUpdate(
        from,
        [sender || senderLid],
        "remove",
      );
    }
    //ANTI-STICKER
    if (isAntiSticker && isBotGroupAdmins && isSticker) {
      console.log("sticker");
      if (info.key.fromMe) {
        return;
      }
      if (isGroupAdmins) {
        return;
      }
      await enviarBan(`*Figurinhas não são permitidos aqui!*`);
      await subaru.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: info.key.id,
          participant: sender || senderLid,
        },
      });
      if (!JSON.stringify(groupMembers).includes(sender || senderLid)) return;
      await subaru.groupParticipantsUpdate(
        from,
        [sender || senderLid],
        "remove",
      );
    }
    //ANTI-LOCALIZAÇÃO
    if (isAntiLoc && isBotGroupAdmins && isLocation) {
      console.log("sticker");
      if (info.key.fromMe) {
        return;
      }
      if (isGroupAdmins) {
        return;
      }
      await enviarBan(`*Localização não são permitidos aqui!*`);
      await subaru.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: info.key.id,
          participant: sender || senderLid,
        },
      });
      if (!JSON.stringify(groupMembers).includes(sender || senderLid)) return;
      await subaru.groupParticipantsUpdate(
        from,
        [sender || senderLid],
        "remove",
      );
    }
    //ANTIDOC
    if (isAntiDoc && isBotGroupAdmins && isDocument) {
      console.log("doc");
      if (info.key.fromMe) {
        return;
      }
      if (isGroupAdmins) {
        return;
      }
      await enviarBan(`*Documentos não são permitidos aqui!*`);
      await subaru.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: info.key.id,
          participant: sender || senderLid,
        },
      });
      if (!JSON.stringify(groupMembers).includes(sender || senderLid)) return;
      await subaru.groupParticipantsUpdate(
        from,
        [sender || senderLid],
        "remove",
      );
      let isTrueFalse = Array(
        "play",
        "play2",
        "play3",
        "play4",
        "play5",
        "spotify",
        "playlist",
        "ytsearch",
        "ytmp4",
        "ytmp4-2",
        "ytmp3",
        "ytmp3-2",
        "tiktok",
        "tiktok2",
        "tiktokimg",
        "instamp3",
        "facebook",
        "facebook2",
        "twitter",
      ).some((item) => item === comando);
    }
    //ANTI-VIDEO
    if (isAntiVid && isBotGroupAdmins && isVideo) {
      console.log("vídeo");
      if (isGroupAdmins) {
        return;
      }
      await enviarBan(`*Vídeos não são permitidos aqui!*`);
      await subaru.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: info.key.id,
          participant: sender,
        },
      });
      if (!JSON.stringify(groupMembers).includes(sender || senderLid)) return;
      await subaru.groupParticipantsUpdate(
        from,
        [sender || senderLid],
        "remove",
      );
    }
    //ANTI-AUDIO
    if (isAntiAudio && isBotGroupAdmins && isAudio) {
      console.log("áudio");
      if (isGroupAdmins) {
        return;
      }
      await enviarBan(`*Áudios não são permitidos aqui!*`);
      await subaru.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: info.key.id,
          participant: sender || senderLid,
        },
      });
      if (!JSON.stringify(groupMembers).includes(sender || senderLid)) return;
      await subaru.groupParticipantsUpdate(
        from,
        [sender || senderLid],
        "remove",
      );
    }
  } // AQUI FECHA OS COMANDOS SEM PREFIXO.

  //=====( ABAIXO OS COMANDOS COM PREFIXO )=====\\
  const privateCmd = (id, pc, cmd, porcentagem) => {
    try {
      let notcmd = `┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞❌✿𖥔࣪ *Comando não encontrado!* ❌
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Digitado:* ${pc}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Você quis dizer:* ${cmd}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Semelhança:* ${porcentagem}%
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ Leia o 『 ${prefix}menu 』
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;
      return notcmd;
    } catch (e) {
      console.log(e);
    }
  };

  //=====( ABAIXO OS COMANDOS POR PLUGIN )=====\\
  if (!body.startsWith(prefix)) {
    return;
  }
  loadPlugins();
  const plugin = getPlugin(cmd);
  if (plugin) {
    try {
      await plugin.run({
        subaru,
        msg,
        args,
        from,
        sender,
        isGroup,
        pushname,
        reply,
        seloSz,
        react,
        isAdm,
        isDono,
        isGroupAdmins,
        isBotGroupAdmins,
        isQuotedAudio,
        isQuotedImage,
        isQuotedVideo,
        quoted,
        quotedType,
      });
    } catch (e) {
      console.error(`❌ Erro no plugin ${cmd}:`, e);
    }
    //=====( ABAIXO OS COMANDOS POR CASE )=====\\
  } else {
    try {
      switch (command) {
        //=====( ABAIXO OS COMANDOS DE MEMBRO \ MEMBROS )=====\\

        case "meulid":
          {
            await subaru.sendMessage(from, {
              text: `🔎 Debug do seu LID:\n
> - remoteJid: ${msg.key.remoteJid || "não veio"}
> - remoteLid: ${msg.key.remoteLid || "não veio"}
> - participant: ${msg.key.participant || "não veio"}
> - participantLid: ${msg.key.participantLid || "não veio"}
> - lid do mencionado: ${alvo || "não veio"}
> - senderJid ${senderJid || "não veio"}
> - senderLid: ${senderLid || "não veio"}`,
            });
          }
          break;

        case "menu": {
          await react("♥️");
          const data = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY");
          const hora = moment().tz("America/Sao_Paulo").format("HH:mm:ss");
          const formatarTempo = (segundos) => {
            const h = Math.floor(segundos / 3600)
              .toString()
              .padStart(2, "0");
            const m = Math.floor((segundos % 3600) / 60)
              .toString()
              .padStart(2, "0");
            const s = Math.floor(segundos % 60)
              .toString()
              .padStart(2, "0");
            return `${h}:${m}:${s}`;
          };

          const {
            escolherPersonalidadeSubaru,
          } = require("./dono/functions.js");
          const tempoAtivo = formatarTempo(process.uptime());
          const persona = escolherPersonalidadeSubaru(
            pushname,
            data,
            hora,
            tempoAtivo,
          );
          const videoAleaSz = escolherVideoPorRota(persona.nome);

          try {
            let videoHeader = null;
            if (videoAleaSz && fs.existsSync(videoAleaSz)) {
              const videoBuffer = fs.readFileSync(videoAleaSz);
              videoHeader = await prepareWAMessageMedia(
                { video: videoBuffer, gifPlayback: true },
                { upload: subaru.waUploadToServer },
              );
            }

            const interactiveMessage = {
              header: videoHeader
                ? {
                    ...videoHeader,
                    hasMediaAttachment: true,
                    title: "",
                  }
                : undefined,
              body: {
                text: persona.menuStyle,
              },
              footer: { text: botName },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                      title: "𝐌𝐄𝐍𝐔 𝐆𝐄𝐑𝐀𝐋",
                      sections: [
                        {
                          title: "𝐌𝐄𝐍𝐔",
                          rows: [
                            {
                              title: "𝐌𝐄𝐍𝐔",
                              description: "Comandos principais para membros.",
                              id: `${prefix}menus`,
                            },
                          ],
                        },
                        {
                          rows: [
                            {
                              title: "𝐌𝐄𝐍𝐔 𝐁𝐑𝐈𝐍𝐊𝐒",
                              description: "Brincadeiras e jogos.",
                              id: `${prefix}menubn`,
                            },
                          ],
                        },
                        {
                          rows: [
                            {
                              title: "𝐌𝐄𝐍𝐔 𝐀𝐃𝐌",
                              description: "Comandos de administração.",
                              id: `${prefix}menuadm`,
                            },
                          ],
                        },
                        {
                          rows: [
                            {
                              title: "𝐌𝐄𝐍𝐔 𝐆𝐄𝐑𝐀𝐋",
                              description: "Todos os comandos do bot.",
                              id: `${prefix}menugeral`,
                            },
                          ],
                        },
                        {
                          rows: [
                            {
                              title: "𝐂𝐑𝐈𝐀𝐃𝐎𝐑",
                              description: `Contato do criador da ${botName}`,
                              id: `${prefix}criador`,
                            },
                          ],
                        },
                      ],
                    }),
                  },
                ],
                messageParamsJson: "",
              },
            };

            const content = { interactiveMessage };
            await sendInteractiveMessage(subaru, from, content, {
              additionalAttributes: {},
              useCachedGroupMetadata: true,
            });
          } catch (error) {
            console.error("Erro ao enviar menu:", error);
            await reply(`❌ Erro inesperado ao criar menu: ${error.message}`);
          }
          break;
        }

        case "menugeral":
          {
            await react("🌙");
            if (!isGroup) return enviar(mss.grupo);
            const data = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY");
            const hora = moment().tz("America/Sao_Paulo").format("HH:mm:ss");
            try {
              await subaru.sendMessage(
                from,
                {
                  image: { url: menuimg },
                  caption: menugeral(data, hora, prefix, donoName),
                },
                { quoted: seloSz },
              );
            } catch (e) {
              reply(`*_${e.message}_*`);
            }
          }
          break;

        case "menus":
          {
            await react("🌙");
            if (!isGroup) return enviar(mss.grupo);
            const data = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY");
            const hora = moment().tz("America/Sao_Paulo").format("HH:mm:ss");
            try {
              await subaru.sendMessage(
                from,
                {
                  image: { url: menuimg },
                  caption: menumembros(data, hora, prefix, donoName),
                },
                { quoted: seloSz },
              );
            } catch (e) {
              reply(`*_${e.message}_*`);
            }
          }
          break;

        case "menuadm":
          {
            await react("🌙");
            if (!isGroup) return enviar(mss.grupo);
            if (!isGroupAdmins && !isDono) return enviar(mss.adm);
            const data = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY");
            const hora = moment().tz("America/Sao_Paulo").format("HH:mm:ss");
            try {
              await subaru.sendMessage(
                from,
                {
                  image: { url: menuimg },
                  caption: menuAdm(data, hora, prefix, donoName),
                },
                { quoted: seloSz },
              );
            } catch (e) {
              reply(`*_${e.message}_*`);
            }
          }
          break;

        case "menubn":
          {
            await react("🌙");
            if (!isGroup) return enviar(mss.grupo);
            const data = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY");
            const hora = moment().tz("America/Sao_Paulo").format("HH:mm:ss");
            try {
              await subaru.sendMessage(
                from,
                {
                  image: { url: menuimg },
                  caption: menubn(data, hora, prefix, donoName),
                },
                { quoted: seloSz },
              );
            } catch (e) {
              reply(`*_${e.message}_*`);
            }
          }
          break;

        case "criador":
          await subaru.sendMessage(
            from,
            {
              image: { url: "https://i.postimg.cc/J0jC8w1f/perfil.jpg" },
              caption: `┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *〽️ MEU DONO*〽️
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Nick:* ${donoName}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Número:* wa.me/${donoNmr}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Prefixo:* 「${prefix}」
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`,
            },
            { quoted: seloSz },
          );
          break;

        case "subaru":
          {
            const {
              escolherPersonalidadeSubaru,
            } = require("./dono/functions.js");
            const persona = escolherPersonalidadeSubaru();
            if (!q) {
              return reply("Diga o que quer perguntar.");
            }
            react("🫟");
            try {
              const personality = `${persona.prompt}`;
              const fullPrompt = `${personality}, agora responda: ${q}`;
              const res = await axios.get(
                `${baseRaikken}/ia/gemini?prompt=${encodeURIComponent(fullPrompt)}&apikey=${RaikkenKey}`,
              );
              if (!res.data || !res.data.resultado) {
                return reply("❌ Não consegui obter resposta do subaru.");
              }
              console.log(res);
              const resposta = res.data.resultado.trim();
              return reply(`${resposta}`);
            } catch (err) {
              console.error("Erro ao chamar:", err);
              return reply("❌ Ocorreu um erro ao se comunicar com o Subaru.");
            }
          }
          break;

        case "sticker":
        case "s":
          {
            var RSM =
              info.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            var boij2 =
              RSM?.imageMessage ||
              info.message?.imageMessage ||
              RSM?.viewOnceMessageV2?.message?.imageMessage ||
              info.message?.viewOnceMessageV2?.message?.imageMessage ||
              info.message?.viewOnceMessage?.message?.imageMessage ||
              RSM?.viewOnceMessage?.message?.imageMessage;
            var boij =
              RSM?.videoMessage ||
              info.message?.videoMessage ||
              RSM?.viewOnceMessageV2?.message?.videoMessage ||
              info.message?.viewOnceMessageV2?.message?.videoMessage ||
              info.message?.viewOnceMessage?.message?.videoMessage ||
              RSM?.viewOnceMessage?.message?.videoMessage;
            let packin;
            let author23;
            let owgi;
            if (`${sender.split("@")[0]}` === donoNmr) {
              packin = q ? q?.split("/")[0] : botName;
              author23 = q
                ? q?.split("/")[1]
                : q?.split("/")[0]
                  ? ""
                  : `♥️ ${donoName}`;
            } else {
              packin = q
                ? q?.split("/")[0]
                : ` ⃟𝙱𝚘𝚝: ${botName}\n🤖⃟ 𝙽𝚞𝚖𝚎𝚛𝚘 𝚋𝚘𝚝: ${numeroBot.split("@")[0]}`;
              author23 = q
                ? q?.split("/")[1]
                : q?.split("/")[0]
                  ? ""
                  : `\n\n👤⃟𝙿𝚎𝚍𝚒𝚍𝚘 𝚙𝚘𝚛: ${pushname}\n👑⃟𝙲𝚛𝚒𝚊𝚍𝚘𝚛: Sz Psico`;
            }
            if (boij2) {
              react("💭");
              enviar("Hum.... espere um minutinho ai 😚");
              owgi = await getFileBuffer(boij2, "image");
              let encmediaa = await sendImageAsSticker2(
                subaru,
                from,
                owgi,
                info,
                { packname: packin, author: author23 },
              );
              await DLT_FL(encmediaa);
            } else if (boij && boij.seconds < 11) {
              owgi = await getFileBuffer(boij, "video");
              let encmedia = await sendVideoAsSticker2(
                subaru,
                from,
                owgi,
                info,
                { packname: packin, author: author23 },
              );
              await DLT_FL(encmedia);
              react(emoji);
            } else {
              return reply(
                `Marque uma foto ou o vídeo(menor que 10s) para fazer sua figurinha com o comando: ${prefix + comando}`,
              );
            }
          }
          break;
          
        /* ====( AQUI AINDA SÃO CMDS DE MEMBROS, MAS APENAS BRINCADEIRAS )==== */
        case "jogodavelha": {
          if (!isGroup) return reply("Só grupos!");
          if (!alvo)
            return reply(
              "Marque junto com o comando, o @ do usuário que deseja desafiar.",
            );
          const normalizeJid = (jid) =>
            jid ? jid.replace(/(@s\.whatsapp\.net|@lid)/g, "") : jid;
          if (JOGO_D_V != false) {
            const boardnow = setGame(`${from}`);
            const matrix = boardnow._matrix;
            const chatMove = `*🎮Ꮐ̸Ꭺ̸Ꮇ̸Ꭼ̸ Ꭰ̸Ꭺ̸ Ꮩ̸Ꭼ̸Ꮮ̸Ꮋ̸Ꭺ̸🕹️*

[❗] Alguém está jogando no momento...

❌ : @${boardnow.X.split("@")[0]}
⭕ : @${boardnow.O.split("@")[0]}

Sua vez : @${boardnow.turn == "X" ? boardnow.X.split("@")[0] : boardnow.O.split("@")[0]}

${matrix[0][0]}${matrix[0][1]}${matrix[0][2]}
${matrix[1][0]}${matrix[1][1]}${matrix[1][2]}
${matrix[2][0]}${matrix[2][1]}${matrix[2][2]}

caso queira resetar o jogo, mande um adm ou os jogadores que estão jogando utilizar o comando ${prefix}rv
`;
            await subaru.sendMessage(from, {
              text: chatMove,
              mentions: [
                boardnow.X,
                boardnow.O,
                boardnow.turn == "X" ? boardnow.X : boardnow.O,
              ],
            });
            return;
          }
          if (q.length === 1)
            return reply(
              `*⟅❗⟆ Jogue com Alguém!*\n*Para iniciar a partida:* ${prefix + command} @membro`,
            );
          const boardnow = setGame(`${from}`);
          boardnow.status = false;
          boardnow.X = sender;
          const alvoJid = alvo.includes("@") ? alvo : alvo + "@lid";
          boardnow.O = alvoJid;

          const blabord = [boardnow.X, boardnow.O];
          fs.writeFileSync(
            `./database/tictactoe/db/${from}.json`,
            JSON.stringify(boardnow, null, 2),
          );
          const strChat = `*『📌ᎬՏᏢᎬᎡᎪΝᎠϴ ϴ ϴᏢϴΝᎬΝͲᎬ⚔️』*

@${boardnow.X.split("@")[0]} está te desafiando para uma partida de jogo da velha!
_[ @${boardnow.O.split("@")[0]} ] Use *『S』* para aceitar ou *『N』* para recusar..._

Em caso de problemas, marque um administrador para resetar o jogo com o comando ${prefix}rv`;
          await subaru.sendMessage(from, {
            text: strChat,
            mentions: [boardnow.X, boardnow.O],
          });
          break;
        }

        case "resetarvelha":
        case "rv":
          if (
            !sender.includes(JOGO_D_V?.X) &&
            !sender.includes(JOGO_D_V?.O) &&
            !isGroupAdmins
          )
            return reply(`Fale com algum dos jogadores que jogaram ou espere eles terminar para
você jogar, se não tiver nenhum dos 2 online, fale com algum adm para digitar ${prefix}rv para resetar o jogo.`);
          if (fs.existsSync("./database/tictactoe/db/" + from + ".json")) {
            DLT_FL("./database/tictactoe/db/" + from + ".json");
            reply(`Jogo da velha resetado com sucesso nesse grupo!`);
          } else {
            reply(`Não a nenhuma sessão em andamento...`);
          }
          break;

        //===========[ FIM JOGOS/BRINCADEIRAS/RANKS=========\\

        //=====( ABAIXO OS COMANDOS DE DONO )=====\\
        case "reiniciar": {
          if (!isDono) return enviar(mss.dono);
          console.log("Reiniciando sistema.....");
          await enviar(`🔄 Reiniciando o sistema...`);
          await esperar(1000);
          await process.exit(0);
          break;
        }

        case "checarversao": {
          if (!isDono) {
            return reply2(mss.dono);
          }
          await checarVersao(reply2, subaru, from);
          break;
        }

        case "atualizar": {
          if (!isDono) {
            return reply2(mss.dono);
          }
          try {
            await atualizarBot(subaru, seloSz, from);
          } catch (e) {
            reply2(`${e.message}`);
          }
          break;
        }

        case "nao-atualizar": {
          if (!isDono) {
            return reply2(mss.dono);
          }
          await reply(
            "Poxa, que pena que não quer atualizar, mas tudo bem! Qualquer coisa, só usar o comando de novo ou simplesmente ir no diretório: https://github.com/andy-botkkj/Subaru-Base",
          );
          break;
        }

        case "setconfig":
          {
            if (!isDono) return reply(mss.dono);
            if (isGroup)
              return reply("❌ Esse comando só pode ser usado no PV do bot.");
            const configPath = "./dono/configs/settings.json";
            let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            const settingsMap = [
              "prefix",
              "botName",
              "botNumber",
              "donoName",
              "donoNmr",
              "donoLid",
              "idCanal",
            ];

            const [key, ...valueArr] = q.split(" ");
            if (!key || !valueArr.length) {
              return reply(
                `⚠️ Formato errado!\n\nExemplo:\n${prefix}setconfig prefix !\n\nChaves disponíveis:\n${settingsMap.join(", ")}`,
              );
            }
            const settingKey = key.trim();
            const newValue = valueArr.join(" ");
            if (!settingsMap.includes(settingKey)) {
              return reply(
                `❌ Chave *${settingKey}* não existe!\nChaves válidas: ${settingsMap.join(", ")}`,
              );
            }
            config[settingKey] = newValue;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            reply(
              `✔️ Configuração *${settingKey}* alterada para:\n${newValue}`,
            );
          }
          break;

        case "backup": {
          if (!isDono) return reply(mss.dono);
          const { execSync } = require("child_process");
          const ls = (await execSync("ls"))
            .toString()
            .split("\n")
            .filter(
              (pe) =>
                pe != "node_modules" &&
                pe != "package-lock.json" &&
                pe != "yarn.lock" &&
                pe != "tmp" &&
                pe != "",
            );
          const exec = await execSync(
            `zip -r subaru-backup.zip ${ls.join(" ")}`,
          );
          await reply(
            "Aguarde, estarei fazendo o backup e enviando no PV do dono",
          );
          await subaru.sendMessage(
            `${donoNmr}@s.whatsapp.net`,
            {
              document: await fs.readFileSync("./subaru-backup.zip"),
              mimetype: "application/zip",
              fileName: "subaru-backup.zip",
            },
            { quoted: seloSz },
          );
          await execSync("rm -rf subaru-backup.zip");
          await reply(
            `Prontinho ${donoName}, fiz o backup e enviei no seu pv.`,
          );
          break;
        }

        case "help": {
          await react("⚡");
          const fs = require("fs");
          const helpText = require("./database/textos/helpText.json");
          const rows = helpText.map((item) => ({
            title: item.nomeAjuda.toUpperCase(),
            description: `Ajuda sobre ${item.nomeAjuda}`,
            id: `${prefix}${item.nomeAjuda}`,
          }));

          const imageBuffer = fs.readFileSync("./database/imgs/perfil.jpeg");
          const imageMedia = await prepareWAMessageMedia(
            { image: imageBuffer },
            { upload: finn.waUploadToServer },
          );

          const interactiveMessage = {
            header: {
              ...imageMedia,
              hasMediaAttachment: true,
              title: "📖 Central de Ajuda",
            },
            body: {
              text: `👋 Olá ${pushname}!\nEscolha abaixo o que você precisa de ajuda:`,
            },
            footer: {
              text: botName,
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: JSON.stringify({
                    title: "AJUDA DISPONÍVEL",
                    sections: [
                      {
                        title: "Central de Ajuda",
                        rows: rows,
                      },
                    ],
                  }),
                },
              ],
              messageParamsJson: "",
            },
          };

          await sendInteractiveMessage(
            finn,
            from,
            { interactiveMessage },
            {
              additionalAttributes: {},
              useCachedGroupMetadata: true,
            },
          );
          break;
        }

        case "totalcmd":
          if (!isDono) {
            return reply("Somente dono.");
          }
          try {
            const fileContent = fs.readFileSync("index.js", "utf-8");
            const caseNames =
              fileContent.match(/case\s+['"]([^'"]+)['"]/g) || [];
            const cont = caseNames.length;
            subaru.sendMessage(
              from,
              {
                text: `Atualmente, existem ${cont} comandos registrados no ${botName}`,
              },
              { quoted: seloSz },
            );
          } catch (e) {
            console.error("Erro ao obter o total de comandos:", e);
            reply(`Deu erro, se liga:\n *_${e.message}_*`);
          }
          break;

        case "infosbot":
        case "dados": {
          if (!isDono) {
            return reply("Somente dono");
          }
          if (!isGroup) return enviar(mss.grupo);
          const gpzin = await getGroupMetadataSafe(from);
          const uptime = process.uptime();
          const hours = Math.floor(uptime / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);
          const seconds = Math.floor(uptime % 60);
          let latency = Date.now() / 1000 - info.messageTimestamp;
          let threads = os.cpus().length;
          let infoSystem = {
            ostype: os.type(),
            osRelease: os.release(),
            totalMemory: (os.totalmem() / Math.pow(1024, 3)).toFixed(2),
            freeMemory: (os.freemem() / Math.pow(1024, 3)).toFixed(1),
          };

          let performance = (
            (infoSystem.freeMemory / infoSystem.totalMemory) *
            100
          ).toFixed(2);
          let hospedagem = process.env.HOSTED ? "Sim" : "Não";
          let totalGrupos = Object.keys(
            await subaru.groupFetchAllParticipating(),
          ).length;
          let textPing = `┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞📡✿ິ̸𖥔࣪ *Versão:* 1.0
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🤖✿ິ̸𖥔࣪ *Nome:* ${botName}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞👻✿ິ̸𖥔࣪ *Usuário:* @${sender.split("@")[0]}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞⚡✿ິ̸𖥔࣪ *Velocidade:* ${latency.toFixed(3)} ms
┃࣪ ┃֪ׅ࣪ׄ᨞⁞⏳✿ິ̸𖥔࣪ *Uptime:* ${uptime}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🏡✿ິ̸𖥔࣪ *Grupo:* ${from}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🖥️✿ິ̸𖥔࣪ *SO:* ${infoSystem.ostype}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🔢✿ິ̸𖥔࣪ *Versão SO:* ${infoSystem.osRelease}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💾✿ິ̸𖥔࣪ *RAM Total:* ${infoSystem.totalMemory} GB
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🚀✿ິ̸𖥔࣪ *RAM Livre:* ${infoSystem.freeMemory} GB
┃࣪ ┃֪ׅ࣪ׄ᨞⁞📊✿ິ̸𖥔࣪ *Desempenho:* ${performance}%
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🛠️✿ິ̸𖥔࣪ *Threads:* ${threads}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞☁️✿ິ̸𖥔࣪ *Hospedado:* ${hospedagem}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🔗✿ິ̸𖥔࣪ *Plataforma:* ${process.platform}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🔢✿ິ̸𖥔࣪ *Grupos ativos:* ${totalGrupos}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞👨‍💻✿ິ̸𖥔࣪ *Criador:* 5512997025014
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;

          const pingImageUrl = `${baseRaikken}/api/canvas/ping?ping=${String(latency.toFixed(3))}&texto=${botName}&avatar=https://i.postimg.cc/J0jC8w1f/perfil.jpgg&fundo=https://i.postimg.cc/fbBCDL1Q/images-11.jpg`;

          await subaru.sendMessage(
            from,
            {
              image: { url: pingImageUrl },
              caption: `${textPing}`,
              mentions: [sender],
            },
            { quoted: selogpt },
          );
          await react("🏓");
          break;
        }

        case "banchat":
          if (!isGroup) return reply(mss.grupo);
          if (!isDono) return reply("Somente dono");
          if (q.length < 1)
            return enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          if (Number(q[0]) === 1) {
            if (isBanchat)
              return enviar("_O Bot já está desativado do chat, senhor._");
            ArquivosDosGrupos[0].banchat = true;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              `*_O bot foi desativo desse grupo. Apenas o ${donoNmr} pode desbanir._*.`,
            );
          } else if (Number(q[0]) === 0) {
            if (!isBanchat) return enviar("O Bot tá online!");
            ArquivosDosGrupos[0].banchat = false;
            ModificaGrupo(ArquivosDosGrupos);
            enviar("*_O bot foi ativado com sucesso nesse grupo!!_*");
          } else {
            enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          }
          break;

        case "delcase":
          {
            if (!isDono) {
              return reply("Somente dono.");
            }
            if (!q) return reply("*Diga qual a case que cou deletar.*");
            dellCase("./index.js", q);
            reply("*Case deletada com sucesso.*");
          }
          break;

        case "reiniciar":
        case "rr":
          if (!isDono && !info.key.fromMe) return enviar("Somente dono!");
          await enviar(`Reiniciando o sistema...`);
          await esperar(1000);
          await setTimeout(() => {
            process.exit(0);
          }, 1000);
          break;

        //=====( ABAIXO OS COMANDOS DE ADM )=====\\
        case "ativar": {
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);

          await react("⚙️");

          const funcoes = [
            {
              nome: "Boas-Vindas",
              status: isBemVindo,
              id: `${prefix}bemvindo`,
            },
            { nome: "Anti-Link", status: isAntiLink, id: `${prefix}antilink` },
            { nome: "Anti-Imagem", status: isAntiImg, id: `${prefix}antiimg` },
            { nome: "Anti-Vídeo", status: isAntiVid, id: `${prefix}antivideo` },
            {
              nome: "Anti-Áudio",
              status: isAntiAudio,
              id: `${prefix}antiaudio`,
            },
            {
              nome: "Anti-Figurinha",
              status: isAntiSticker,
              id: `${prefix}antisticker`,
            },
            {
              nome: "Anti-Documento",
              status: isAntiDoc,
              id: `${prefix}antidoc`,
            },
            { nome: "Anti-Contato", status: isAntiCtt, id: `${prefix}antictt` },
            {
              nome: "Anti-Localização",
              status: isAntiLoc,
              id: `${prefix}antiloc`,
            },
            {
              nome: "Modo Brincadeiras",
              status: isModobn,
              id: `${prefix}modobn`,
            },
            { nome: "Simsimi (IA)", status: isSimih, id: `${prefix}simih` },
            {
              nome: "Auto Download",
              status: isAutoDown,
              id: `${prefix}autodl`,
            },
            {
              name: "Auto sticker",
              status: isAutoSticker,
              id: `${prefix}autosticker`,
            },
          ];

          const rows = funcoes.map((func) => ({
            title: `${func.nome}: ${func.status ? "✅ Ativado" : "❌ Desativado"}`,
            description: `Use ${func.id} 1 (ativar) ou 0 (desativar)`,
            id: `${func.id} ${func.status ? "0" : "1"}`,
          }));
          const interactiveContent = {
            title: `⚙️ PAINEL DE CONTROLE - ${groupName}`,
            text: `Olá ${pushname}! 👋\n\nAqui você pode ativar ou desativar as funções do bot para este grupo. Clique em uma opção para alternar o estado dela (ativar/desativar).`,
            footer: `© ${botName}`,
            interactiveButtons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "🔧 FUNÇÕES DO GRUPO",
                  sections: [
                    {
                      title: "Clique para ativar ou desativar",
                      rows: rows,
                    },
                  ],
                }),
              },
            ],
          };

          try {
            await sendInteractiveMessage(subaru, from, interactiveContent, {
              additionalAttributes: {},
              useCachedGroupMetadata: true,
            });
          } catch (error) {
            console.error("Erro ao enviar mensagem interativa:", error);
            let textMessage = `⚙️ PAINEL DE CONTROLE - ${groupName}\n\n`;
            textMessage += `Olá ${pushname}! 👋\n\n`;
            textMessage +=
              "Aqui você pode ativar ou desativar as funções do bot para este grupo:\n\n";

            funcoes.forEach((func) => {
              textMessage += `• ${func.nome}: ${func.status ? "✅ Ativado" : "❌ Desativado"}\n`;
              textMessage += `Use: ${func.id} 1 (ativar) ou 0 (desativar)\n\n`;
            });
            textMessage += `\n© ${botName}`;
            await reply(textMessage);
          }

          break;
        }

        case "ban": {
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          try {
            if (!alvo) {
              return enviar(
                "Você precisa mencionar um usuário (@user) ou responder à mensagem dele para banir.",
              );
            }
            if (!JSON.stringify(groupMembers).includes(alvo)) {
              return enviar(
                "Este usuário não está no grupo ou já foi removido.",
              );
            }
            const getCleanId = (jid) => (jid ? jid.split("@")[0] : "");
            if (getCleanId(alvo) === getCleanId(numeroBot)) {
              return enviar("Eu não vou me banir, kk.");
            }
            if (
              getCleanId(alvo) === getCleanId(donoNmr) ||
              getCleanId(alvo) === getCleanId(donoLid)
            ) {
              return enviar("*Acha mesmo que eu vou banir meu criador?*");
            }
            await subaru.groupParticipantsUpdate(from, [alvo], "remove");
            await sleep(300);
            await subaru.sendMessage(from, {
              text: `*Prontinho, membro removido!*`,
              mentions: [sender],
            });
          } catch (e) {
            console.log(e);
            reply("Ocorreu um erro ao tentar banir o usuário.");
          }
          break;
        }

        case "modobn":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (q.length < 1)
            return enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          if (Number(q[0]) === 1) {
            if (isModobn) return enviar("_Isso já está ativo, senhor._");
            ArquivosDosGrupos[0].modobn = true;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de brincadeiras foi ativada com sucesso nesse grupo 😋_*.",
            );
          } else if (Number(q[0]) === 0) {
            if (!isModobn) return enviar("Isso já ta off 😪");
            ArquivosDosGrupos[0].modobn = false;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de brincadeiras foi desativada com sucesso nesse grupo 😋_*",
            );
          } else {
            enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          }
          break;

        case "autosticker":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (q.length < 1)
            return enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          if (Number(q[0]) === 1) {
            if (isAutoSticker) return enviar("_Isso já está ativo, senhor._");
            ArquivosDosGrupos[0].autosticker = true;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de auto sticker foi ativada com sucesso nesse grupo 😋_*.",
            );
          } else if (Number(q[0]) === 0) {
            if (!isAutoSticker) return enviar("Isso já ta off 😪");
            ArquivosDosGrupos[0].autosticker = false;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de auto sticker foi desativada com sucesso nesse grupo 😋_*",
            );
          } else {
            enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          }
          break;

        case "autodl":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (q.length < 1)
            return enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          if (Number(q[0]) === 1) {
            if (isAutoDown) return enviar("_Isso já está ativo, senhor._");
            ArquivosDosGrupos[0].autodown = true;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de auto download foi ativada com sucesso nesse grupo 😋_*.",
            );
          } else if (Number(q[0]) === 0) {
            if (!isAutoDown) return enviar("Isso já ta off 😪");
            ArquivosDosGrupos[0].autodown = false;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de auto download foi desativada com sucesso nesse grupo 😋_*",
            );
          } else {
            enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          }
          break;

        case "simih":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (q.length < 1)
            return enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          if (Number(q[0]) === 1) {
            if (isSimih) return enviar("_Isso já está ativo, senhor._");
            ArquivosDosGrupos[0].simih = true;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de Simih foi ativada com sucesso nesse grupo 😋_*.",
            );
          } else if (Number(q[0]) === 0) {
            if (!isSimih) return enviar("Isso já ta off 😪");
            ArquivosDosGrupos[0].simih = false;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de Simih foi desativada com sucesso nesse grupo 😋_*",
            );
          } else {
            enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          }
          break;

        case "antilink":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (q.length < 1)
            return enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          if (Number(q[0]) === 1) {
            if (isAntiLink) return enviar("_Isso já está ativo, senhor._");
            ArquivosDosGrupos[0].antilink = true;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de antilink foi ativada com sucesso nesse grupo 😋_*.",
            );
          } else if (Number(q[0]) === 0) {
            if (!isAntiLink) return enviar("Isso já ta off 😪");
            ArquivosDosGrupos[0].antilink = false;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de antilink foi desativada com sucesso nesse grupo 😋_*",
            );
          } else {
            enviar(`${prefix + cmd} 1 para ativar, 0 para desativar.`);
          }
          break;

        case "antiimg":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (args.length < 1)
            return reply(
              `Use 1 pra ativar ou 0 pra desativar. Caso deseja ativar, use essa forma: ${prefix + comando} 1, caso seja desativar e só trocar o 1 pelo 0.`,
            );
          if (Number(args[0]) === 1) {
            if (isAntiImg)
              return reply("O recurso de anti imagem já está ativado.");
            ArquivosDosGrupos[0].antiimg = true;
            setGp(ArquivosDosGrupos);
            reply("Ativou com sucesso o recurso de anti imagem neste grupo.️");
          } else if (Number(args[0]) === 0) {
            if (!isAntiImg)
              return reply("O recurso de anti imagem já está desativado.");
            ArquivosDosGrupos[0].antiimg = false;
            setGp(ArquivosDosGrupos);
            reply(
              "Desativou com sucesso o recurso de anti imagem neste grupo.",
            );
          } else {
            reply("1 para ativar, 0 para desativar.");
          }
          break;

        case "antivideo":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (args.length < 1)
            return reply(
              `Use 1 pra ativar ou 0 pra desativar. Caso deseja ativar, use essa forma: ${prefix + comando} 1, caso seja desativar e só trocar o 1 pelo 0.`,
            );
          if (Number(args[0]) === 1) {
            if (isAntiVid)
              return reply("O recurso de anti vídeo já está ativado.");
            ArquivosDosGrupos[0].antivideo = true;
            setGp(ArquivosDosGrupos);
            reply("Ativou com sucesso o recurso de anti video neste grupo.");
          } else if (Number(args[0]) === 0) {
            if (!isAntiVid)
              return reply("O recurso de anti vídeo já está desativado.");
            ArquivosDosGrupos[0].antivideo = false;
            setGp(ArquivosDosGrupos);
            reply("Desativou com sucesso o recurso de anti video neste grupo.");
          } else {
            reply("1 para ativar, 0 para desativar");
          }
          break;

        case "antiaudio":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (args.length < 1)
            return reply(
              `Use 1 pra ativar ou 0 pra desativar. Caso deseja ativar, use essa forma: ${prefix + comando} 1, caso seja desativar e só trocar o 1 pelo 0.`,
            );
          if (Number(args[0]) === 1) {
            if (isAntiAudio)
              return reply("O recurso de anti áudio já está ativado.");
            ArquivosDosGrupos[0].antiaudio = true;
            setGp(ArquivosDosGrupos);
            reply("Ativou com sucesso o recurso de anti audio neste grupo.");
          } else if (Number(args[0]) === 0) {
            if (!isAntiAudio)
              return reply("O recurso de anti áudio já está desativado.");
            ArquivosDosGrupos[0].antiaudio = false;
            setGp(ArquivosDosGrupos);
            reply("Desativou com sucesso o recurso de anti audio neste grupo.");
          } else {
            reply("1 para ativar, 0 para desativar");
          }
          break;

        case "antisticker":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (args.length < 1)
            return reply(
              `Use 1 pra ativar ou 0 pra desativar. Caso deseja ativar, use essa forma: ${prefix + comando} 1, caso seja desativar e só trocar o 1 pelo 0.`,
            );
          if (Number(args[0]) === 1) {
            if (isAntiSticker)
              return reply("O recurso de anti sticker já está ativado.");
            ArquivosDosGrupos[0].antisticker = true;
            setGp(ArquivosDosGrupos);
            reply("Ativou com sucesso o recurso de anti sticker neste grupo.");
          } else if (Number(args[0]) === 0) {
            if (!isAntiSticker)
              return reply("O recurso de anti sticker já está desativado.");
            ArquivosDosGrupos[0].antisticker = false;
            setGp(ArquivosDosGrupos);
            reply(
              "Desativou com sucesso o recurso de anti sticker neste grupo.",
            );
          } else {
            reply("1 para ativar, 0 para desativar.");
          }
          break;

        case "antidocumento":
        case "antidoc":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (args.length < 1)
            return reply(
              `Use 1 pra ativar ou 0 pra desativar. Caso deseja ativar, use essa forma: ${prefix + comando} 1, caso seja desativar e só trocar o 1 pelo 0.`,
            );
          if (Number(args[0]) === 1) {
            if (isAntiDoc)
              return reply("O recurso de anti documento já está ativado.");
            ArquivosDosGrupos[0].antidoc = true;
            setGp(ArquivosDosGrupos);
            reply(
              "Ativou com sucesso o recurso de anti documento neste grupo.",
            );
          } else if (Number(args[0]) === 0) {
            if (!isAntiDoc)
              return reply("O recurso de anti documento já está desativado.");
            ArquivosDosGrupos[0].antidoc = false;
            setGp(ArquivosDosGrupos);
            reply(
              "Desativou com sucesso o recurso de anti documento neste grupo.",
            );
          } else {
            reply("1 para ativar, 0 para desativar");
          }
          break;

        case "antictt":
        case "anticontato":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (args.length < 1)
            return reply(
              `Use 1 pra ativar ou 0 pra desativar. Caso deseja ativar, use essa forma: ${prefix + comando} 1, caso seja desativar e só trocar o 1 pelo 0.`,
            );
          if (Number(args[0]) === 1) {
            if (isAntiCtt)
              return reply("O recurso de anti contato já está ativado.");
            ArquivosDosGrupos[0].antictt = true;
            setGp(ArquivosDosGrupos);
            reply("Ativou com sucesso o recurso de anti contato neste grupo.");
          } else if (Number(args[0]) === 0) {
            if (!isAntiCtt)
              return reply("O recurso de anti contato já está desativado.");
            ArquivosDosGrupos[0].antictt = false;
            setGp(ArquivosDosGrupos);
            reply(
              "️Desativou com sucesso o recurso de anticontato neste grupo.️",
            );
          } else {
            reply("1 para ativar, 0 para desativar");
          }
          break;

        case "antilocalizacao":
        case "antiloc":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (args.length < 1)
            return reply(
              `Use 1 pra ativar ou 0 pra desativar. Caso deseja ativar, use essa forma: ${prefix + comando} 1, caso seja desativar e só trocar o 1 pelo 0.`,
            );
          if (Number(args[0]) === 1) {
            if (isAntiLoc)
              return reply("O recurso de anti loc já está ativado.");
            ArquivosDosGrupos[0].antiloc = true;
            setGp(ArquivosDosGrupos);
            reply("Ativou com sucesso o recurso de anti loc neste grupo.");
          } else if (Number(args[0]) === 0) {
            if (!isAntiLoc)
              return reply("O recurso de anti loc já está desativado.");
            ArquivosDosGrupos[0].antiloc = false;
            setGp(ArquivosDosGrupos);
            reply("Desativou com sucesso o recurso de anti loc neste grupo.");
          } else {
            reply("1 para ativar, 0 para desativar");
          }
          break;

        case "bemvindo":
        case "welcome": {
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (q.length < 1)
            return enviar(
              `${prefix + comando} 1 para ativar, 0 para desativar.`,
            );
          if (Number(q) === 1) {
            if (isBemVindo) return enviar("Essa função já está ativada");
            ArquivosDosGrupos[0].bemVindo[0].ativo = true;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de bem vindo foi ativada com sucesso nesse grupo 😋_*",
            );
          } else if (Number(q) === 0) {
            if (!isBemVindo) return enviar("Essa função já está desativada");
            ArquivosDosGrupos[0].bemVindo[0].ativo = false;
            ModificaGrupo(ArquivosDosGrupos);
            enviar(
              "*_A função de bem vindo foi desativada com sucesso nesse grupo 😋_*",
            );
          } else {
            enviar(`_*${prefix + comando} 1 para ativar, 0 para desativar.*_`);
          }
          break;
        }

        case "legendabv":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (!q) return enviar("Digite a legenda.");
          if (isBemVindo) {
            ArquivosDosGrupos[0].bemVindo[0].entrou = q;
            ModificaGrupo(ArquivosDosGrupos);
            enviar("*_Pronto_*\n*_Legenda atualizada com sucesso pae 😎_*");
          } else {
            enviar(`Ative o bemvindo primeiro `);
          }
          break;

        case "legendasaiu":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (!q) return enviar("Digite a legenda.");
          if (isBemVindo) {
            ArquivosDosGrupos[0].bemVindo[0].saiu = q;
            ModificaGrupo(ArquivosDosGrupos);
            enviar("*_Legenda de Saida atualizada_*");
          } else {
            enviar(`Ative o bemvindo primeiro`);
          }
          break;

        case "totag":
        case "cita":
        case "hidetag":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          const imgCaption =
            (isQuotedImage
              ? quoted?.imageMessage?.caption
              : info.message?.imageMessage?.caption) || "";
          const vidCaption =
            (isQuotedVideo
              ? quoted?.videoMessage?.caption
              : info.message?.videoMessage?.caption) || "";
          const convText =
            (isQuotedMsg ? quoted?.conversation : info.message?.conversation) ||
            "";
          const extdText =
            (isQuotedText
              ? quoted?.extendedTextMessage?.text
              : info.message?.extendedTextMessage?.text) || "";
          const docNoCap =
            (isQuotedDocument
              ? quoted?.documentMessage?.caption
              : info.message?.documentMessage?.caption) || "";
          const docWCap =
            (isQuotedDocW
              ? quoted?.documentWithCaptionMessage?.message?.documentMessage
                  ?.caption
              : info.message?.documentWithCaptionMessage?.message
                  ?.documentMessage?.caption) || "";
          var options = "";
          var imageMessage = isQuotedImage
            ? quoted?.imageMessage
            : info.message?.imageMessage;
          var videoMessage = isQuotedVideo
            ? quoted?.videoMessage
            : info.message?.videoMessage;
          var documentMessageNoCaption = isQuotedDocument
            ? quoted?.documentMessage
            : info.message?.documentMessage;
          var documentMessageWCaption = isQuotedDocW
            ? quoted?.documentWithCaptionMessage?.message?.documentMessage
            : info.message?.documentWithCaptionMessage?.message
                ?.documentMessage;
          var audioMessage = isQuotedAudio ? quoted?.audioMessage : "";
          var stickerMessage = isQuotedSticker ? quoted?.stickerMessage : "";
          var MRC_TD = groupMembers.map((i) => i.id);
          if (imageMessage && !audioMessage && !documentMessageNoCaption) {
            options = {
              image: await getFileBuffer(imageMessage, "image"),
              caption:
                q.length > 1
                  ? q.trim()
                  : imgCaption.replace(`${prefix + command}`, "").trim(),
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          } else if (
            videoMessage &&
            !audioMessage &&
            !documentMessageNoCaption
          ) {
            options = {
              video: await getFileBuffer(videoMessage, "video"),
              caption:
                q.length > 1
                  ? q.trim()
                  : vidCaption.replace(`${prefix + command}`, "").trim(),
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          } else if (
            !audioMessage &&
            !stickerMessage &&
            convText &&
            !documentMessageNoCaption
          ) {
            options = {
              text:
                q.length > 1
                  ? q.trim()
                  : convText.replace(`${prefix + command}`, "").trim(),
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          } else if (
            !audioMessage &&
            !stickerMessage &&
            extdText &&
            !documentMessageNoCaption
          ) {
            options = {
              text:
                q.length > 1
                  ? q.trim()
                  : extdText.replace(`${prefix + command}`, "").trim(),
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          } else if (documentMessageNoCaption) {
            options = {
              document: await getFileBuffer(
                documentMessageNoCaption,
                "document",
              ),
              caption:
                q.length > 1
                  ? q.trim()
                  : docNoCap.replace(`${prefix + command}`, "").trim(),
              mimetype: documentMessageNoCaption.mimetype,
              fileName: documentMessageNoCaption.fileName,
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          } else if (documentMessageWCaption && !audioMessage) {
            options = {
              document: await getFileBuffer(
                documentMessageWCaption,
                "document",
              ),
              caption:
                q.length > 1
                  ? q.trim()
                  : docWCap.replace(`${prefix + command}`, "").trim(),
              mimetype: documentMessageWCaption.mimetype,
              fileName: documentMessageWCaption.fileName,
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          } else if (stickerMessage && !audioMessage) {
            options = {
              sticker: await getFileBuffer(stickerMessage, "sticker"),
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          } else if (audioMessage) {
            options = {
              audio: await getFileBuffer(audioMessage, "audio"),
              ptt: true,
              contextInfo: {
                forwardingScore: 50000,
                isForwarded: true,
                mentionedJid: MRC_TD,
                remoteJid: info.key.remoteJid,
              },
            };
          }
          await subaru
            .sendMessage(from, options)
            .catch(() =>
              reply(
                "Erro! Não foi possível mencionar os participantes, talvez a mensagem que foi atribuída ao comando pode ter ocorrido um erro na leitura. Tente com outra mídia, caso o erro persista entre em contato com o proprietário do BOT e solucione!",
              ),
            );
          break;

        case "msgtemp":
          if (!isDono && !isAdm) {
            return enviar(msg.adm);
          }
          if (!isGroup) return enviar(msg.grupo);
          if (!isBotGroupAdmins) return enviar(msg.botadm);
          await waitReact();
          try {
            const getInfoG = await getGroupMetadataSafe(from);
            if (getInfoG.ephemeralDuration === undefined) {
              reply(
                "As mensagens temporárias no grupo foram ativadas com sucesso.",
              );
              await subaru.sendMessage(from, {
                disappearingMessagesInChat: true,
              });
            } else if (getInfoG.ephemeralDuration > 1) {
              reply(
                "As mensagens temporárias no grupo foram desativadas com sucesso.",
              );
              await subaru.sendMessage(from, {
                disappearingMessagesInChat: false,
              });
            }
          } catch (e) {
            reply(
              "Houve um erro ao tentar alterar o status das mensagens temporárias. Tente novamente mais tarde.",
            );
          }
          break;

        case "resetlink":
          {
            if (!isDono && !isAdm) {
              return reply("Você não tem permissão!");
            }
            if (!isGroup) return reply(mss.grupo);
            if (!isBotGroupAdmins) return reply(mss.botadm);
            try {
              await subaru.groupRevokeInvite(from);
              enviar(`*Link de convite resetado com sucesso*`);
            } catch (e) {
              console.log(e);
              enviar(`algo deu errado`);
            }
          }
          break;

        case "del":
        case "d":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (!alvo) return enviar("Marque a mensagem.");
          await subaru.sendMessage(from, {
            delete: {
              remoteJid: from,
              fromMe: false,
              id: info.message.extendedTextMessage.contextInfo.stanzaId,
              participant: alvo,
            },
          });
          react("🗑");
          break;

        case "promover":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (!alvo)
            return enviar(
              "Marque a mensagem do usuário ou marque o @ dele.., lembre de só marcar um usuário...",
            );
          let promoveJid = alvo;
          if (!JSON.stringify(groupMembers).includes(alvo))
            return enviar("Esse membro não está mais no grupo.");
          if (numeroBot.includes(alvo))
            return enviar("Ué? Tá pedindo pra eu me promover?!");
          subaru.sendMessage(from, {
            text: `@${promoveJid.split("@")[0]} Foi promovido(a) para [ ADMINISTRADOR ] com sucesso.`,
            mentions: [promoveJid],
          });
          subaru.groupParticipantsUpdate(from, [promoveJid], "promote");
          break;

        case "rebaixar":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (!alvo)
            return enviar(
              "Marque a mensagem do usuário ou marque o @ dele.., lembre de só marcar um usuário...",
            );
          let rebaixarJid = alvo;
          if (!JSON.stringify(groupMembers).includes(alvo))
            return enviar("Esse membro não está mais no grupo.");
          if (numeroBot.includes(alvo))
            return enviar("E você acha que eu vou me rebaixar?");
          if (donoNmr.includes(alvo))
            return enviar("*Não vou rebaixar meu criador.*");
          subaru.sendMessage(from, {
            text: `@${rebaixarJid.split("@")[0]} Foi rebaixado para [ MEMBRO COMUM ] com sucesso.`,
            mentions: [rebaixarJid],
          });
          subaru.groupParticipantsUpdate(from, [rebaixarJid], "demote");
          break;

        case "grupin":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          if (!q) return enviar("Cade o parâmetro de tempo?");
          react("🔧");
          switch (q) {
            case "30s":
              {
                subaru.groupSettingUpdate(from, "announcement");
                enviar(
                  "O grupo foi fechado por 30 segundos, Até logo rapeize 👋",
                );
                await esperar(30000); //30 segundos
                subaru.groupSettingUpdate(from, "not_announcement");
                enviar("O grupo ta online de novo meus jovem 😎");
              }
              break;
            case "1m":
              subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 1 minuto, Até logo rapeize 👋");
              await esperar(60000); //1 Minuto
              subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "2m":
              subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 2 minutos, Até logo rapeize 👋");
              await esperar(120000); //2 Minutos
              subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "5m":
              subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 5 minutos, Até logo rapeize 👋");
              await esperar(300000); //5 Minutos
              subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "10m":
              subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 10 minutos, Até logo rapeize 👋");
              await esperar(600000); //10 Minutos
              subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "20m":
              subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 20 minutos, Até logo rapeize 👋");
              await esperar(1200000); //20 Minutos
              subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "30m":
              subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 30 minutos, Até logo rapeize 👋");
              await esperar(13800000); //30 Minutos
              subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "1h":
              subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 1 hora, Até logo rapeize 👋");
              await esperar(27600000); //1 Hora
              subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "3h":
              await subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 3 horas, Até logo rapeize 👋");
              await esperar(82800000); //3 Horas
              await subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "5h":
              await subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 5 horas, Até logo rapeize 👋");
              await esperar(138000000); //30 segundos
              await subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
            case "12h":
              await subaru.groupSettingUpdate(from, "announcement");
              enviar("O grupo foi fechado por 12 horas, Até logo rapeize 👋");
              await esperar(331200000); //12 Horas
              await subaru.groupSettingUpdate(from, "not_announcement");
              enviar("O grupo ta online de novo meus jovem 😎");
              break;
          }
          break;

        case "linkgp":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          let grupo = await getGroupMetadataSafe(from);
          var admins = grupo.participants.filter(
            (p) => p.role === "admin",
          ).length;
          const groupLinkk = await subaru.groupInviteCode(from);
          reply(`📊 \`𝐈𝐧𝐟𝐨𝐫𝐦𝐚çõ𝐞𝐬 𝐝𝐨 𝐆𝐫𝐮𝐩𝐨:\`

✧͜͡҉🏆𝐢𝐝𝐠𝐩: _${from}_ ;
✧͜͡҉🔰𝐍𝐨𝐦𝐞: _${grupo.subject}_ ;
✧͜͡҉🔗𝐋𝐢𝐧𝐤 𝐝𝐨 𝐠𝐩: _https://chat.whatsapp.com/${groupLinkk}_.;
✧͜͡҉👥𝐌𝐞𝐦𝐛𝐫𝐨𝐬: _${grupo.participants.length}_ ;
✧͜͡҉📝𝐃𝐞𝐬𝐜𝐫𝐢𝐜𝐚𝐨: _${grupo.desc}_ ; 
> ${botName}`);
          break; // By GojoDevs

        case "clear":
        case "limpar":
          if (!isGroup) return reply(mss.grupo);
          if (!isGroupAdmins && isDono) return reply(mss.adm);
          if (!isBotGroupAdmins) return reply(mss.botadm);
          await subaru.groupSettingUpdate(from, "announcement");
          let clear = `🗑️\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n🗑️\n❲❗❳ *Lɪᴍᴘᴇᴢᴀ ᴅᴇ Cʜᴀᴛ Cᴏɴᴄʟᴜɪ́ᴅᴀ*\n𝐁𝐲: ${botName} ✅`;
          subaru.sendMessage(
            from,
            { text: clear },
            {
              quoted: selogpt,
              contextInfo: { forwardingScore: 500, isForwarded: true },
            },
          );
          setTimeout(async () => {
            await subaru.groupSettingUpdate(from, "not_announcement");
          }, 10000);
          break;

        //=====( ABAIXO OS COMANDOS DA API )=====\\
        case "removebg": {
          try {
            const tempDir = "./database/temp";
            if (!fs.existsSync(tempDir))
              fs.mkdirSync(tempDir, { recursive: true });

            let imageUrl;
            const saveTempAndUpload = async (mediaBuffer) => {
              const tempPath = `${tempDir}/removebg_${Date.now()}.jpg`;
              fs.writeFileSync(tempPath, mediaBuffer);
              let url;
              try {
                url = await CatBox(tempPath);
              } catch {
                const uploaded = await UploadFileUgu(tempPath);
                url = uploaded.url;
              }
              fs.unlinkSync(tempPath);
              return url;
            };

            if (isQuotedImage) {
              const mediaBuffer = await downloadMediaMessage(
                { message: { imageMessage: mediaInfo } },
                "buffer",
                {},
              );
              imageUrl = await saveTempAndUpload(mediaBuffer);
            } else if (isImage) {
              const mediaBuffer = await downloadMediaMessage(
                info,
                "buffer",
                {},
              );
              imageUrl = await saveTempAndUpload(mediaBuffer);
            } else if (q?.startsWith("http")) {
              imageUrl = q;
            } else {
              return reply(
                `❌ Envie uma imagem, quote uma imagem, ou passe uma URL. Ex: ${prefix}removebg https://...`,
              );
            }

            reply("⏳ Removendo o fundo da imagem, aguarde...");

            const res = await fetch(
              `${baseRaikken}/api/outros/remove-bg?imageUrl=${encodeURIComponent(imageUrl)}&apikey=${RaikkenKey}`,
            );
            if (!res.ok) throw new Error("Erro ao remover o fundo da imagem.");
            const buffer = Buffer.from(await res.arrayBuffer());

            const tempOut = `${tempDir}/removebg_out_${Date.now()}.png`;
            fs.writeFileSync(tempOut, buffer);
            const uploadedOut = await UploadFileUgu(tempOut);
            fs.unlinkSync(tempOut);

            await subaru.sendMessage(
              from,
              {
                image: { url: uploadedOut.url },
                caption: "✅ Fundo removido com sucesso!",
              },
              { quoted: info },
            );
          } catch (e) {
            console.error(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "bratmeme": {
          const partes = q?.split("|");
          if (!q || partes.length < 2)
            return reply(`❌ Use: ${prefix}bratmeme texto1 | texto2`);
          try {
            const text1 = partes[0].trim();
            const text2 = partes[1].trim();
            const res = await fetch(
              `${baseRaikken}/api/canvas/bratmeme?text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}&apikey=${RaikkenKey}`,
            );
            if (!res.ok) throw new Error("Erro ao gerar sticker bratmeme.");
            const buffer = Buffer.from(await res.arrayBuffer());
            await sendImageAsSticker2(subaru, from, buffer, info, {
              packname: botName,
              author: donoName,
            });
          } catch (e) {
            console.error(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "bratmeme2": {
          if (!q)
            return reply("❌ Digite um texto! Ex: .bratmeme2 seu texto aqui");
          try {
            const res = await fetch(
              `${baseRaikken}/api/canvas/bratmeme2?text=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            if (!res.ok) throw new Error("Erro ao gerar sticker bratmeme2.");
            const buffer = Buffer.from(await res.arrayBuffer());
            await sendImageAsSticker2(subaru, from, buffer, info, {
              packname: botName,
              author: donoName,
            });
          } catch (e) {
            console.error(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "bratvideo": {
          if (!q)
            return reply("❌ Digite um texto! Ex: .bratvideo seu texto aqui");
          try {
            const res = await fetch(
              `${baseRaikken}/api/canvas/bratvideo?text=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            if (!res.ok) throw new Error("Erro ao gerar sticker brat.");
            const buffer = Buffer.from(await res.arrayBuffer());
            await sendVideoAsSticker2(subaru, from, buffer, info, {
              packname: botName,
              author: donoName,
            });
          } catch (e) {
            console.error(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "brat": {
          if (!q) return reply("❌ Digite um texto! Ex: .brat seu texto aqui");
          try {
            const res = await fetch(
              `${baseRaikken}/api/canvas/brat?text=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            if (!res.ok) throw new Error("Erro ao gerar imagem brat.");
            const buffer = Buffer.from(await res.arrayBuffer());
            await sendImageAsSticker2(subaru, from, buffer, info, {
              packname: botName,
              author: donoName,
            });
          } catch (e) {
            console.error(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "conversas-simi":
          {
            try {
              const url = `${baseRaikken}/api/ia/conversas-simi?apikey=${RaikkenKey}`;
              let response = await fetch(url);
              if (!response.ok) {
                return reply(`❌ Erro ao acessar API: ${response.status}`);
              }

              let data = await response.text();
              reply(data);
            } catch (err) {
              console.error(err);
              reply("❌ Erro ao buscar dados.");
            }
          }
          break;

        case "namorar": {
          if (!alvo)
            return reply("💔 Você precisa marcar alguém para pedir em namoro.");
          if (alvo === sender2)
            return reply("😂 Você não pode namorar com você mesmo!");
          if (botNumber.includes(alvo))
            return reply("😳 Eu sou apenas um bot, não posso namorar!");
          const familia = await getFamiliaData(sender2);
          if (familia && familia.parceiro) {
            const parceiroAtual =
              familia.parceiro.parceiroId || familia.parceiroId;
            const nomeExibicao = parceiroAtual.replace("@lid", "");
            const tipoRelacionamento = familia.parceiro.tipo.toLowerCase();
            await mentions(
              `💞 Você já está em um relacionamento (${tipoRelacionamento}) com @${nomeExibicao}. Não é possível pedir outra pessoa em namoro.`,
              [parceiroAtual],
            );
            await subaru.sendMessage(parceiroAtual, {
              text: `🐂 ALERTA! Seu parceiro @${sender2.split("@")[0]} está tentando pedir @${alvo.split("@")[0]} em namoro pelas suas costas!`,
              mentions: [sender2, parceiroAtual],
            });
            return;
          }
          try {
            const res = await fetch(
              `${baseRaikken}api/familia/namorar?apikey=${RaikkenKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarioId: sender2, parceiroId: alvo }),
              },
            );
            const data = await res.json();
            if (!data || !data.mensagem)
              throw new Error("Resposta inválida da API.");
            const mensagemOriginal = data.mensagem.replace(/@lid/g, "");
            const [id1, id2] = mensagemOriginal.match(/\d+/g);
            const msgFormatada = `💞 Novo casal formado!\n@${id1} 💍 @${id2}\n💘 Que o amor de vocês dure para sempre!`;
            await mentions(msgFormatada, [sender2, alvo]);
          } catch (e) {
            console.error("Erro no namoro:", e);
            await botSemKey(subaru, from);
          }
          break;
        }

        case "casar":
          {
            if (!alvo)
              return reply("💍 Você precisa marcar com quem deseja casar.");
            if (alvo === sender2)
              return reply("😂 Você não pode casar com você mesmo!");
            if (botNumber.includes(alvo))
              return reply("😳 Casar com um bot? Que ideia maluca!");
            const familia = await getFamiliaData(sender2);
            if (!familia || !familia.parceiro) {
              return reply(
                "💔 Para casar, você primeiro precisa estar em um namoro.",
              );
            }
            const parceiroAtual = familia.parceiro.parceiroId;
            const nomeExibicao = parceiroAtual.replace("@lid", "");
            const tipoRelacionamento = familia.parceiro.tipo;
            if (tipoRelacionamento === "Casamento") {
              return mention(
                `💞 Você já está casado(a) com @${parceiroAtual}!`,
              );
            }
            if (alvo !== parceiroAtual) {
              await mentions(
                `Sua dupla é o/a @${nomeExibicao}... Fica esperto em 🐂`,
                [parceiroAtual],
              );
              await subaru.sendMessage(parceiroAtual, {
                text: `🐂 ALERTA! Seu namorado(a) @${sender2.split("@")[0]} está tentando pedir @${alvo.split("@")[0]} em CASAMENTO!`,
                mentions: [sender2, alvo],
              });
              return;
            }
            try {
              const res = await fetch(
                `${baseRaikken}/api/familia/casar?apikey=${RaikkenKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    usuarioId: sender2,
                    parceiroId: alvo,
                  }),
                },
              );
              const data = await res.json();
              if (!data || !data.mensagem)
                throw new Error("Resposta inválida da API.");
              const mensagemOriginal = data.mensagem.replace(/@lid/g, "");
              const [id1, id2] = mensagemOriginal.match(/\d+/g);
              const msgFormatada = `💞 Mais um passo dado!\n@${id1} 💍 @${id2}\n💘 Que o amor de vocês dure para sempre!`;
              await mentions(msgFormatada, [sender2, alvo]);
            } catch (e) {
              console.log(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "divorciar":
        case "terminar":
          {
            if (args[0] !== "1") {
              return reply(
                `Tem certeza? Para confirmar o fim do relacionamento, use: *${prefix}${command} 1*`,
              );
            }
            const familia = await getFamiliaData(sender2);
            if (!familia || !familia.parceiro) {
              return reply(
                "💔 Você não está em um relacionamento para poder terminar.",
              );
            }
            const parceiroId = familia.parceiro.parceiroId;
            const endpoint =
              familia.parceiro.tipo === "Casamento" ? "divorciar" : "terminar";
            try {
              const res = await fetch(
                `${baseRaikken}/api/familia/divorciar?apikey=${RaikkenKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    usuarioId: sender2,
                    parceiroId: parceiroId,
                  }),
                },
              );
              const data = await res.json();
              if (!data || !data.mensagem)
                throw new Error("Resposta inválida da API.");
              await mentions(data.mensagem, [sender2, alvo]);
            } catch (e) {
              console.log(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "addamante":
          {
            if (!alvo)
              return reply("😏 Você precisa marcar quem será seu/sua amante.");
            if (alvo === sender2)
              return reply("😂 Ter um caso com você mesmo? Interessante...");
            const familia = await getFamiliaData(sender2);
            if (familia && familia.parceiro) {
              const parceiroAtual = familia.parceiro.parceiroId;
              await reply("🤫 Cuidado... Brincar com fogo pode te queimar...");
              await subaru.sendMessage(parceiroAtual, {
                text: `🐂 ALERTA DE CORNO! Seu parceiro @${sender2.split("@")[0]} acabou de adicionar @${alvo.split("@")[0]} como amante!`,
                mentions: [sender2, alvo],
              });
            }
            try {
              const res = await fetch(
                `${baseRaikken}/api/familia/amante?apikey=${RaikkenKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    usuarioId: sender2,
                    parceiroId: alvo,
                  }),
                },
              );
              const data = await res.json();
              if (!data || !data.mensagem)
                throw new Error("Resposta inválida da API.");
              const mensagemOriginal = data.mensagem.replace(/@lid/g, "");
              const [id1, id2] = mensagemOriginal.match(/\d+/g);
              const msgFormatada = `🫦 Eita, uma amante na relação? !\n@${id1} 💍 @${id2}\n💋 Que o amor de vocês sobreviva o caos`;
              await mentions(msgFormatada, [sender2, alvo]);
            } catch (e) {
              console.log(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "familia":
          {
            const usuarioConsultado = sender2 || alvo;

            try {
              const familia = await getFamiliaData(usuarioConsultado);
              if (!familia)
                return reply(
                  "Este usuário não possui uma árvore genealógica registrada.",
                );

              const { parceiro, filhos, amantes, historico } = familia;
              let msg = `🌳 Árvore Familiar de @${usuarioConsultado.split("@")[0]}\n\n`;

              if (parceiro && parceiro.desde) {
                const dataInicio = new Date(parceiro.desde);
                const hoje = new Date();
                const diffTempo = Math.abs(hoje - dataInicio);
                const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
                const anosJuntos = Math.floor(diffDias / 365);
                const mesesJuntos = Math.floor((diffDias % 365) / 30);
                const diasRestantes = (diffDias % 365) % 30;
                let tempoJuntos = `⏳ Juntos há: `;
                if (anosJuntos > 0) tempoJuntos += `${anosJuntos} ano(s) `;
                if (mesesJuntos > 0) tempoJuntos += `${mesesJuntos} mês(es) `;
                if (diasRestantes > 0) tempoJuntos += `${diasRestantes} dia(s)`;
                msg += `${tempoJuntos.trim()}\n`;
                const dia = dataInicio.getDate();
                const mes = dataInicio.getMonth() + 1;
                const ano = dataInicio.getFullYear();
                if (hoje.getDate() === dia && hoje.getMonth() + 1 === mes) {
                  if (anosJuntos > 0)
                    msg += `\n🎂 FELIZ ANIVERSÁRIO DE ${anosJuntos} ANO(S)! 🎉\n`;
                } else {
                  const mesesTotais =
                    (hoje.getFullYear() - ano) * 12 +
                    (hoje.getMonth() + 1 - mes);
                  if (mesesTotais > 0)
                    msg += `\n💖 FELIZ ${mesesTotais} MESES JUNTOS! ✨\n`;
                }
                msg += "\n";
              } else {
                msg += "💞 Nenhum parceiro ativo.\n\n";
              }

              msg += filhos?.length
                ? `👶 Filhos:\n${filhos.map((f) => `• ${f.nome.replace("@lid", "")} (${f.idade} anos)`).join("\n")}\n\n`
                : "👶 Nenhum filho registrado.\n\n";
              msg += amantes?.length
                ? `😏 Amantes:\n${amantes.map((a) => `• @${a.amanteId.replace("@lid", "")}`).join("\n")}\n\n`
                : "😏 Nenhum amante ativo.\n\n";
              msg +=
                "📜 Histórico:\n" +
                (historico?.length
                  ? historico
                      .map(
                        (h) =>
                          `• ${h.tipo} com @${h.parceiroId.replace("@lid", "")} (${h.status})`,
                      )
                      .join("\n")
                  : "Nenhum histórico.");
              const membrosParaMencionar = [
                usuarioConsultado,
                ...(parceiro ? [parceiro.parceiroId] : []),
                ...(filhos?.map((f) => f.id) || []),
                ...(amantes?.map((a) => a.amanteId) || []),
              ];

              await mentions(msg, membrosParaMencionar);
            } catch (e) {
              console.log(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "terfilho":
          {
            if (!alvo || !q)
              return reply("👶 Use: *.filho @pessoa NomeDoFilho*");
            const nomeFilho = q.trim();
            try {
              const res = await fetch(
                `${baseRaikken}/api/familia/filho?apikey=${RaikkenKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    usuarioId: sender2,
                    parceiroId: alvo,
                    nomeFilho,
                  }),
                },
              );
              const data = await res.json();
              await reply(`🍼 ${data.mensagem || "Erro desconhecido."}`);
            } catch (e) {
              console.log(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "listaramantes":
          {
            try {
              const res = await fetch(
                `${baseRaikken}/api/familia/amantes/${sender2}?apikey=${RaikkenKey}`,
              );
              const data = await res.json();
              if (!data.sucesso || !data.dados.length)
                return reply("😏 Nenhum amante encontrado.");
              const lista = data.dados
                .map((a, i) => `• ${i + 1}. ${a.amanteId} (desde ${a.desde})`)
                .join("\n");
              await reply(`💋 *Lista de Amantes de ${sender2}:*\n\n${lista}`);
            } catch (e) {
              console.log(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "filhos":
          {
            try {
              const res = await fetch(
                `${baseRaikken}/api/familia/filhos/${sender2}?apikey=${RaikkenKey}`,
              );
              const data = await res.json();
              if (!data.sucesso || !data.dados.length)
                return reply("👶 Nenhum filho encontrado.");
              const lista = data.dados
                .map((f, i) => `• ${i + 1}. ${f.nome} (${f.idade} anos)`)
                .join("\n");
              await reply(`🍼 *Filhos de ${sender2}:*\n\n${lista}`);
            } catch (e) {
              console.log(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "play": {
          if (!q)
            return reply("Digite o nome da música ou cole o link do YouTube!");
          await react("✨");
          try {
            let data = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY");
            let hora = moment().tz("America/Sao_Paulo").format("HH:mm:ss");
            const res = await fetch(
              `${baseRaikken}/api/yt/audio?query=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            const json = await res.json();
            if (!json.success || !json.resultado)
              return reply("Não foi possível encontrar a música.");
            const r = json.resultado;
            const {
              title: titulo,
              author: canal,
              duration: duracao,
              thumb,
              url: videoUrl,
              audioStreamUrl,
            } = r;

            let c = `
┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃࣪ ✿𖥔࣪ *ꔛ⃟𝐌𝐔𝐒𝐈𝐂𝐀 𝐄𝐍𝐂𝐎𝐍𝐓𝐑𝐀𝐃𝐀* ✿𖥔࣪
┃࣪ ┃࣪ 🎵 *Título:* ${titulo}
┃࣪ ┃࣪ ⏱️ *Duração:* ${duracao}
┃࣪ ┃࣪ 👤 *Canal:* ${canal}
┃࣪ ┃࣪ 🔗 *Link:* ${videoUrl}
┃࣪ ┃࣪ 📅 *Data:* ${data}
┃࣪ ┃࣪ ⏰ *Hora:* ${hora}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;

            await subaru.sendMessage(
              from,
              { image: { url: thumb }, caption: c },
              { quoted: info },
            );

            const audioRes = await fetch(audioStreamUrl);
            const audiok = Buffer.from(await audioRes.arrayBuffer());
            await subaru.sendMessage(
              from,
              {
                audio: audiok,
                mimetype: "audio/mpeg",
                filename: "audio.mp4",
                ptt: false,
              },
              { quoted: info },
            );
          } catch (e) {
            console.log(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "playdoc": {
          if (!q || !q.startsWith("http")) {
            return reply(
              "❌ Link do YouTube inválido ou não fornecido. Use o comando .playb para buscar uma música.",
            );
          }
          reply2("📥 Buscando informações do áudio, aguarde...");
          try {
            const res = await fetch(
              `${baseRaikken}/api/mp3/url?url=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            const json = await res.json();
            if (!json.success || !json.message) {
              throw new Error(
                "Não foi possível obter os dados da música. O vídeo pode ser privado ou ter restrição de idade.",
              );
            }
            const titulo = json.message.title;
            const audioUrl = json.message.url;
            reply(
              `✅ Música encontrada: "${titulo}"\nEnviando como documento...`,
            );
            await subaru.sendMessage(
              from,
              {
                document: { url: audioUrl },
                mimetype: "audio/mpeg",
                fileName: `${titulo}.mp3`,
              },
              { quoted: info },
            );
          } catch (e) {
            console.error("Erro no comando .playdoc:", e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "playvideo": {
          if (!q) return reply(`❌ Use: ${prefix + command} <link do YouTube>`);
          try {
            const res = await fetch(
              `${baseRaikken}/api/mp4/url?url=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            const json = await res.json();
            if (!json.success || !json.message) {
              return reply("❌ Não foi possível obter o vídeo.");
            }
            const m = json.message;
            const dataAtual = moment
              .tz("America/Sao_Paulo")
              .format("DD/MM/YYYY");
            const horaAtual = moment.tz("America/Sao_Paulo").format("HH:mm:ss");
            const msgg = `
┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *🎬 Vídeo Encontrado!*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Título:* ${m.title}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Canal:* ${m.channel?.name || "Desconhecido"}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Duração:* ${m.duration}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Data:* ${dataAtual}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ *Hora:* ${horaAtual}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;
            await subaru.sendMessage(
              from,
              { video: { url: m.url }, caption: msgg },
              { quoted: seloSz },
            );
          } catch (e) {
            console.error(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "facebook":
          {
            if (!q)
              return reply(
                "📌 Envie o link de um vídeo do Facebook.\n\nExemplo:\n.facebook https://www.facebook.com/...",
              );

            try {
              const url = `${baseRaikken}/api/facebook?url=${encodeURIComponent(q)}&apikey=${RaikkenKey}`;
              const res = await axios.get(url);
              const data = res.data;

              if (!data.status || !data.resultado || !data.resultado.status) {
                return reply(
                  "❌ Não consegui processar esse vídeo. Link inválido ou protegido.",
                );
              }

              const { title, duration, thumbnail, links } = data.resultado;
              const linkHD = links.find((v) => v.quality.includes("720"))?.link;
              const linkSD = links.find((v) => v.quality.includes("360"))?.link;

              const finalLink = linkHD || linkSD;
              if (!finalLink)
                return reply("❌ Nenhum link de vídeo encontrado.");
              reply("📥 Baixando o vídeo, aguarde...");

              const buffer = await getBuffer(finalLink);
              await subaru.sendMessage(
                from,
                {
                  video: buffer,
                  mimetype: "video/mp4",
                  caption: `🎬 *${title}*\n⏱ Duração: ${duration}`,
                },
                { quoted: info },
              );
            } catch (err) {
              console.error(err);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "twitter":
          {
            if (!q)
              return reply(
                "❗ Envie o link do post do Twitter/X.\n\nExemplo:\n.twitter https://x.com/usuario/status/123456",
              );

            try {
              const api = `${baseRaikken}/twitter?url=${encodeURIComponent(q)}&apikey=${RaikkenKey}`;
              const res = await axios.get(api);
              const data = res.data;

              if (!data.status)
                return reply(
                  "❌ Não consegui processar o vídeo. Verifique o link.",
                );

              const { desc, HD } = data.resultado;
              await subaru.sendMessage(
                from,
                {
                  video: { url: HD },
                  caption: `🎬 *Twitter/X Downloader*\n\n📝 *Descrição:* ${desc}`,
                  mimetype: "video/mp4",
                },
                { quoted: info },
              );
            } catch (err) {
              console.error(err);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "gemini": {
          if (!sz)
            return reply(
              `💬 Envie uma pergunta para o Gemini responder.\n\nExemplo:\n${prefixo}gemini Quem descobriu o Brasil?`,
            );
          waitReact();
          try {
            const res = await axios.get(
              `${baseRaikken}/api/ia/gemini?prompt=${encodeURIComponent(sz)}&apikey=${RaikkenKey}`,
            );

            if (!res.data || !res.data.resultado) {
              return reply("❌ Não consegui obter resposta do Gemini.");
            }

            return reply(`🤖 *Resposta do Gemini:*\n\n${res.data.resultado}`);
          } catch (err) {
            console.error("Erro ao chamar Gemini:", err);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "gpt": {
          if (!sz)
            return reply(
              `💬 Envie uma pergunta para a IA responder.\n\nExemplo:\n${prefixo}ia O que é buraco negro?`,
            );
          waitReact();
          try {
            const url = `${baseRaikken}/api/ia/gpt3?prompt=${encodeURIComponent(sz)}&apikey=${RaikkenKey}`;
            const res = await axios.get(url);

            if (!res.data?.status || !res.data?.resultado)
              return reply("❌ Erro ao processar a resposta.");

            await reply(`💡 *Resposta da IA:*\n\n${res.data.resultado}`);
          } catch (err) {
            console.error("Erro na IA =>", err);
            botSemKey(subaru, grupoName, comando);
          }

          break;
        }

        case "insta": {
          if (!sz)
            return reply(
              `📷 Envie o link do vídeo do Instagram.\nExemplo:\n${prefixo}insta https://www.instagram.com/reel/xxxxx`,
            );
          await waitReact();

          try {
            const urlApi = `${baseRaikken}/instagram?url=${encodeURIComponent(sz)}&apikey=${RaikkenKey}`;
            const res = await axios.get(urlApi);
            const json = res.data;
            if (!json.status || !json.resultado?.video) {
              return reply(
                "❌ Não consegui baixar o vídeo. Verifique o link e tente novamente.",
              );
            }
            const { video, legenda, perfil } = json.resultado;
            const buffer = await getBuffer(video);

            await subaru.sendMessage(
              from,
              {
                video: buffer,
                caption: `🎬 *Reel de:* @${perfil}\n\n📝 ${legenda || "Sem legenda"}\n> ©Subaru-V1`,
              },
              { quoted: info },
            );
          } catch (err) {
            console.error("Erro Insta =>", err);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "pinterest": {
          try {
            if (!sz)
              return reply(
                `📌 Envie o termo da pesquisa.\nExemplo:\n${prefixo}pinterest naruto,5`,
              );
            await reply("⏳ Buscando imagens no Pinterest...");
            const [queryRaw, qtdStr] = sz.split(",");
            const query = queryRaw?.trim();
            const total = Math.min(Number(qtdStr) || 5, 10);
            let cards = [],
              i = 1;
            for (let count = 0; count < total; count++) {
              try {
                const url = `${baseRaikken}/api/pinterest?query=${encodeURIComponent(query)}&apikey=${RaikkenKey}`;
                const buffer = await getBuffer(url);
                const { imageMessage } = await generateWAMessageContent(
                  { image: buffer },
                  { upload: subaru.waUploadToServer },
                );

                cards.push({
                  body: proto.Message.InteractiveMessage.Body.fromObject({
                    text: `🔍 Resultado ${i++} de *${query}*`,
                  }),
                  footer: proto.Message.InteractiveMessage.Footer.fromObject({
                    text: "> ⚡ via Raikken-API",
                  }),
                  header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: "*Pinterest*",
                    hasMediaAttachment: true,
                    imageMessage,
                  }),
                  nativeFlowMessage:
                    proto.Message.InteractiveMessage.NativeFlowMessage.fromObject(
                      {
                        buttons: [
                          {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                              display_text: "Abrir no Pinterest",
                              url: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
                              merchant_url: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
                            }),
                          },
                        ],
                      },
                    ),
                });
              } catch (err) {
                console.error(
                  `[❌] Erro ao buscar imagem ${count + 1}:`,
                  err.message || err,
                );
                botSemKey(subaru, grupoName, comando);
              }
            }

            if (cards.length === 0)
              return reply("❌ Não consegui obter imagens. Tente outro termo.");

            const msg = generateWAMessageFromContent(
              from,
              {
                viewOnceMessage: {
                  message: {
                    messageContextInfo: {
                      deviceListMetadata: {},
                      deviceListMetadataVersion: 2,
                    },
                    interactiveMessage:
                      proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                          text: `🔎 Pesquisa por: *${query}*`,
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                          text: botName,
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                          hasMediaAttachment: false,
                        }),
                        carouselMessage:
                          proto.Message.InteractiveMessage.CarouselMessage.fromObject(
                            {
                              cards,
                            },
                          ),
                      }),
                  },
                },
              },
              {},
            );

            await subaru.relayMessage(from, msg.message, {
              messageId: msg.key.id,
            });
          } catch (e) {
            console.error("[❌ Erro Pinterest Carrossel]", e);
            reply("❌ Erro ao gerar o carrossel do Pinterest.");
          }
          break;
        }

        case "ttk": {
          if (!q) return enviar("🚫 Envie o link de um vídeo do TikTok.");
          await waitReact();
          try {
            const res = await fetch(
              `${baseRaikken}/tiktok-link?url=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            const json = await res.json();
            if (!json.status || !json.data || !json.data.length) {
              return enviar("⚠️ Vídeo não encontrado ou inválido.");
            }
            const videoHD =
              json.data.find((v) => v.type === "nowatermark_hd")?.url ||
              json.data.find((v) => v.type === "nowatermark")?.url ||
              json.data[0]?.url;
            const legenda = `
┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃࣪ ✿𖥔࣪ *☽˚｡✧❖ 𝑻𝑰𝑲𝑻𝑶𝑲 ❖✧☽˚｡* ✿𖥔࣪
┃࣪ ┃࣪ 👤 *Autor:* ${json.author.nickname} (@${json.author.fullname})
┃࣪ ┃࣪ 🕒 *Duração:* ${json.duration}
┃࣪ ┃࣪ 📆 *Postado em:* ${json.taken_at}
┃࣪ ┃࣪ 📊 *Visualizações:* ${json.stats.views}
┃࣪ ┃࣪ ❤️ *Curtidas:* ${json.stats.likes}
┃࣪ ┃࣪ 💬 *Comentários:* ${json.stats.comment}
┃࣪ ┃࣪ 🔄 *Compartilhamentos:* ${json.stats.share}
┃࣪ ┃࣪ 🎬 *${json.title}*
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛
> _𝑹𝒂𝒊𝒌𝒌𝒆𝒏-𝑨𝒑𝒊⚡_`.trim();

            await subaru.sendMessage(from, {
              video: { url: videoHD },
              caption: legenda,
              mimetype: "video/mp4",
            });
          } catch (e) {
            console.error(e);
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "tksrc": {
          if (!q)
            return enviar(
              "🚫 Insira o nome ou termo para pesquisar vídeos no TikTok.",
            );
          await waitReact();
          try {
            const res = await fetch(
              `${baseRaikken}/tiktok-src?q=${encodeURIComponent(q)}&apikey=${RaikkenKey}`,
            );
            const json = await res.json();
            if (!json.resultado || !Array.isArray(json.resultado)) {
              return enviar("⚠️ Nenhum resultado encontrado.");
            }
            const lista = json.resultado;
            const linkAleatorio =
              lista[Math.floor(Math.random() * lista.length)];
            await subaru.sendMessage(
              from,
              {
                video: { url: linkAleatorio },
                caption: `🎵 *TikTok Source*\n🔎 Termo: ${q}\n🌐`,
              },
              { quoted: info },
            );
          } catch (e) {
            botSemKey(subaru, grupoName, comando);
          }
          break;
        }

        case "rgtinder":
          {
            const rgValue = q;
            try {
              let endpoint = `${baseRaikken}/api/tinder/login?usu=${sender}`;

              if (rgValue && !isImage) {
                endpoint += `&rg=${encodeURIComponent(rgValue)}`;
              } else if (isImage && linkft) {
                endpoint += `&rg=${encodeURIComponent(linkft)}`;
              }

              const response = await axios.get(endpoint);
              const { message } = response.data;
              if (!message)
                return reply(
                  "A API retornou uma resposta vazia. Tente novamente.",
                );

              reply(detectTinder(message));
            } catch (error) {
              console.error("Erro no comando rgtinder:", error);
              const errorMessage =
                error.response?.data?.message ||
                "Ocorreu um pequeno erro, tente novamente mais tarde!";
              reply(errorMessage);
            }
          }
          break;

        case "tinder":
        case "rolar": {
          await react("🔥");
          if (!isGroup)
            return reply("Este comando só pode ser usado em grupos.");
          try {
            const userProfileResponse = await axios.get(
              `${baseRaikken}/api/tinder/perfil?usu=${sender}`,
            );
            if (
              !userProfileResponse.data.dados ||
              userProfileResponse.data.dados.length === 0
            ) {
              return reply2(
                "Você não está registrado! Use o comando de registro para começar.",
              );
            }

            const findResponse = await axios.get(
              `${baseRaikken}/api/tinder/find?usu=${sender}`,
            );
            if (
              !findResponse.data.dados ||
              findResponse.data.dados.length === 0
            ) {
              return reply(
                findResponse.data.message ||
                  "Nenhum usuário encontrado no momento. Tente mais tarde!",
              );
            }
            const dupla = findResponse.data.dados[0];
            let texto = `*${botName} Tinder 👫🌟*\n—\n`;
            texto += `• [💖] Usuário: ${dupla.name}\n`;
            texto += `• WhatsApp: wa.me/${dupla.userId.split("@")[0]}\n`;
            texto += `• [⏳] Idade: ${dupla.age} anos.\n`;
            texto += `• [🏳‍🌈] Sexualidade: ${dupla.sexuality}\n`;
            texto += `• [🚻] Gênero: ${dupla.gender}\n`;
            texto += `• [💌] *Bio:* ${dupla.bio}\n—`;

            const thumbResponse = await fetch(dupla.photo);
            const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
            const imageMedia = await prepareWAMessageMedia(
              { image: thumbBuffer },
              { upload: subaru.waUploadToServer },
            );
            const interactiveMessage = {
              header: {
                ...imageMedia,
                hasMediaAttachment: true,
                title: "",
              },
              body: { text: texto },
              footer: { text: "Escolha uma opção para reagir ao perfil!" },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "💖 Like",
                      id: `${prefix}like ${dupla.userId}`,
                    }),
                  },
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "💔 Dislike",
                      id: `${prefix}dislike ${dupla.userId}`,
                    }),
                  },
                ],
                messageParamsJson: "",
              },
            };
            await sendInteractiveMessage(
              subaru,
              from,
              { interactiveMessage },
              { additionalAttributes: {}, useCachedGroupMetadata: true },
            );
          } catch (error) {
            console.error("Erro no comando rolar:", error);
            const errorMessage =
              error.response?.data?.message ||
              "Ocorreu um pequeno erro ao buscar um par para você!";
            reply(detectTinder(errorMessage));
          }
          break;
        }

        case "tindernome":
        case "tinderidade":
        case "tinderbio":
        case "setgene":
        case "setsex":
        case "setfiltro":
        case "tinderfoto":
          {
            if (!isGroup) return reply("Só pode ser usado em grupos!");
            if (!q && !isImage)
              return reply(
                `Por favor, forneça um valor. Ex: #${command} novo valor`,
              );

            try {
              let finalQueryValue = q;
              if (command === "tinderfoto") {
                if (!isImage)
                  return reply(
                    "Você precisa marcar uma imagem para definir como foto de perfil.",
                  );
                try {
                  var Fl =
                    info?.message?.extendedTextMessage?.contextInfo
                      ?.quotedMessage;
                  var muk =
                    Fl?.viewOnceMessageV2?.message?.imageMessage ||
                    Fl?.viewOnceMessage?.message?.imageMessage ||
                    Fl?.imageMessage;
                  let base64String = await getFileBuffer(muk, "image");
                  var abcd = await CatBox(base64String);
                  finalQueryValue = abcd;
                } catch (error) {
                  console.error("Erro ao processar imagem:", error);
                  return reply(
                    "Não foi possível processar a imagem. Tente novamente!",
                  );
                }
              }
              const endpoint = `${baseRaikken}/api/tinder/config?usu=${sender}&mod=${command}&q=${encodeURIComponent(finalQueryValue)}`;
              const response = await axios.get(endpoint);
              if (!response.data || !response.data.message)
                throw new Error("Resposta inválida da API");
              reply(detectTinder(response.data.message));
            } catch (error) {
              console.error(`Erro no comando ${command}:`, error);
              const errorMessage =
                error.response?.data?.message ||
                `Ocorreu um pequeno erro, tente novamente mais tarde.\n${error.message}`;
              reply(errorMessage);
            }
          }
          break;

        case "meutinder":
          {
            if (!isGroup) return reply("Só pode ser usado em grupos");
            try {
              const response = await axios.get(
                `${baseRaikkenTinder}/perfil?usu=${sender}`,
              );
              if (!response.data.dados || response.data.dados.length === 0) {
                return reply(
                  response.data.message ||
                    "Usuário não encontrado. Use o comando de registro para começar.",
                );
              }
              const perfil = response.data.dados[0];

              let envMyTinder = `• [💖] Usuári${perfil.gene === "masculino" ? "o" : "a"}: ${perfil.nome}\n`;
              envMyTinder += `• [⏳] Idade: ${perfil.idade} anos.\n`;
              envMyTinder += `• [📞] WhatsApp: wa.me/${perfil.nmr[0]}\n`;
              envMyTinder += `• [🏳️‍🌈] Sexualidade: ${perfil.sexualidade}\n`;
              envMyTinder += `• [🚻] Gênero: ${perfil.gene}\n`;
              envMyTinder += `• [📍] Filtro: ${perfil.filtro == 3 ? `Não há preferência.` : `Busca por ${perfil.filtro == 1 ? `homens` : `mulheres`}`}\n`;
              envMyTinder += `—\n• [😺] Bio: ${perfil.bio}\n`;

              await subaru.sendMessage(
                from,
                {
                  text: envMyTinder,
                  contextInfo: {
                    externalAdReply: {
                      title: `Raikken-API's Tinder! 💘`,
                      body: `😌🌟 Este é o seu perfil atual!`,
                      thumbnail: await getBuffer(perfil.foto),
                      mediaType: 1,
                      showAdAttribution: true,
                      sourceUrl: baseRaikkenTinder,
                    },
                  },
                },
                { quoted: info },
              );
            } catch (error) {
              console.error("Erro em meutinder:", error);
              const errorMessage =
                error.response?.data?.message ||
                "Ocorreu um pequeno problema, tente novamente mais tarde.";
              reply(detectTinder(errorMessage));
            }
          }
          break;

        case "teste":
          try {
            await subaru.sendMessage(from, { text: "Hello World", ai: true });
          } catch (e) {
            console.log(e);
          }
          break;

        case "sairtinder":
        case "rmtinder":
          {
            if (!isGroup) return reply("Só pode ser usado em grupos");

            let userToDelete = sender;
            if (command === "rmtinder") {
              if (!isDono)
                return reply("Somente o dono pode usar este comando.");
              if (!q && !alvo)
                return reply(
                  "Marque ou informe o número do usuário a ser removido.",
                );
              userToDelete = alvo ? alvo[0] : identifyAtSign(q);
            }

            try {
              const response = await axios.get(
                `${baseRaikkenTinder}/delete?usu=${userToDelete}`,
              );
              reply(detectTinder(response.data.message));
            } catch (error) {
              console.error("Erro ao deletar usuário:", error);
              const errorMessage =
                error.response?.data?.message ||
                "Ocorreu um pequeno erro, tente novamente mais tarde.";
              reply(errorMessage);
            }
          }
          break;

        case "like":
          {
            if (!q)
              return reply(
                "Responda à mensagem do perfil ou use o comando com o @ do usuário que deseja curtir.",
              );
            const alvo = q.includes("@s.whatsapp.net")
              ? q
              : identifyAtSign(q.replace("@", ""));

            try {
              const response = await axios.get(
                `${baseRaikkenTinder}/like?usu=${sender}&alvo=${alvo}`,
              );
              const data = response.data;

              if (data.success) {
                if (data.message.includes("Match")) {
                  await subaru.sendMessage(
                    sender,
                    {
                      text: `💘 *É UM MATCH!* 💘\n${data.message}`,
                      contextInfo: {
                        mentionedJid: [sender, alvo],
                        externalAdReply: {
                          title: "Raikken-API's Tinder",
                          body: "😌🌟 Vocês se curtiram mutuamente!",
                          thumbnail: await getBuffer(
                            "https://i.imgur.com/3G5K5rG.png",
                          ),
                          mediaType: 1,
                          sourceUrl: baseRaikkenTinder,
                        },
                      },
                    },
                    { quoted: info },
                  );

                  try {
                    const perfilMatchResponse = await axios.get(
                      `${baseRaikkenTinder}/perfil?usu=${alvo}`,
                    );
                    if (
                      perfilMatchResponse.data &&
                      perfilMatchResponse.data.dados
                    ) {
                      const matchUser = perfilMatchResponse.data.dados[0];
                      const matchInfo =
                        `*🔥 PERFIL DO SEU MATCH: ${matchUser.nome} 🔥*\n\n` +
                        `• Idade: ${matchUser.idade}\n` +
                        `• Gênero: ${matchUser.gene}\n` +
                        `• Bio: ${matchUser.bio}\n\n` +
                        `Iniciem uma conversa! wa.me/${matchUser.nmr[0]}`;
                      await subaru.sendMessage(from, {
                        image: { url: matchUser.foto },
                        caption: matchInfo,
                      });
                    }
                  } catch (matchError) {
                    console.error(
                      "Erro ao buscar perfil do match:",
                      matchError,
                    );
                    reply(
                      "Deu match, mas não consegui buscar o perfil do outro usuário.",
                    );
                  }
                } else {
                  reply(data.message);
                }
              } else {
                reply(data.message || "Ocorreu um erro ao curtir o usuário.");
              }
            } catch (err) {
              console.error("Erro no comando like:", err);
              const errorMessage =
                err.response?.data?.message ||
                "Ocorreu um erro ao tentar curtir o usuário.";
              reply(errorMessage);
            }
          }
          break;

        case "dislike":
          {
            if (!q)
              return reply(
                "Use este comando respondendo a um perfil ou com o @ do usuário.",
              );

            const alvo = q.includes("@s.whatsapp.net")
              ? q
              : identifyAtSign(q.replace("@", ""));

            try {
              const response = await axios.get(
                `${baseRaikkenTinder}/dislike?usu=${sender}&alvo=${alvo}`,
              );
              reply(response.data.message || "Ação registrada.");
            } catch (err) {
              console.error("Erro no comando dislike:", err);
              const errorMessage =
                err.response?.data?.message ||
                "Ocorreu um erro ao registrar sua ação.";
              reply(errorMessage);
            }
          }
          break;

        case "stalkinsta":
          {
            if (!q) {
              return reply(
                `Cadê o usuário?\n\nExemplo de uso:\n${prefix}stalkinsta @raikkenapi`,
              );
            }
            react("🫟");
            try {
              let usuario = q.replace("@", "").trim();
              let url = `${baseRaikken}/api/stalk/insta?user=${usuario}&apikey=${RaikkenKey}`;
              let res = await fetch(url);
              let json = await res.json();
              if (!json.status) {
                return reply(`Perfil nao encontrado!`);
              }

              let perfil = json.resultado;
              let txt = `┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💖࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Usuário: *${perfil.username}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Nome: *${perfil.name}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Seguidores: *${perfil.followers}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Posts: *${perfil.uploads}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Engajamento: *${perfil.engagement}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Link: ${perfil.profileUrl}
┃──────────────
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ Bio:
┃ ${perfil.bio || "—"}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💖࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;

              await subaru.sendMessage(
                from,
                { image: { url: perfil.avatar }, caption: txt },
                { quoted: info },
              );
            } catch (e) {
              console.error(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "stalkttk":
          {
            if (!q) {
              return reply(
                `Qual o usuário?\n\nExemplo de uso:\n${prefix}stalkttk _doofy.sz`,
              );
            }
            react("🫟");
            try {
              let usuario = q.replace("@", "").trim();
              let url = `${baseRaikken}/api/stalktiktok?username=${usuario}&apikey=${RaikkenKey}`;
              let res = await fetch(url);
              let json = await res.json();
              if (!json.sucesso && !json.resultado?.status) {
                returnreply(`> ┃ ❌ *Perfil não encontrado.*`);
              }

              let perfil = json.resultado;
              let txt = `┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫📱࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Usuário: *${perfil.username}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Seguidores: *${perfil.followers}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Seguindo: *${perfil.following}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Curtidas: *${perfil.likes}*
┃──────────────
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Link: https://tiktok.com/@${perfil.username}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫📱࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;
              await subaru.sendMessage(
                from,
                {
                  image: { url: perfil.avatar || defaultAvatar },
                  caption: txt,
                },
                { quoted: info },
              );
            } catch (e) {
              console.error(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "stalkyt":
          {
            if (!q) {
              return reply(
                `Qual o usuário?\n\nExemplo de uso:\n${prefix}stalkyt lilgiela33`,
              );
            }
            react("🫟");
            try {
              let usuario = q.replace("@", "").trim();
              let url = `${baseRaikken}/api/stalk/yt?username=${usuario}&apikey=${RaikkenKey}`;
              let res = await fetch(url);
              let json = await res.json();

              if (!json.sucesso || !json.resultado) {
                return reply(`> ┃ ❌ *Canal não encontrado.*`);
              }

              let canal = json.resultado;
              let txt = `┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫▶️࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Canal: *${canal.name}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Username: *${canal.username}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Inscritos: *${canal.subscribers || "Oculto"}*
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Link: ${canal.url}
┃──────────────
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Descrição:
┃ ${canal.description || "—"}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫▶️࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;

              await subaru.sendMessage(
                from,
                { image: { url: canal.image || defaultAvatar }, caption: txt },
                { quoted: info },
              );
              if (canal.banner) {
                await subaru.sendMessage(
                  from,
                  {
                    image: { url: canal.banner },
                    caption: `🎨 Banner do canal *${canal.name}*`,
                  },
                  { quoted: info },
                );
              }
              if (canal.videos && canal.videos.length > 0) {
                let ultimos = canal.videos.slice(0, 3).join("\n");
                await subaru.sendMessage(
                  from,
                  { text: `📺 Últimos vídeos:\n${ultimos}` },
                  { quoted: info },
                );
              }
            } catch (e) {
              console.error(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        case "stalkff":
          {
            react("🫟");
            if (!q) return reply("❌ Informe o *ID do jogador*!");
            try {
              let res = await fetch(
                `${baseRaikken}/api/stalk/perfil-ff?id=${q}&apikey=${RaikkenKey}`,
              );
              let json = await res.json();

              if (!json.status)
                return reply("❌ Não encontrei nada com esse ID!");

              let r = json.resultado;
              let texto = `
┏╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🎮⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┓
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Nome: ${r.name}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪ID: ${r.id}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Level: ${r.level}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Guilda: ${r.guilda || "Nenhuma"}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Nível da Guilda: ${r.nivel_guilda || "-"}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Região: ${r.regiao}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Criado em: ${r.criado_em}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Último login: ${r.ultimo_login}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Passe Booyah: ${r.passe_booyah}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Bio: ${r.bio || "Nenhuma"}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞✿𖥔࣪Atualizado em: ${r.atualizado_em}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💀࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ═╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🔥⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ═╼┛`;

              await subaru.sendMessage(
                from,
                { image: { url: defaultAvatar }, caption: texto.trim() },
                { quoted: info },
              );
            } catch (e) {
              console.error(e);
              botSemKey(subaru, grupoName, comando);
            }
          }
          break;

        default:
          if (isCmd) {
            try {
              setTimeout(() => {
                react("🔴");
              }, 1000);
              let AB = similarityCmd(command);
              let notcmd = privateCmd(
                sender,
                prefix + command,
                AB[0].comando,
                AB[0].porcentagem,
              );
              mention(notcmd, groupMemb2);
            } catch (e) {
              console.log(e);
            }
          }
      }
    } catch (error) {
      console.error(`Erro ao processar o comando '${command}':`, error);
      if (!botSemKey(subaru, grupoName, comando)) return;
    }
  } // aqui fecha o else
}; //CUIDADO, AQUI FECHA A FUNÇÃO !!

export { handleCmds };

fs.watchFile(__filename, () => {
  console.log(`Arquivo '${__filename}' foi modificado. Reiniciando...`);
  process.exit();
});
