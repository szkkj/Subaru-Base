// =================================================================
//                    ARQUIVO DE EXPORTAÇÃO                   
// =================================================================

// -------------------( MÓDULOS NODE E NPM )-------------------
const os = require("os");
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
const axios = require('axios');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const FormData = require("form-data");
//const cfonts = require('cfonts')
const util = require('util');
const NodeCache  = require('node-cache');
const timeZone = 'America/Sao_Paulo';

// -------------------( MÓDULOS DO PROJETO )-------------------
const { loadJSON,  saveJSON } = require('./functions.js')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('../database/outros/sticker/exif');
const { imageToWebp2, videoToWebp2, writeExifImg2, writeExifVid2 } = require('../database/outros/sticker/exif2');
const { RaikkenKey, baseRaikken, donoNmr } = require('./configs/settings.json')

// -------------------( CONSTS E CONFIGURAÇÕES )-------------------
function agora() { return moment().tz(timeZone)}

const mss = {
    espere: "⏳ Por favor, aguarde...",
    botadm: "🤖 Preciso ser administrador do grupo para fazer isso!",
    grupo: "❗ Este comando só pode ser usado em grupos!",
    adm: "👑 Este comando é exclusivo para administradores do grupo.",
    dono: "💀Esse comando é exclusivo para o meu dono.",
    apiErro: "😶‍🌫️ Por algum motivo, a Raikken-Api não retornou dados. Tente novamente, ou avise um adm de lá.",
    api: "⚡ Enquanto esperamos, que tal dar uma olhada na Raikken? Da uma olhadinha: https://raikken-api.speedhosting.cloud/ ",
    keySemReq: "Eita, vi aqui que sua Key não possui requests, da uma olhadinha nos planos: https://raikken-api.speedhosting.cloud/",
    erro: "Poxa, infelizmente deu erro. Tente novamente mais tarde"
};

async function botSemKey(subaru, from) {
try {
if (RaikkenKey === 'suakey' || RaikkenKey === 'raikken') { await subaru.sendMessage(`${donoNmr}@s.whatsapp.net`, { text: `Ei, alguém do grupo: _${from}_ tentou usar um comando que precisa da API, mas sua Apikey não foi configurada! Acesse a API *https://raikken-api.speedhosting.cloud/* e garanta já a sua Key!`}) 
await subaru.sendMessage(from, { text: `Infelizmente não posso executar comandos com API, pois a Key não foi configurada..`}) 
return false;}
const res = await fetch(`https://raikken-api.speedhosting.cloud/api/keyerrada?apikey=${RaikkenKey}`)
const data = await res.json()
if (data.status === "true") { 
return true;
} else {
await subaru.sendMessage(`${donoNmr}@s.whatsapp.net`, {text: `Deu erro em algum comando que precisa de API, veja seu status da Key: ${data.key}`})
await subaru.sendMessage(from, {text: "Infelizmente deu erro, avise o responsável pelo bot!"}) 
return false;
}} catch (e) {
console.log(e)
return false
}}

const sendPoll = (nagatoro, id, name = '', values = [], selectableCount = 1) => { 
return nagatoro.sendMessage(id, {poll: {name, values, selectableCount}, messageContextInfo: { messageSecret: randomBytes(32)}}, {id, options: {userJid: nagatoro?.user?.id}}).catch(() => {
return console.log(console.error);
});}

const getMembros = (participants) => {
admins = []
for (let i of participants) {
if(i.admin == null) admins.push(i.id)
}
return admins
}

function getAdmins(members) {
  return members.filter(m => m.admin !== null).map(m => m.id)
}

const takePath = path.join(__dirname,"..",  "database", "users", "take.json");
let rgtake;
try {
  rgtake = JSON.parse(fs.readFileSync(takePath, "utf-8"));
  if (!Array.isArray(rgtake)) rgtake = [];
} catch {
  rgtake = [];
}

// =====================EXPORTS =====================\\
module.exports = {
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
  botSemKey
};
