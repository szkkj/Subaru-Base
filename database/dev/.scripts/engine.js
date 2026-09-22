/*
 * Camada de abstração entre Baileys e Zapo que expõe uma interface
 * compatível com os plugins existentes do Subaru-Base. No modo Zapo,
 * traduz eventos e métodos (sendMessage, groupMetadata, ev.on, etc.)
 * para o formato esperado pelo bot, permitindo alternar entre engines
 * sem alterar nenhuma linha dos plugins.
 *
 * O SQLite persistente do Zapo é construído sobre o fork
 * @irithell-js/better-sqlite3-termux, com cache local em
 * database/dev/.scripts/.sqlite3_engines/ para evitar recompilações
 * desnecessárias no Termux (Android).
 *
 * @author: Sz — https://raikken.com.br
 */

import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { createRequire } from "module";
import LRU from "pixl-cache";
import crypto from "crypto";
import {
  getGroupMetadataSafe,
  groupMetadataCache,
  messageCache,
} from "../../../src/functions.js";

const __require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const session = path.resolve(__dirname, "../../../dono/configs/session");
const mUC = new LRU({ maxItems: 100, maxAge: 1800 }); // 30 min

let Database;
const cachePath = path.join(
  __dirname,
  "./.sqlite3_engines/544beecb/node_modules/better-sqlite3",
);
try {
  Database = __require(cachePath);
} catch {
  Database = __require("@irithell-js/better-sqlite3-termux");
}

export async function createEngine(settings = {}) {
  const engine = String(settings.engine || "baileys").toLowerCase();
  if (engine === "zapo") return createZapoEngine(settings);
  return createBaileysEngine(settings);
}

async function createBaileysEngine(settings) {
  const AUTH_DIR = path.join(session, "baileys");
  const {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason,
    isJidBroadcast,
    isJidStatusBroadcast,
    getContentType,
  } = await import("@whiskeysockets/baileys");

  const pino = (await import("pino")).default;
  const logger = pino({ level: "silent" });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  //  const { version } = await fetchLatestBaileysVersion();
  const isJidNewsletter = (jid) => jid?.endsWith("@newsletter");

  const sock = makeWASocket({
    version: [2, 3000, 1044006379],
    logger,
    auth: state,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    keepAliveIntervalMs: 15_000,
    connectTimeoutMs: 20_000,
    keys: makeCacheableSignalKeyStore(state.keys, logger),
    groupMetadataCache,
    shouldIgnoreJid: (jid) =>
      isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid),
    getMessage: async (key) => {
      const msg = messageCache.get(key.id);
      if (msg?.message) return msg?.message;
      return { conversation: "" };
    },
  });

  sock.ev.on("creds.update", saveCreds);
  sock.type = "baileys";
  sock.authState = { ...state, saveCreds };
  return sock;
}

async function createZapoEngine(settings) {
  const { createStore, WaClient } = await import("zapo-js");
  const { createSqliteStore } = await import("@zapo-js/store-sqlite");
  const AUTH_DIR = path.join(session, "zapo");

  const pino = (await import("pino")).default;
  const logger = pino({ level: "silent" });

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const dbPath = path.join(AUTH_DIR, "state.sqlite");
  const connection = createBetterSqliteConnection(dbPath);

  const store = createStore({
    backends: {
      sqlite: createSqliteStore({ connection }),
    },
    providers: {
      auth: "sqlite",
      signal: "sqlite",
      preKey: "sqlite",
      session: "sqlite",
      identity: "sqlite",
      senderKey: "sqlite",
      appState: "sqlite",
      privacyToken: "sqlite",
      messages: "none",
      threads: "none",
      contacts: "none",
    },
  });

  const client = new WaClient(
    {
      store,
      sessionId: "default",
      connectTimeoutMs: 15_000,
      nodeQueryTimeoutMs: 30_000,
    },
    logger,
  );

  const sock = createZapoSocketAdapter(client);
  sock.start = () => client.connect();

  return sock;
}

function createBetterSqliteConnection(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  const connection = {
    driver: "better-sqlite3",

    exec(sql) {
      return db.exec(sql);
    },

    run(sql, params) {
      return db.prepare(sql).run(...(params || []));
    },

    get(sql, params) {
      return db.prepare(sql).get(...(params || []));
    },

    all(sql, params) {
      return db.prepare(sql).all(...(params || []));
    },

    async runInTransaction(callback) {
      const tx = db.transaction(() => callback(connection));
      return tx();
    },

    flush() {
      try {
        db.pragma("wal_checkpoint(PASSIVE)");
      } catch {}
      return undefined;
    },

    close() {
      if (db.open) {
        try {
          db.pragma("wal_checkpoint(TRUNCATE)");
        } catch {}
        db.close();
      }
    },
  };

  return connection;
}

