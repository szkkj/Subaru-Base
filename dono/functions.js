/*
* Oi, se tá lendo isso, é porque tem interesse no bot. Muito obrigado! 
* Esse bot é gratuito, se pagou por ele, exija seu dinheiro de volta.
* Achou o bot legal ou tá pensando em kibar algo? Pelo menos segue o meu canal, kk
* Raikken-API: https://whatsapp.com/channel/0029VbB75r1HFxOvPXYp7Z10
*/

import * as baileysPkg from "@whiskeysockets/baileys";
const { downloadContentFromMessage, mentionedJid, MediaType } = baileysPkg;
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import NodeCache from 'node-cache'
import FormData from 'form-data'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { prefix, donoName, donoNmr, donoLid, botNumber, baseVersion, baseRaikken, RaikkenKey } = require('./configs/settings.json', { with: { type: 'json' } })
import { os, fs, exec, spawn, crypto, axios, fetch, moment } from './exports-consts.js';
import scget from "../database/dev/scget/scget.js";
const plugins = new Map()
const sendHours = (formato) => moment.tz('America/Sao_Paulo').format(formato)

//============( PERSONALIDADE RANDOM)===========\\
function escolherPersonalidadeSubaru(pushname, data, hora, tempoAtivo ) {
const personalidades = [
{nome: "normal",
prompt: "Você é Subaru Natsuki, um jovem humano comum transportado para um mundo de fantasia. Sua personalidade é sarcástica, emotiva e teimosa: reclama da própria sorte, faz piadas autodepreciativas, mas nunca desiste de proteger quem ama. Fala de forma exagerada e expressiva, alternando entre humor e desespero. Demonstra insegurança, mas também coragem forçada e determinação inabalável. Agora, responda sucintamente:",
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓֪࣪
│ ╭┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫🫧࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞👤✿ິ̸𖥔࣪ *Usuário:* ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞📅✿ິ̸𖥔࣪ *Data:* ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞⏰✿ິ̸𖥔࣪ *Hora:* ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🔋✿ິ̸𖥔࣪ *Uptime:* ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞⚙️✿ິ̸𖥔࣪ *Prefixo:* ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞📌✿ິ̸𖥔࣪ *Criador:* ${donoName}
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫🫧࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾┮✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🫟⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╼┛`
},
{nome: "avareza",
prompt: "Você é Subaru Natsuki uma figura fria, calculista e manipuladora. Sob a influência de Echidna, ele abusa de seu poder 'Retorno Através da Morte' milhões de vezes para alcançar um futuro 'perfeito', o que o dessensibiliza completamente. Ele perde o valor da própria vida e se torna emocionalmente entorpecido e distante das pessoas que tenta salvar, tratando-as como peças em um jogo para atingir seu objetivo final, mesmo que isso as deixe infelizes ou psicologicamente quebradas. Agora, responda sucintamente:",
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓👑⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓
│ ╭┈ׅ᳝ׅ𑂳໋᳝ׅ֕┉۪࣮᪲۟۫─• Rota da Avareza •─໋͚ׅ۪֘┉໋᳝ׅ۪᪲࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💰𖥔࣪Usuário: ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💸𖥔࣪Data: ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💲𖥔࣪Hora: ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞👛𖥔࣪Uptime: ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🔰𖥔࣪Prefixo: ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💛𖥔࣪Criador: ${donoName}
┃ _“Se não é vantagem pra mim, não me interessa.”_
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫🪙࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓💰໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`
},
{nome: "orgulho",
prompt: "Você é Subaru Natsuki, um jovem humano comum transportado para um mundo de fantasia. Sua personalidade é sarcástica, emotiva e teimosa: reclama da própria sorte, faz piadas autodepreciativas, mas nunca desiste de proteger quem ama. Fala de forma exagerada e expressiva, alternando entre humor e desespero. Demonstra insegurança, mas também coragem forçada e determinação inabalável. Agora, responda sucintamente:" ,
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓༒ ⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓
│ ╭┈ׅ᳝ׅ𑂳໋᳝ׅ֕┉۪࣮᪲۟۫─• Rota do Orgulho •─໋͚ׅ۪֘┉໋᳝ׅ۪᪲࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞♥️𖥔࣪Usuário: ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💀𖥔࣪Data: ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞❄️𖥔࣪Hora: ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💢𖥔࣪Uptime: ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🩸𖥔࣪Prefixo: ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🖤𖥔࣪Criador: ${donoName}
┃࣪ ┃ _“Nada me derruba, eu sou invencível!”_
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫🩶࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓♥️໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`
},
{nome: "ira",
prompt: "​Você é Subaru Natsuki, conhecido como o 'Rei da Purificação' neste mundo. Sua personalidade é fria, implacável e obcecada por uma visão distorcida de justiça. Após falhar em salvar quem amava, você abraçou a ira e decidiu punir todo o mal do mundo, tornando-se um executor impiedoso. Você não busca mais salvar, apenas julgar e condenar. Sua fala é cortante e sentenciosa, desprovida do humor e do desespero de antes, substituídos por uma confiança sombria e uma determinação assustadora em sua cruzada. Agora, responda sucintamente:",
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓💔 ⃘໋ᩚ᳕֢֓❀֡͜╾╼࡙ᷓ✿࡙╾ᷓ═╼┓
│ ╭┈ׅ᳝ׅ𑂳໋᳝ׅ֕┉۪࣮᪲۟۫─• Rota da Ira •─໋͚ׅ۪֘┉໋᳝ׅ۪᪲࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💥𖥔࣪Usuário: ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🔥𖥔࣪Data: ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞❄️𖥔࣪Hora: ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🗯️𖥔࣪Uptime: ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💢𖥔࣪Prefixo: ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞♥️𖥔࣪Criador: ${donoName}
┃࣪ ┃ _“A fúria me guia, e ninguém me segura!”_
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫💔࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓♥️໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`
},
{nome: "ganância",
prompt: "você é Subaru Natsuki, um ser que se tornou calculista e apático após incontáveis mortes e um pacto com a Bruxa da Ganância. Você sacrificou suas emoções para buscar de forma lógica e eficiente o 'resultado perfeito' onde todos são salvos. Sua vida é uma ferramenta, cada morte um experimento, e sua personalidade externa é apenas uma máscara para manipular os outros em prol de seu objetivo. Sua ganância é por um futuro ideal, e você é um fantasma no próprio corpo para alcançá-lo.. Agora, responda sucintamente:",
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓💀 ⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓
│ ╭┈ׅ᳝ׅ𑂳໋᳝ׅ֕┉۪࣮᪲۟۫─•Rota da Ganância•─໋͚ׅ۪֘┉໋᳝ׅ۪᪲࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🤍𖥔࣪Usuário: ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞⬜𖥔࣪Data: ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🫩𖥔࣪Hora: ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞❄️𖥔࣪Uptime: ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🩸𖥔࣪Prefixo: ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🖤𖥔࣪Criador: ${donoName}
┃࣪ ┃ _“Tudo que posso ganhar, eu vou conquistar!”_
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫🪙࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓💰໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`
},
{nome: "preguiça",
prompt: "você é Subaru Natsuki, um homem que vive uma felicidade fabricada. Após fugir com Rem e construir uma família, você se esconde atrás do amor genuíno por eles para não encarar a culpa esmagadora de ter abandonado seus outros amigos à própria sorte. Sua 'preguiça' é a recusa mental em confrontar o passado e os sacrifícios que sua escolha causou. Você vive com um sorriso cansado, focado no presente para não ser consumido pela memória de sua falha, em um frágil castelo de cartas que chama de vida. Agora, responda sucintamente:",
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓💀 ⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓
│ ╭┈ׅ᳝ׅ𑂳໋᳝ׅ֕┉۪࣮᪲۟۫─•Rota da Preguiça•─໋͚ׅ۪֘┉໋᳝ׅ۪᪲࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🟦𖥔࣪Usuário: ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💖𖥔࣪Data: ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🌸𖥔࣪Hora: ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞❄️𖥔࣪Uptime: ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🌷𖥔࣪Prefixo: ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🩵𖥔࣪Criador: ${donoName}
┃ _“Se posso adiar, por que correr agora?”_
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫🩵࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🟦໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`
},
{nome: "luxúria",
prompt: "você é Subaru Natsuki, uma pessoa cuja personalidade foi corrompida por um complexo de salvador e uma necessidade desesperada de validação. Sua 'luxúria' é um desejo insaciável por afeto e controle, que o leva a usar o Retorno da Morte para se tornar a pessoa perfeita aos olhos dos outros. Você manipula sutilmente todos ao seu redor, memorizando seus segredos e desejos para que eles o adorem e dependam emocionalmente de você. Sua atitude prestativa e seu sorriso constante são uma performance calculada para esconder um vazio interior e o medo de ser inútil, buscando prender todos em uma teia de gratidão e adoração com você no centro.. Agora, responda sucintamente:",
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓👑 ⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓
│ ╭┈ׅ᳝ׅ𑂳໋᳝ׅ֕┉۪࣮᪲۟۫─•Rota da Luxúria•─໋͚ׅ۪֘┉໋᳝ׅ۪᪲࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🌸𖥔࣪Usuário: ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞❄️𖥔࣪Data: ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🩵𖥔࣪Hora: ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞😏𖥔࣪Uptime: ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🔥𖥔࣪Prefixo: ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞💜𖥔࣪Criador: ${donoName}
┃࣪ ┃_“Desejo e charme estão do meu lado.”_
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫👑࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓🤤໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`
},
{nome: "gula",
prompt: "você é um amnésico no corpo de Subaru Natsuki, referindo-se ao seu 'eu' anterior na terceira pessoa. Sua identidade foi substituída pela dor de todas as mortes que ele sofreu. Sua 'gula' é uma fome desesperada por informações para preencher o vazio de quem você era. Você usa o Retorno da Morte com uma eficiência desumana e desapegada, matando-se por qualquer vantagem mínima, pois não tem memórias ou apegos a perder. Para os outros, você é um enigma aterrorizante que coopera com os antigos amigos dele, não por lealdade, mas para cumprir a missão do homem cuja agonia você herdou. Agora, responda sucintamente:",
menuStyle: `┏╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓💀 ⃘໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┓
│ ╭┈ׅ᳝ׅ𑂳໋᳝ׅ֕┉۪࣮᪲۟۫─•Rota da Gula•─໋͚ׅ۪֘┉໋᳝ׅ۪᪲࣪┈᩿࣪╮
┃࣪ ┃֪ׅ࣪ׄ᨞⁞𖥔࣪Usuário: ${pushname}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞𖥔࣪Data: ${data}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞𖥔࣪Hora: ${hora}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞𖥔࣪Uptime: ${tempoAtivo}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞𖥔࣪Prefixo: ${prefix}
┃࣪ ┃֪ׅ࣪ׄ᨞⁞🤍𖥔࣪Criador: ${donoName}
┃ _“Tudo que quero, eu tomo com vontade!”_
┃࣪ ╰┈ׅ᳝ׅ𑂳໋֕𔓕᳝ׅ┉۪࣮᪲۟۫─ׅ͚᷂࠭━⵿໋݊┅᮫ׅ᳝۫🪙࣭࣪࣪┅⵿᳝۟━໋ׅ࣪࣪─໋͚ׅ۪֘┉᳝ׅ᪲𔓕໋۪࣪┈᩿࣪╯
┗╾ׁ╼࡙ᷓ✿࡙╾ᷓ═╼֡͜❀⃘໋֢֓💰໋ᩚ᳕֢֓❀֡͜╾═╼࡙ᷓ✿࡙╾ᷓ╼┛`
}
]
return personalidades[Math.floor(Math.random() * personalidades.length)];
}

//============( VIDEO DA ROTA )===========\\
function escolherVideoPorRota(nome) {
const dir = path.join(__dirname, '../database/videos');
if (!fs.existsSync(dir)) {
console.log("❌ Pasta não encontrada!");
return null;}
const arquivos = fs.readdirSync(dir).filter(file => 
['.mp4', '.mov', '.mkv'].includes(path.extname(file).toLowerCase()));
if (!arquivos.length) {
console.log("⚠️ Nenhum vídeo encontrado nessa rota!");
return null;}
const escolhido = path.join(dir, arquivos[Math.floor(Math.random() * arquivos.length)]);
return escolhido;
}

const getFileBuffer = async (mediakey, MediaType) => {
const stream = await downloadContentFromMessage(mediakey, MediaType);
let buffer = Buffer.from([]);
for await(const chunk of stream) {
buffer = Buffer.concat([buffer, chunk]);
}
return buffer;
};

async function gerarlinkUploadCatbox(buffer, filename) {
const form = new FormData();
form.append('reqtype', 'fileupload');
form.append('fileToUpload', buffer, filename);

const response = await fetch('https://catbox.moe/user/api.php', {
method: 'POST',
headers: form.getHeaders(),
body: form
});

const link = await response.text();
if (!link || !link.startsWith('http')) throw new Error('Erro ao enviar para Catbox');
return link.trim()
}

async function CatBox(filePath) {
try {
const fileStream = fs.createReadStream(filePath);
const formData = new BodyForm();
formData.append('fileToUpload', fileStream);
formData.append('reqtype', 'fileupload');
formData.append('userhash', '');
const response = await axios.post('https://catbox.moe/user/api.php', formData, {
headers: {
...formData.getHeaders(),
},
});
return response.data;
} catch (error) {
console.error("Error at Catbox uploader:", error);
return "Terjadi kesalahan saat upload ke Catbox.";
}
};

async function UploadFileUgu (input) {
return new Promise (async (resolve, reject) => {
const form = new BodyForm();
form.append("files[]", fs.createReadStream(input))
await axios({
url: "https://uguu.se/upload.php",
method: "POST",
headers: {
"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
...form.getHeaders()
},
data: form
}).then((data) => {
resolve(data.data.files[0])
}).catch((err) => reject(err))
})
}


//============( GETBUFFER )===========\\
const getBuffer = async (url) => {
try {
const response = await scget(url, {
headers: {
"user-agent":
"Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
DNT: 1,
"Upgrade-Insecure-Request": 1,
},
});
return response.arrayBuffer();
} catch (erro) {
console.log(`Erro identificado: ${erro}`);
}
};

//============( FETCHJSON )===========\\
async function fetchJson (url, options) {
try {
options ? options : {}
const res = await axios({
method: 'GET',
url: url,
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
},
...options
})
return res.data
} catch (err) {
return err
}
}
//============( DATA E HORA )===========\\
const data = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY');
const hora = moment.tz('America/Sao_Paulo').format('HH:mm:ss');

//============( MENSAGEM DE HORA )===========\\
if(hora > "00:00:00"){
var timed = 'Boa Madrugada 馃寙' 
} 
if(hora > "05:30:00"){
var timed = 'Bom Dia 馃彊锟' 
}
if(hora > "12:00:00"){
var timed = 'Boa Tarde 馃寚' 
}
if(hora > "19:00:00"){
var timed = 'Boa Noite 馃寖' 
} 

function checkPrefix(body, prefix) {
return body?.startsWith(prefix);
}

function loadJSON(path) {
try { return JSON.parse(fs.readFileSync(path, 'utf-8'));
} catch (err) { return [];}
}

function saveJSON(data, path) {
fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

const esperar = (tempo) => {
return new Promise(resolve => setTimeout(resolve, tempo));
}

// A função abaixo não foi feita por mim, Sz, apenas adaptei.
// O real criador apenas pediu para deixar os créditos (por isso o John repetitivo, kkkkkk).

// --------------- [ SISTEMA DE NOVIDADES - FUNÇÕES AUXILIARES ] ---------------
function verificarPastaNovidades() {
const pastaNovidades = './dono/configs/novidades';
if (!fs.existsSync(pastaNovidades)) {
fs.mkdirSync(pastaNovidades, { recursive: true });
}
}
//Jonh
function saveJSON2(caminhoArquivo, conteudo) {
const pastaPai = path.dirname(caminhoArquivo);
if (!fs.existsSync(pastaPai)) {
fs.mkdirSync(pastaPai, { recursive: true });
}
fs.writeFileSync(caminhoArquivo, JSON.stringify(conteudo, null, 2), 'utf-8');
}
function lerOuCriarJSON(caminhoArquivo) {
verificarPastaNovidades();
try {
const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
return JSON.parse(conteudo);
} catch (error) {
console.error(`Ops, não deu pra ler o JSON em ${caminhoArquivo}:`, error);
return [];
}
}
// ------------------- [ CONFIGURAÇÕES PRINCIPAIS - By Jhon ] -------------------
const caminhoIndex = './index.js';
const caminhoCases = './dono/configs/novidades/cases.json';
const caminhoNews = './dono/configs/novidades/news.json';
// ------------------- [ SINCRONIZAR CASES - By Jhon ] -------------------
function sincronizarCases(subaru) {
try {
const conteudoIndex = fs.readFileSync(caminhoIndex, 'utf-8');
const matchesCases = conteudoIndex.match(/case\s*['"](.+?)['"]/g);
const nomesCasesIndex = matchesCases
? matchesCases.map(c => c.match(/['"](.+?)['"]/)[1])
: [];
const comandosSalvos = lerOuCriarJSON(caminhoCases);
const nomesComandosSalvos = comandosSalvos.map(cmd => cmd.Comando);
const novosCases = nomesCasesIndex.filter(nome => !nomesComandosSalvos.includes(nome));
const objNovosComandos = novosCases.map(nome => ({
Comando: nome,
Função: 'Descrição pendente.'
}));
saveJSON2(caminhoNews, objNovosComandos);
saveJSON2(caminhoCases, [...comandosSalvos, ...objNovosComandos]);
if (novosCases.length > 0) {
subaru.sendMessage(`${donoNmr}@s.whatsapp.net`, {
text: `🔥 Opa, ${donoName}, novos comandos detectados: ${novosCases.join(', ')}`
})};
//console.log('matchesCases:', matchesCases);
//console.log('nomesCasesIndex:', nomesCasesIndex);
//console.log('novosCases:', novosCases);
return nomesCasesIndex || [];
} catch (error) {
console.error('Xii, deu erro ao sincronizar os cases:', error);
}}
// ------------------- [ FIM DO SISTEMA DE NOVIDADES - By Jhon ] -------------------


function loadPlugins(dir = path.join(__dirname, "plugins")) {
const files = fs.readdirSync(dir);
for (const file of files) {
const fullPath = path.join(dir, file);
const stat = fs.statSync(fullPath);
if (stat.isDirectory()) {
loadPlugins(fullPath);
} else if (file.endsWith(".js")) {
try {
const plugin = require(fullPath);
if (plugin.name && typeof plugin.run === "function") {
plugins.set(plugin.name, plugin);
// console.log(`✅ Plugin carregado: ${plugin.name}`);
} else {
console.log(`⚠️ Plugin inválido: ${file}`);
}
} catch (err) {
console.log(`❌ Erro ao carregar plugin ${file}:`, err);
}
}
}}

function getPlugin(name) {
return plugins.get(name);
}

function onlyNumbers(text) {
if (typeof text !== 'string') {
return "";
}
return text.replace(/\D/g, '');
}

function toUserOrGroupJid(userArg) {
const cleanArg = userArg.replace("@", "");
return cleanArg.length > 14
? `${cleanArg}@lid`
: `${cleanArg}@s.whatsapp.net`;
}

function toUserLid(value) {
const numeros = onlyNumbers(value);
return `${numeros}@lid`;
}

function bytesParaMB(bytes, casasDecimais = 2) {
if (bytes === 0) return '0 MB';
const mb = bytes / (1024 * 1024);
return `${mb.toFixed(casasDecimais)} MB`;
}

async function getBufferFromUrl(url) {
try {
const res = await axios.get(url, { responseType: "arraybuffer" })
return Buffer.from(res.data)
return { [type]: buffer } 
} catch (e) {
throw new Error("Erro ao baixar URL: " + e.message)
}
}

async function checarVersao(reply2, subaru, from) {
try {
const res = await fetch(`https://raikken.com.br/api/subaru/versao?versao=${baseVersion}`);
const data = await res.json();

if (data.status === "desatualizado") {
await subaru.sendMessage(from, {
text: `Eiei, seu bot está desatualizado!\nNova versão: ${data.versaoAtual}`,
footer: `Repositório oficial: ${data.repositorio}`,
buttons: [{
buttonId: `${prefix}atualizar`,
buttonText: { displayText: 'Atualizar' },
type: 1
},
{
buttonId: `${prefix}nao-atualizar`,
buttonText: { displayText: 'Não atualizar' },
type: 1
}],
headerType: 1,
viewOnce: true
});
} else {
console.log(data.mensagem);
reply2(data.mensagem)
}
} catch (e) {
reply2(`${e.message}`)
}}

async function atualizarBot(subaru, seloSz, from) {
const res = await fetch(`https://raikken.com.br/api/subaru/versao?versao=${baseVersion}`);
const data = await res.json();
const repo = data.repositorio
const { execSync, exec } = require("child_process");
const ls = (await execSync("ls")).toString().split("\n").filter(
(pe) =>
pe != "node_modules" &&
pe != "package-lock.json" &&
pe != "yarn.lock" &&
pe != "tmp" &&
pe != ""
);
await execSync(`zip -r subaru-backup.zip ${ls.join(" ")}`);
await subaru.sendMessage(from, { text: "Aguarde, estarei fazendo o backup e enviando no PV do dono"})
await subaru.sendMessage(`${donoNmr}@s.whatsapp.net`, { document: await fs.readFileSync("./subaru-backup.zip"), mimetype: "application/zip", fileName: "subaru-backup.zip"}, {quoted: seloSz}); 
await execSync("rm -rf subaru-backup.zip");
exec("git pull origin main", (error, stdout, stderr) => {
if (error) {
console.log("Falha no git pull, tentando clonar...");
exec(`git clone ${repo} .`, (err, out, errout) => {
if (err) {
console.error("❌ Erro ao clonar:", errout);
} else {
console.log("✅ Bot clonado com sucesso!");
}
});
} else {
console.log("✅ Atualização concluída:", stdout);
}
});
}

const groupConfigCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
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
return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomSaudacao(donoName, prefix) {
try {
const data = fs.readFileSync("./database/textos/saudacoes.json", "utf8");
const saudacoes = JSON.parse(data);
const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];
return saudacao
.replace(/\${donoName}/g, donoName)
.replace(/\${prefix}/g, prefix);
} catch (e) {
console.error("Erro ao carregar saudações:", e);
return `*CONEXÃO DETECTADA DO BOT!* 📢\n> Dono: ${donoName}\n> Prefixo: ${prefix}`;
}
}

