import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../../../dono/config/session');

export async function createEngine(settings = {}) {
  const engine = String(settings.engine || 'baileys').toLowerCase();
  if (engine === 'zapo') return createZapoEngine(settings);
  return createBaileysEngine(settings);
}

async function createBaileysEngine(settings) {
  const {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
  } = await import('@whiskeysockets/baileys');

  const pino = (await import('pino')).default;
  const logger = pino({ level: 'silent' });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.type = 'baileys';
  return sock;
}

async function createZapoEngine(settings) {
  const { WaClient } = await import('zapo-js');
  const client = new WaClient({ session: AUTH_DIR });
  await client.connect();
  return createZapoSocketAdapter(client);
}

function createZapoSocketAdapter(client) {
  const ev = new EventEmitter();

  client.on('message', (msg) => {
    ev.emit('messages.upsert', {
      messages: [toBaileysMessage(msg)],
      type: 'notify',
    });
  });

  client.on('connection', (state) => {
    ev.emit('connection.update', {
      connection:
        state === 'open' ? 'open' : state === 'connecting' ? 'connecting' : 'close',
    });
  });

  const sock = {
    ev,
    client,
    type: 'zapo',
    get user() { return client.user ?? null; },

    async sendMessage(jid, content = {}, options = {}) {
      return sendViaZapo(client, jid, content, options);
    },

    async relayMessage(jid, message, options = {}) {
      return sock.sendMessage(jid, message, options);
    },

    async groupMetadata(jid) {
      return toBaileysGroupMetadata(await client.group.getMetadata(jid));
    },

    async groupParticipantsUpdate(jid, participants, action) {
      const fn = { add: 'add', remove: 'remove', promote: 'promote', demote: 'demote' }[action];
      if (!fn) throw new Error(`Ação de grupo inválida: ${action}`);
      return client.group[fn](jid, participants);
    },

    async groupSettingUpdate(jid, setting) {
      const map = {
        announcement: ['announcement', true],
        not_announcement: ['announcement', false],
        locked: ['locked', true],
        unlocked: ['locked', false],
      };
      const [key, value] = map[setting] ?? [];
      if (!key) throw new Error(`Setting inválido: ${setting}`);
      return client.group.updateSetting(jid, key, value);
    },

    async groupUpdateSubject(jid, subject) {
      return client.group.updateSubject(jid, subject);
    },

    async groupInviteCode(jid) {
      return client.group.getInviteCode(jid);
    },

    async updateBlockStatus(jid, action) {
      return action === 'block'
        ? client.contact.block(jid)
        : client.contact.unblock(jid);
    },

    async sendPresenceUpdate(type, jid) {
      return client.presence.send(type, jid);
    },

    async profilePictureUrl(jid, type = 'preview') {
      return client.contact.getProfilePicture(jid, type);
    },

    async readMessages(keys) {
      return client.message.markAsRead(keys.map((k) => k.id));
    },
  };

  return sock;
}

async function sendViaZapo(client, jid, content, options) {
  const opts = resolveSendOptions(options);

  if (typeof content === 'string' || content?.text) {
    const text = typeof content === 'string' ? content : content.text;
    const r = await client.message.send(jid, { text }, opts);
    return attachBaileysKey(jid, r);
  }

  if (content?.react) {
    const r = await client.message.react(jid, content.react.key.id, content.react.text);
    return attachBaileysKey(jid, r);
  }

  const media = pickMedia(content);
  if (media) {
    const r = await client.message.send(jid, media, opts);
    return attachBaileysKey(jid, r);
  }

  const r = await client.message.send(jid, { text: JSON.stringify(content) }, opts);
  return attachBaileysKey(jid, r);
}

function pickMedia(c = {}) {
  if (c.image)    return { image: c.image, caption: c.caption, mimetype: c.mimetype };
  if (c.video)    return { video: c.video, caption: c.caption, mimetype: c.mimetype };
  if (c.audio)    return { audio: c.audio, mimetype: c.mimetype, ptt: c.ptt };
  if (c.document) return { document: c.document, fileName: c.fileName, mimetype: c.mimetype };
  if (c.sticker)  return { sticker: c.sticker };
  return null;
}

function resolveSendOptions(o = {}) {
  const out = {};
  if (o.quoted)   out.quote    = o.quoted;
  if (o.mentions) out.mentions = o.mentions;
  return out;
}

function attachBaileysKey(jid, result) {
  if (!result || typeof result !== 'object') return result;
  return { ...result, key: { remoteJid: jid, fromMe: true, id: result.id } };
}

function toBaileysMessage(m) {
  const message = {};
  if (m.type === 'text' || m.text)          message.conversation    = m.text ?? '';
  else if (m.type === 'image')              message.imageMessage    = { caption: m.caption, mimetype: m.mimetype };
  else if (m.type === 'video')              message.videoMessage    = { caption: m.caption, mimetype: m.mimetype };
  else if (m.type === 'audio')              message.audioMessage    = { mimetype: m.mimetype, ptt: m.ptt };
  else if (m.type === 'document')           message.documentMessage = { fileName: m.fileName, mimetype: m.mimetype };
  else if (m.type === 'sticker')            message.stickerMessage  = { mimetype: m.mimetype };

  return {
    key: {
      remoteJid: m.chatId ?? m.from,
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
  const adminOf = (p) => (p.isSuperAdmin ? 'superadmin' : p.isAdmin ? 'admin' : null);
  return {
    id: meta.jid,
    subject: meta.subject,
    owner: meta.owner,
    creation: meta.creation,
    participants: (meta.participants ?? []).map((p) => ({
      id: p.jid,
      admin: adminOf(p),
    })),
  };
}