function createZapoSocketAdapter(client) {
  const ev = new EventEmitter();

  client.on("message", (msg) => {
    const jid = msg.key?.remoteJid || msg.chatId || msg.from;
    if (!jid) return;
    if (jid.endsWith("@newsletter")) return;
    if (jid === "status@broadcast") return;

    const baileysMsg =
      msg.key && msg.message
        ? {
            key: msg.key,
            message: msg.message,
            pushName: msg.pushName,
            messageTimestamp:
              msg.timestampSeconds || Math.floor(Date.now() / 1000),
          }
        : toBaileysMessage(msg);

    ev.emit("messages.upsert", {
      messages: [baileysMsg],
      type: "notify",
    });
  });

  client.on("auth_qr", async ({ qr } = {}) => {
    if (process.argv.includes("--code")) {
      if (global.__pairingRequested) return;
      global.__pairingRequested = true;

      const number = global.__pairingNumber;
      if (!number) {
        console.error("❌ Número não capturado. Rode com --code.");
        return;
      }

      try {
        await client.auth.requestPairingCode(number, true);
      } catch (err) {
        console.error("❌ Erro ao pedir pairing code:", err?.message || err);
        global.__pairingRequested = false;
      }
      return;
    }

    if (qr) ev.emit("connection.update", { qr });
  });

  client.on("auth_qr", ({ qr }) => {
    if (process.argv.includes("--code")) return;
    ev.emit("connection.update", { qr });
  });

  client.on("auth_pairing_code", ({ code }) => {
    const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(`\n✅ Código de pareamento: ${formatted}\n`);
  });

  client.on("auth_paired", ({ credentials }) => {
    console.log("✅ Pareado como", credentials?.meJid || credentials?.me?.id);
  });

  client.on("connection", (event) => {
    ev.emit("connection.update", {
      connection:
        event.status === "open"
          ? "open"
          : event.status === "close"
            ? "close"
            : "connecting",
      lastDisconnect: event.error
        ? { error: { output: { statusCode: event.isLogout ? 401 : 500 } } }
        : undefined,
    });
  });

  client.on("group", (event) => {
    const jid = event.groupJid;
    if (!jid) return;

    const invalidatesAdmins = [
      "add",
      "remove",
      "promote",
      "demote",
      "linked_group_promote",
      "linked_group_demote",
    ];
    if (invalidatesAdmins.includes(event.action)) {
      if (typeof groupMetadataCache.delete === "function")
        groupMetadataCache.delete(jid);
      else if (typeof groupMetadataCache.del === "function")
        groupMetadataCache.del(jid);
    }

    if (["add", "remove", "promote", "demote"].includes(event.action)) {
      const participants = (event.participants || [])
        .map((p) => p.jid || p.lidJid || p.phoneJid)
        .filter(Boolean);
      if (participants.length) {
        ev.emit("group-participants.update", {
          id: jid,
          author: event.authorJid,
          participants,
          action: event.action,
        });
      }
    }
  });

  const sock = {
    ev,
    client,
    type: "zapo",
    get user() {
      const creds = client.auth.getCurrentCredentials();
      if (!creds?.meJid) return null;
      return {
        id: creds.meJid,
        lid: creds.meLid,
      };
    },

    async sendMessage(jid, content = {}, options = {}) {
      return sendViaZapo(client, jid, content, options);
    },

    async relayMessage(jid, message, options = {}) {
      return sock.sendMessage(jid, message, options);
    },

    async groupMetadata(jid) {
      return toBaileysGroupMetadata(await client.group.queryGroupMetadata(jid));
    },

    async groupParticipantsUpdate(jid, participants, action) {
      const fnMap = {
        add: "addParticipants",
        remove: "removeParticipants",
        promote: "promoteParticipants",
        demote: "demoteParticipants",
      };
      const fn = fnMap[action];
      if (!fn) throw new Error(`Ação de grupo inválida: ${action}`);
      return client.group[fn](jid, participants);
    },

    async groupSettingUpdate(jid, setting) {
      const map = {
        announcement: ["announcement", true],
        not_announcement: ["announcement", false],
        locked: ["locked", true],
        unlocked: ["locked", false],
      };
      const entry = map[setting];
      if (!entry) throw new Error(`Setting inválido: ${setting}`);
      return client.group.updateSetting(jid, entry[0], entry[1]);
    },

    async groupUpdateSubject(jid, subject) {
      return client.group.updateSubject(jid, subject);
    },

    async groupInviteCode(jid) {
      return client.group.getInviteCode(jid);
    },

    async updateBlockStatus(jid, action) {
      return action === "block"
        ? client.contact.block(jid)
        : client.contact.unblock(jid);
    },

    async sendPresenceUpdate(type, jid) {
      return client.presence.send(type, jid);
    },

    async profilePictureUrl(jid, type = "preview") {
      return client.contact.getProfilePicture(jid, type);
    },

    async readMessages(keys) {
      return client.message.markAsRead(keys.map((k) => k.id));
    },
  };

  return sock;
}

