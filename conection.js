import * as baileysPkg from "@whiskeysockets/baileys";
import { cacheService } from "./database/dev/cacheService.js";
import fs from "fs";
import pino from "pino";
import chalk from "chalk";
import path from "path";
import readline from "readline";
import LRU from "pixl-cache";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import qrcode from "qrcode-terminal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidStatusBroadcast,
  getContentType,
  makeCacheableSignalKeyStore,
} = baileysPkg;

import LoggerBPkg from "@whiskeysockets/baileys/lib/Utils/logger.js";
const LoggerB = LoggerBPkg.default || LoggerBPkg;
const logger = LoggerB.child({});
logger.level = "fatal";

import {
  escolherPersonalidadeSubaru,
  escolherVideoPorRota,
  getFileBuffer,
  checkPrefix,
  fetchJson,
  getBuffer,
  data,
  hora,
  esperar,
  groupConfigCache,
  getRandomSaudacao,
} from "./dono/functions.js";
import { handleCmds } from "./index.js";

const {
  prefix,
  botName,
  donoName,
  donoNmr,
  idCanal,
  pairKey,
  logsCvs,
} = require("./dono/configs/settings.json");

console.info = (...a) =>
  String(a[0]).includes("session") || console._info?.(...a);

const pk = pairKey.toUpperCase();
const groupMetadataCache = new LRU({
  maxItems: 50,
  maxAge: 300,
});
const messageQueue = [];
let processingQueue = false;
const messageCache = new LRU({ maxItems: 200, maxAge: 600 });
let fotoperfil = fs.readFileSync("./database/imgs/perfil.jpeg");
const well = fs.readFileSync("./database/imgs/well.png");

async function getGroupMetadataSafe(groupId, subaru) {
  if (groupMetadataCache.has(groupId)) {
    return groupMetadataCache.get(groupId);
  }
  if (!groupId.endsWith("@g.us")) {
    return null;
  }
  try {
    const meta = await subaru.groupMetadata(groupId);
    groupMetadataCache.set(groupId, meta);
    cacheService.saveGroupMetadata(groupId, meta);
    return meta;
  } catch (e) {
    console.error(`Erro ao buscar metadata do grupo ${groupId}:`, e);
    return { subject: "Grupo Desconhecido", participants: [] };
  }
}

function getGroupConfig(id) {
  const cached = groupConfigCache.get(id);
  if (cached) return cached;
  if (!fs.existsSync(`./database/grupos/${id}.json`)) return null;
  const config = JSON.parse(fs.readFileSync(`./database/grupos/${id}.json`));
  groupConfigCache.set(id, config);
  return config;
}

function delay(min = 50, max = 800) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const startConnection = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(
    "./dono/configs/session",
  );
  const isJidNewsletter = (jid) => jid?.endsWith("@newsletter");