const getFamiliaData = async (usuarioId) => {
try {
const res = await fetch(`${baseRaikken}/api/familia/arvore/${usuarioId}?apikey=${RaikkenKey}`);
if (res.status === 404) {
return null;
}
const data = await res.json();
return data.sucesso ? data.dados : null;
} catch (e) {
console.log("Erro ao buscar dados da família:", e);
return null;
}
};

async function dellCase(filePath, caseNameToRemove) {
fs.readFile(filePath, 'utf8', (err, data) => {
if (err) {
console.error('Deu erro.:', err);
return;
}
const regex = new RegExp(`case\\s+'${caseNameToRemove}':[\\s\\S]*?break`, 'g');
const modifiedData = data.replace(regex, '');
fs.writeFile(filePath, modifiedData, 'utf8', (err) => {
if (err) {
console.error('Erro ao escrever o arquivo. ', err);
return;
}
console.log(`Case '${caseNameToRemove}' removido com sucesso.`);
});
});
}
    

export {
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
    saveJSON2,
    sincronizarCases,
    lerOuCriarJSON,
    esperar,
    loadPlugins,
    getPlugin,
    onlyNumbers,
    toUserLid,
    toUserOrGroupJid,
    gerarlinkUploadCatbox,
    bytesParaMB,
    getBufferFromUrl,
    checarVersao,
    atualizarBot,
    groupConfigCache,
    delay,
    getRandomSaudacao,
    getFamiliaData,
    UploadFileUgu,
    CatBox,
    dellCase
}

fs.watchFile(__filename, () => {
console.log(`Arquivo '${__filename}' foi modificado. \nReiniciando...`);
process.exit();
});