async function fetchUrlMedia(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar mídia (${res.status}): ${url}`);
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim();
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

function extMimeFallback(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return EXT_MIME[ext];
  } catch {
    return undefined;
  }
}

async function sendViaZapo(client, jid, content, options) {
  const opts = resolveSendOptions(options);

  if (content.delete) {
    const r = await client.message.send(
      jid,
      { type: "revoke", target: content.delete },
      opts,
    );
    return attachBaileysKey(jid, r);
  }

  if (content.react) {
    const r = await client.message.send(
      jid,
      {
        type: "reaction",
        emoji: content.react.text,
        target: content.react.key,
      },
      opts,
    );
    return attachBaileysKey(jid, r);
  }

  if (typeof content === "string" || content.text) {
    const text = typeof content === "string" ? content : content.text;
    const r = await client.message.send(jid, { type: "text", text }, opts);
    return attachBaileysKey(jid, r);
  }

  const media = pickMedia(content);
  if (media) {
    const uploaded = await getOrUploadZapoMedia(client, media);
    const field = {
      image: "imageMessage",
      video: "videoMessage",
      audio: "audioMessage",
      document: "documentMessage",
      sticker: "stickerMessage",
    }[media.type];

    const r = await client.message.send(
      jid,
      {
        [field]: {
          url: uploaded.url,
          directPath: uploaded.directPath,
          mediaKey: uploaded.mediaKey,
          fileSha256: uploaded.fileSha256,
          fileEncSha256: uploaded.fileEncSha256,
          fileLength: uploaded.fileLength,
          mediaKeyTimestamp: uploaded.mediaKeyTimestamp,
          mimetype: uploaded.mimetype,
          caption: media.caption,
          fileName: media.fileName,
          ptt: content.ptt,
          gifPlayback: content.gifPlayback,
        },
      },
      opts,
    );
    return attachBaileysKey(jid, r);
  }

  const r = await client.message.send(jid, content, opts);
  return attachBaileysKey(jid, r);
}

function sniffMimetype(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return undefined;
  const b = buffer;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b.slice(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  if (b.length >= 8 && b.slice(4, 8).toString("ascii") === "ftyp")
    return "video/mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3)
    return "video/webm";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46)
    return "application/pdf";
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return "audio/mpeg";
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (b.slice(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  return undefined;
}

async function getOrUploadZapoMedia(client, media) {
  const {
    type,
    media: source,
    mimetype: explicitMimetype,
    gifPlayback,
    ptt,
  } = media;
  const isUrlSource =
    typeof source === "object" && !Buffer.isBuffer(source) && source?.url;

  let cacheKey = null;
  if (isUrlSource) {
    cacheKey = source.url;
  } else if (Buffer.isBuffer(source)) {
    cacheKey =
      "buf:" + crypto.createHash("sha256").update(source).digest("hex");
  }

  if (cacheKey && mUC.has(cacheKey)) {
    return mUC.get(cacheKey);
  }

  let buffer = source;
  let mimetype = explicitMimetype;

  if (isUrlSource) {
    const { buffer: fetched, contentType } = await fetchUrlMedia(source.url);
    buffer = fetched;
    mimetype = mimetype || contentType || extMimeFallback(source.url);
  }

  if (!mimetype) mimetype = sniffMimetype(buffer);
  if (!mimetype) {
    throw new Error(
      `Não foi possível determinar o mimetype da mídia (tipo: ${type}). Passe "mimetype" explicitamente no content.`,
    );
  }

  const uploadType =
    type === "video" && gifPlayback
      ? "gif"
      : type === "audio" && ptt
        ? "ptt"
        : type;
  const uploaded = await client.message.upload(buffer, {
    type: uploadType,
    mimetype,
  });

  if (cacheKey) mUC.set(cacheKey, uploaded);
  return uploaded;
}

function pickMedia(c = {}) {
  if (c.image)
    return {
      type: "image",
      media: c.image,
      caption: c.caption,
      mimetype: c.mimetype,
    };
  if (c.video)
    return {
      type: "video",
      media: c.video,
      caption: c.caption,
      mimetype: c.mimetype,
    };
  if (c.audio)
    return { type: "audio", media: c.audio, mimetype: c.mimetype, ptt: c.ptt };
  if (c.document)
    return {
      type: "document",
      media: c.document,
      fileName: c.fileName,
      mimetype: c.mimetype,
    };
  if (c.sticker) return { type: "sticker", media: c.sticker };
  return null;
}

function sanitizeQuoted(quoted) {
  if (!quoted) return quoted;
  const sanitized = { ...quoted };
  if (sanitized.remoteJid === null) sanitized.remoteJid = undefined;
  if (sanitized.key) {
    sanitized.key = { ...sanitized.key };
    if (sanitized.key.remoteJid === null) sanitized.key.remoteJid = undefined;
  }
  return sanitized;
}

function resolveSendOptions(o = {}) {
  const out = {};
  if (o.quoted) out.quote = sanitizeQuoted(o.quoted);
  if (o.mentions) out.mentions = o.mentions;
  return out;
}

function attachBaileysKey(jid, result) {
  if (!result || typeof result !== "object") return result;
  return { ...result, key: { remoteJid: jid, fromMe: true, id: result.id } };
}

function toBaileysMessage(m) {
  const jid = m.chatId || m.from || m.remoteJid || "";
  const message = {};
  if (m.type === "text" || m.text) message.conversation = m.text || "";
  else if (m.type === "image")
    message.imageMessage = { caption: m.caption, mimetype: m.mimetype };
  else if (m.type === "video")
    message.videoMessage = { caption: m.caption, mimetype: m.mimetype };
  else if (m.type === "audio")
    message.audioMessage = { mimetype: m.mimetype, ptt: m.ptt };
  else if (m.type === "document")
    message.documentMessage = { fileName: m.fileName, mimetype: m.mimetype };
  else if (m.type === "sticker")
    message.stickerMessage = { mimetype: m.mimetype };

  return {
    key: {
      remoteJid: jid,
      fromMe: !!m.fromMe,
      id: m.id,
      participant: m.senderId,
    },
    message,
    pushName: m.senderName,
    messageTimestamp: Math.floor(Date.now() / 1000),
    raw: m,
  };
}

function toBaileysGroupMetadata(meta) {
  const adminOf = (p) =>
    p.isSuperAdmin ? "superadmin" : p.isAdmin ? "admin" : null;
  return {
    id: meta.jid,
    subject: meta.subject,
    owner: meta.owner,
    creation: meta.creation,
    participants: (meta.participants || []).map((p) => ({
      id: p.jid,
      jid: p.jid,
      lid: p.lid,
      phoneNumber: p.phoneNumber,
      admin: adminOf(p),
    })),
  };
}

export async function prepareMediaHeader(
  sock,
  buffer,
  { type = "video", mimetype, gifPlayback = false } = {},
) {
  if (sock.type === "baileys") {
    const { prepareWAMessageMedia } = await import("@whiskeysockets/baileys");
    return prepareWAMessageMedia(
      { [type]: buffer, ...(type === "video" ? { gifPlayback } : {}) },
      { upload: sock.waUploadToServer },
    );
  }

  if (sock.type === "zapo") {
    const media = await sock.client.message.upload(buffer, { type, mimetype });
    return {
      [`${type}Message`]: {
        url: media.url,
        directPath: media.directPath,
        mediaKey: media.mediaKey,
        fileSha256: media.fileSha256,
        fileEncSha256: media.fileEncSha256,
        fileLength: media.fileLength,
        mediaKeyTimestamp: media.mediaKeyTimestamp,
        mimetype: media.mimetype,
        ...(type === "video" ? { gifPlayback } : {}),
      },
    };
  }

  throw new Error(`Engine "${sock.type}" não suporta header de mídia ainda`);
}
