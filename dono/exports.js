// ───────────( MÓDULOS NODE E NPM )───────────
import os from "os";
import fs from "fs";
import path from "path";
import { exec, spawn } from "child_process";
import crypto from "crypto";
import axios from "axios";
import { default as _fetch } from "node-fetch";
import moment from "moment-timezone";
import FormData from "form-data";
import util from "util";
import NodeCache from "node-cache";
import LRU from "pixl-cache";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import fetch from "node-fetch";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ───────────( MÓDULOS DO PROJETO )───────────
import { loadJSON, saveJSON } from "./functions.js";
import {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
} from "../database/outros/sticker/exif.js";
import {
  imageToWebp as imageToWebp2,
  videoToWebp as videoToWebp2,
  writeExifImg as writeExifImg2,
  writeExifVid as writeExifVid2,
} from "../database/outros/sticker/exif2.js";

const { RaikkenKey, baseRaikken, donoNmr } = require("./configs/settings.json");

// -------------------( CONSTS E CONFIGURAÇÕES )-------------------
function agora() {
  return moment().tz(timeZone);
}

const mss = {
  espere: "⏳ Por favor, aguarde...",
  botadm: "🤖 Preciso ser administrador do grupo para fazer isso!",
  grupo: "❗ Este comando só pode ser usado em grupos!",
  adm: "👑 Este comando é exclusivo para administradores do grupo.",
  dono: "💀Esse comando é exclusivo para o meu dono.",
  apiErro:
    "😶‍🌫️ Por algum motivo, a Raikken-Api não retornou dados. Tente novamente, ou avise um adm de lá.",
  api: "⚡ Enquanto esperamos, que tal dar uma olhada na Raikken? Da uma olhadinha: https://api.raikken.com.br/ ",
  keySemReq:
    "Eita, vi aqui que sua Key não possui requests, da uma olhadinha nos planos: https://api.raikken.com.br/",
  erro: "Poxa, infelizmente deu erro. Tente novamente mais tarde",
};

async function botSemKey(subaru, grupoName, comando) {
  try {
    if (RaikkenKey === "suakey" || RaikkenKey === "raikkenv2") {
      await subaru.sendMessage(`${donoNmr}@s.whatsapp.net`, {
        text: `Ei, alguém do grupo: _${grupoName}_ tentou usar o comando: ${comando} que precisa da API, mas sua Apikey não foi configurada! Acesse a API *https://api.raikken.com.br* e garanta já a sua Key!`,
      });
      await subaru.sendMessage(from, {
        text: `Infelizmente não posso executar comandos com API, pois a Key não foi configurada..Já notifiquei o dono do bot pra ele resolver.`,
      });
      return false;
    }
    const res = await fetch(
      `https://api.raikken.com.br/api/keyerrada?apikey=${RaikkenKey}`,
    );
    const data = await res.json();
    if (data.status === "true") {
      return true;
    } else {
      await subaru.sendMessage(`${donoNmr}@s.whatsapp.net`, {
        text: `Deu erro em algum comando que precisa de API, veja seu status da Key: ${data.key}`,
      });
      await subaru.sendMessage(from, {
        text: "Infelizmente deu erro, avise o responsável pelo bot!",
      });
      return false;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
}

const sendPoll = (
  nagatoro,
  id,
  name = "",
  values = [],
  selectableCount = 1,
) => {
  return nagatoro
    .sendMessage(
      id,
      {
        poll: { name, values, selectableCount },
        messageContextInfo: { messageSecret: randomBytes(32) },
      },
      { id, options: { userJid: nagatoro?.user?.id } },
    )
    .catch(() => {
      return console.log(console.error);
    });
};

const getMembros = (participants) => {
  let admins = [];
  for (let i of participants) {
    if (i.admin == null) admins.push(i.id);
  }
  return admins;
};

function getAdmins(members) {
  return members.filter((m) => m.admin !== null).map((m) => m.id);
}

const takePath = path.join(__dirname, "..", "database", "users", "take.json");
let rgtake;
try {
  rgtake = JSON.parse(fs.readFileSync(takePath, "utf-8"));
  if (!Array.isArray(rgtake)) rgtake = [];
} catch {
  rgtake = [];
}

// =====================EXPORTS =====================\\
export {
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
  agora,
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
  loadJSON,
  saveJSON,
  rgtake,
  botSemKey,
  LRU,
};
