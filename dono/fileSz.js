import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { prefix, botName, donoName, donoNmr, RaikkenKey, baseRaikken} = require('./configs/settings.json',  { with: { type: 'json' } })

const selogpt = {key: {fromMe: false, participant: '0@s.whatsapp.net'}, message: { "extendedTextMessage": {"text": `Bot: ${botName}\nDono: ${donoName}`,"title": null,'thumbnailUrl': null}}}
//pedrozz Mods
const seloCriador = {"key": {"participant": "556199317165@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Pedrozz Mods", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Chat GPT;;;\nFN:Pedrozz Mods\nitem1.TEL;waid=556199317165:556199317165\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};
//ais
const seloGpt = {"key": {"participant": "18002428478@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Chat GPT", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Chat GPT;;;\nFN:Chat GPT\nitem1.TEL;waid=18002428478:18002428478\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};

//Pedrozz mods
const seloMeta = {"key": {"participant": "13135550002@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Meta IA", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Chat GPT;;;\nFN:Meta IA\nitem1.TEL;waid=13135550002:13135550002\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};

//Pedrozz mods
const seloLuzia = {"key": {"participant": "5511972553036@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "LuzIA", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Chat GPT;;;\nFN:LuzIA\nitem1.TEL;waid=5511972553036:5511972553036\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};

//Pedrozz mods
const seloLaura = {"key": {"participant": "556191969269@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Laura AI", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Laura AI;;;\nFN:Laura AI\nitem1.TEL;waid=556191969269:556191969269\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};

//Pedrozz Mods 
const seloCopilot = {"key": {"participant": "18772241042@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Microsoft Copilot", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Microsoft Copilot;;;\nFN:Microsoft Copilot\nitem1.TEL;waid=18772241042:18772241042\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};
//bancos
const seloNubank = {"key": {"participant": "551150390444@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Nubank", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Nubank;;;\nFN:Nubank\nitem1.TEL;waid=551150390444:551150390444\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};
const seloBb = {"key": {"participant": "556140040001@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Banco do Brasil", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Banco Do Brasil;;;\nFN:Banco do Brasil\nitem1.TEL;waid=556140040001:556140040001\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};
const seloBradesco = {"key": {"participant": "551133350237@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Bradesco", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Bradesco;;;\nFN:Bradesco\nitem1.TEL;waid=551133350237:551133350237\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};
const seloSantander = {"key": {"participant": "551140043535@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Santander", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Santander;;;\nFN:Santander\nitem1.TEL;waid=551140043535:551140043535\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};
const seloItau = {"key": {"participant": "551140044828@s.whatsapp.net","remoteJid": "status@broadcast", "fromMe": false,},"message": {
"contactMessage": {
"displayName": "Ita煤", "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Ita煤;;;\nFN:Ita煤\nitem1.TEL;waid=551140044828:551140044828\nitem1.X-ABLabel:Celular\nEND:VCARD`, "contextInfo": {"forwardingScore": 1,"isForwarded": true}}}};

const selodoc = { 
key : { fromMe: false, 
participant : '0@s.whatsapp.net'}, 
message: {documentMessage: {title: "Bem vindo", 
jpegThumbnail: null}}};

const pay = {
key: {
remoteJid: `5512997025014@s.whatsapp.net`, //se mudar para "@g.us", faz o zap cair. Default: 5512997025014@s.whatsapp.net
fromMe: false,
participant: "0@s.whatsapp.net",
},
message: {
paymentInviteMessage: {
serviceType: 1,
expiryTimestamp: 2,
amount1000: 50000, // Valor: 50.000 centavos = R$50,00
currencyCode: "BRL",
id: "3EB0D83F8A5A7D5FA0B7",
},
},
};

const seloSz = {//Lord//GojoDevs
"key": {
"participant": "0@s.whatsapp.net",
"remoteJid": "status@broadcast", 
"fromMe": false, 
},
"message": {
"contactMessage": {
"displayName": "𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞", 
"vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;SZ;;;\nFN:Chat GPT\nitem1.TEL;waid=559292678251:559292678251\nitem1.X-ABLabel:Celular\nEND:VCARD`, 
"contextInfo": {
"forwardingScore": 1000,
"isForwarded": true
}
}
}
};//Lord//GojoDevs
const seloface = {
  "key": {
  "participant": "447710173736@s.whatsapp.net",
  "remoteJid": "status@broadcast", 
  "fromMe": false, 
  },
  /* +559681361714 */
  "message": {
  "contactMessage": {
  "displayName": "Facebook", 
  "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;Facebook;;;\nFN:Facebook\nitem1.TEL;waid=447710173736:447710173736\nitem1.X-ABLabel:Celular\nEND:VCARD`, 
  "contextInfo": {
  "forwardingScore": 1, 
  "isForwarded": true  
  }}}};
  
  const seloluzia = {
  "key": {
  "participant": "5511972553036@s.whatsapp.net",
  "remoteJid": "status@broadcast", 
  "fromMe": false, 
  },
  /* +559681361714 */
  "message": {
  "contactMessage": {
  "displayName": "LuzIA", 
  "vcard": "BEGIN:VCARD\nVERSION:3.0\nN:;LuzIA;;;\nFN:LuzIA\nitem1.TEL;waid=5511972553036:5511972553036\nitem1.X-ABLabel:Celular\nEND:VCARD",
  "contextInfo": {
  "forwardingScore": 1, 
  "isForwarded": true  
  }}}};
  
  const seloloc = {
  "key": 
  {"fromMe": false,
"participant":
"0@s.whatsapp.net",
"remoteJid": 'status@broadcast'},
message: {liveLocationMessage: 
  {degreesLatitude: 173.282, 
degreesLongitude: -19.378,
sequenceNumber: "1657237469254001", 
thumbnail: null, 
caption: `Bem vindo`}}}

const seloSticker = {
key: {
fromMe: false,
participant: "0@s.whatsapp.net",
remoteJid: "status@broadcast"
},
message: {
stickerPackMessage: {
stickerPackId: "\u0000",
name: ` By ${donoName}.`,
publisher: "kkkk"
}
}
}

const spiral = (pushname, senderJid) => ({
"key": {
"participant": "0@s.whatsapp.net",
"remoteJid": "status@broadcast", 
"fromMe": false, 
},
"message": {
"contactMessage": {
"displayName": `${pushname}`, 
"vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;${pushname};;;\nFN:${pushname}\nitem1.TEL;waid=${senderJid.split('@')[0]}:${donoNmr}\nitem1.X-ABLabel:Celular\nEND:VCARD`, 
"contextInfo": {
"forwardingScore": 1000,
"isForwarded": true
}
}
}
})
export {  selogpt,  seloCriador, seloGpt,  seloMeta,  seloLuzia,  seloLaura,  seloCopilot,  seloNubank,  seloBb,  seloBradesco, seloSantander,  seloItau, selodoc, pay, seloSz,  seloface,  seloluzia, seloloc, seloSticker, spiral };