//  const { version } = await fetchLatestBaileysVersion();
  const subaru = makeWASocket({
    version: [2, 3000, 1035194821],
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

  if (process.argv.includes("--code") && !subaru.authState.creds.registered) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const question = (text) =>
      new Promise((resolve) => rl.question(text, resolve));
    process.stdout.write("Insira o número de telefone para conectar: ");
    const phoneNumber_raw = await new Promise((resolve) =>
      rl.once("line", resolve),
    );
    let phoneNumber = phoneNumber_raw.replace(/\D/g, "");
    const code = await subaru.requestPairingCode(phoneNumber, pk);
    process.stdout.write(
      `Seu código de pareamento: ${code?.match(/.{1,4}/g)?.join("-") || code}\n`,
    );
    rl.close();
  }

  let isRestart = false;
  let reconnectAttempts = 0;
  subaru.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !process.argv.includes("--code")) {
      qrcode.generate(qr, { small: true });
      console.log("\n📱 Escaneie o QR code acima com o WhatsApp\n");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        `Conexão fechada. Motivo: ${lastDisconnect.error?.output?.statusCode}.`,
      );
      console.log(`Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) {
        isRestart = true;
        const reconnectDelay = Math.min(1000 * 2 ** reconnectAttempts, 60000);
        reconnectAttempts++;
        console.log(
          `Reconectando em ${reconnectDelay / 1000}s... (tentativa ${reconnectAttempts})`,
        );
        setTimeout(() => startConnection(), reconnectDelay);
      } else {
        reconnectAttempts = 0;
      }
    } else if (connection === "open") {
      if (!isRestart) {
        await esperar(500);
        await subaru.updateProfilePicture(subaru.user.id, fotoperfil);
        await esperar(500);
        const saudacao = getRandomSaudacao(donoName, prefix);
        await subaru.sendMessage(`${donoNmr}@s.whatsapp.net`, {
          text: saudacao,
        });
      }
      console.log(chalk.blueBright("\nSubaru-Bot ativo!\n"));
    }
  });

  subaru.ev.on("creds.update", saveCreds);
  subaru.ev.on("chats.set", () => console.log("✔️ Conversas carregadas."));
  subaru.ev.on("contacts.set", () => console.log("✔️ Contatos carregados."));

  subaru.ev.on("messages.upsert", async ({ messages, type }) => {
    const msg = messages[0];
    if (msg?.key?.id) messageCache.set(msg.key.id, msg);
    try {
      if (
        type !== "notify" ||
        !msg.message ||
        msg.key.remoteJid === "status@broadcast"
      )
        return;
      if (!msg.message) return;
      if (msg?.WebMessageInfo) return;

      const info = msg;
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
        "";
      const from =
        msg.key.remoteJid || msg.key.remoteLid || msg.key.participantAlt;
      const isGroup = from.endsWith("@g.us");
      const isCmd = body.startsWith(prefix);
      const sender =
        msg.key.participant ||
        msg.key.remoteJid ||
        msg.key.remoteLid ||
        msg.key.participantLid ||
        msg.key.participantAlt;
      const pushname = msg.pushName || "Usuário";
      const groupMetadata = isGroup
        ? await getGroupMetadataSafe(from, subaru)
        : {};
      const groupName = isGroup ? groupMetadata.subject : "Conversa Privada";
      const groupMembers = isGroup ? groupMetadata.participants : [];
      const senderObject = groupMembers.find(
        (member) =>
          member.jid === sender ||
          member.id === sender ||
          member.lid === sender,
      );
      let senderLid = senderObject ? senderObject.lid || senderObject.id : null;
      const cmd = isCmd
        ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
        : null;
      const horaAtual = new Date().toLocaleTimeString("pt-BR");
      let comando = cmd;

      if (
        msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage
          ?.paramsJson
      ) {
        try {
          const json = JSON.parse(
            msg.message.interactiveResponseMessage.nativeFlowResponseMessage
              .paramsJson,
          );
          let comandoInterativo = json.selectedRowId;
          if (comandoInterativo) comando = comandoInterativo;
        } catch (e) {
          console.error("Erro ao parsear paramsJson:", e);
        }
      }
      if (!comando && msg.message?.buttonsResponseMessage?.selectedButtonId) {
        comando = msg.message.buttonsResponseMessage.selectedButtonId;
      }
      if (
        !comando &&
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId
      ) {
        comando =
          msg.message.listResponseMessage.singleSelectReply.selectedRowId;
      }

      await handleCmds(subaru, msg);

      cacheService.saveGroupMetadata(from, groupMetadata);
      if (isCmd) {
        console.log(
          chalk.blueBright("\n╔══════╌✯╌═⊱×⊰ 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞 ⊰×⊰═╌✯╌══════╗") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.white.bold("[ COMANDO DETECTADO ]") +
            "\n" +
            chalk.blueBright("║") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Tipo: ") +
            chalk.greenBright(isGroup ? "Grupo" : "Privado") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Grupo: ") +
            chalk.yellowBright(groupName || "-") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Usuário: ") +
            chalk.yellowBright(
              `${pushname} (${sender.split("@")[0]}) (Lid: ${senderLid || "não veio"})`,
            ) +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Comando: ") +
            chalk.greenBright(cmd) +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Horário: ") +
            chalk.gray(horaAtual) +
            "\n" +
            chalk.blueBright("╚══════╌✯╌═⊱×⊰ 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞 ⊰×⊰═╌✯╌══════╝\n"),
        );
      } else if (body && logsCvs) {
        console.log(
          chalk.blueBright("\n╔══════╌✯╌═⊱×⊰ 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞 ⊰×⊰═╌✯╌══════╗") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.white.bold("[ MENSAGEM RECEBIDA ]") +
            "\n" +
            chalk.blueBright("║") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Tipo: ") +
            chalk.greenBright(isGroup ? "Grupo" : "Privado") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Grupo: ") +
            chalk.yellowBright(groupName || "-") +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Usuário: ") +
            chalk.yellowBright(
              `${pushname} (${sender.split("@")[0]}) (Lid: ${msg.key.participantLid || "nao veio"})`,
            ) +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Mensagem: ") +
            chalk.greenBright(body) +
            "\n" +
            chalk.blueBright("║★ ") +
            chalk.cyan("Horário: ") +
            chalk.gray(horaAtual) +
            "\n" +
            chalk.blueBright("╚══════╌✯╌═⊱×⊰ 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞 ⊰×⊰═╌✯╌══════╝\n"),
        );
      }
    } catch (err) {
      if (
        String(err).includes("SenderKeyRecord") ||
        String(err).includes("decrypt") ||
        String(err).includes("no session")
      ) {
        console.log(
          "⚠️ Mensagem não pôde ser decriptada (sem chave SenderKey), ignorando...",
        );
        return;
      }
      console.error("Erro inesperado:", err);
    }
  });

  subaru.ev.on("group-participants.update", async (update) => {
    const { id, action, participants } = update;
    const groupSettingsPath = `./database/grupos/${id}.json`;
    if (!fs.existsSync(groupSettingsPath)) return;
    const groupSettings = getGroupConfig(id);
    if (!groupSettings) return;
    const welcomeConfig = groupSettings[0]?.bemVindo?.[0];
    if (!welcomeConfig?.ativo) return;
    const groupMetadata = await getGroupMetadataSafe(id, subaru);
    const groupName = groupMetadata.subject;
    const member = participants[0];
    try {
      let wel = getBuffer(well);
      let textinh = "";
      if (action === "add" && welcomeConfig.entrou) {
        textinh = welcomeConfig.entrou
          .replace("%numero%", member.split("@")[0])
          .replace("%nomeGrupo%", groupName);
      } else if (action === "remove" && welcomeConfig.saiu) {
        textinh = welcomeConfig.saiu
          .replace("%numero%", member.split("@")[0])
          .replace("%nomeGrupo%", groupName);
      }
      if (textinh) {
        await subaru.sendMessage(id, {
          text: textinh,
          mentions: [member],
          contextInfo: {
            externalAdReply: {
              title: `Meu prefixo: ${prefix}`,
              body: "",
              previewType: "PHOTO",
              thumbnailUrl: wel,
              mediaType: 1,
              mediaUrl: "https://api.raikken.com.br/",
              sourceUrl: "https://api.raikken.com.br/",
            },
          },
        });
      }
    } catch (e) {
      console.error(
        `Erro no evento 'group-participants.update' para o grupo ${id}:`,
        e,
      );
      if (e?.data === 403) {
        console.log(
          `Bot foi removido do grupo ${id}. Excluindo arquivo de configuração.`,
        );
        fs.unlinkSync(groupSettingsPath);
      }
    }
    cacheService.saveGroupMetadata(update, groupMetadata);
  });

  return subaru;
};

fs.watchFile(__filename, () => {
  console.log(`Arquivo '${__filename}' foi modificado. Reiniciando...`);
  process.exit();
});

startConnection().catch((err) =>
  console.error("Erro fatal ao iniciar a conexão:", err),
);

export {
  startConnection,
  getGroupMetadataSafe,
  getGroupConfig,
  messageCache,
  groupMetadataCache,
};
