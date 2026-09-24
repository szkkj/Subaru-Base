<p align="center">
  <img src="https://i.postimg.cc/fbBCDL1Q/images-11.jpg" alt="Subaru-Base" width="400"/>
</p>

<h1 align="center">🤖 Subaru-Base</h1>

<p align="center">
  Um bot para WhatsApp baseado em <strong>Baileys</strong> e <strong>zapo-js</strong>, com foco em automação de grupos, brincadeiras, sistemas anti-mídia, jogos, figurinhas, inteligência artificial e muito mais! 
</p>

<p align="center">
  <a href="https://github.com/WhiskeySockets/Baileys"><img src="https://img.shields.io/badge/Baileys-Library-blue?style=for-the-badge&logo=whatsapp" /></a>
  <a href="#"><img src="https://img.shields.io/badge/zapo--js-Engine-25D366?style=for-the-badge&logo=whatsapp" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" /></a>
</p>

## 📋 Sumário

- [✨ Funcionalidades](#-funcionalidades)
- [🎵 Música & Mídia](#-música--mídia)
- [🛡️ Sistema Anti](#️-sistema-anti)
- [🎮 Jogos](#-jogos)
- [🎭 Brincadeiras](#-brincadeiras)
- [📝 Utilidades](#-utilidades)
- [🔌 Engines: Baileys & zapo-js](#-engines-baileys--zapo-js)
- [🚀 Instalação](#-instalação)
- [🧩 Instalação via Git](#-instalação-via-git)
- [▶️ Uso](#️-uso)
- [⚡ Deploy](#-deploy)
- [🌐 Powered by Raikken](#-powered-by-raikken)
- [🤖 Finn - Bot](#-botvip)
- [👤 Créditos](#-créditos)
- [📜 Licença](#-licença)
- [💀 Considerações](#-considerações--by-sz)

## ✨ Funcionalidades

> [!NOTE]
> TODOS os comandos que dependem da `https://api.raikken.com.br` foram removidos, já que a mesma encontra-se em atualização e atualmente, inativa.

`🎵 Música & Mídia`

- Play de áudio/vídeo
- Downloads de _YouTube_, _TikTok_, _Instagram_, _Facebook_, _Twitter_
- Conversão para áudio ou documento

`🛡️ Sistema Anti`

- Antilink
- Anti-imagem
- Anti-vídeo
- Anti-figurinhas
- Anti-documento
- Anti-contato
- Anti-localização
- BanChat automático

`🎮 Jogos`

- Jogo da velha
- Pedra, papel e tesoura
- Sistema **NoFap** (patentes motivacionais)

`📝 Utilidades`

- Conversão de mídia em _figurinhas_
- Sistema de _contagem de mensagens_ (`!minhaatividade`)
- _Boas-vindas automáticas_
- _IA estilo SimSimi_ (via [Raikken API](https://api.raikken.com.br))
- _Menu interativo com botões_
- _Suporte a botões em ambas engines_
- *Plugins e Cases

## 🔌 Engines: Baileys & zapo-js

O Subaru-Base suporta duas engines de conexão com o WhatsApp, escolhidas dinamicamente pela chave `"engine"` em `settings.json`:

```json
{
  "engine": "baileys"
}
```

ou

```json
{
  "engine": "zapo"
}
```

|  Engine   |                             Biblioteca                              | Observações                                                                    |
| :-------: | :-----------------------------------------------------------------: | :----------------------------------------------------------------------------- |
| `baileys` | [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) | Engine padrão, mais testada e documentada.                                     |
|  `zapo`   |          [zapo-js](https://www.npmjs.com/package/zapo-js)           | Engine alternativa, com sessão persistida em SQLite (`@zapo-js/store-sqlite`). |

A troca de engine é feita internamente em `database/dev/.scripts/engine.js`, que expõe uma interface unificada (`sendMessage`, `groupMetadata`, `groupParticipantsUpdate`, eventos `messages.upsert`/`connection.update`, etc.) para que o restante do bot funcione igual, independentemente de qual engine estiver ativa por baixo dos panos.

Em ambas engines, o bot continua funcionando botões.

> [!NOTE]
> Ambas as engines usam a mesma pasta de configs (`dono/configs/session`) — evite alternar de engine com uma sessão já pareada; prefira reparear ao trocar.

## 🚀 Powered by Raikken

<p align="center">
  <strong>O Subaru-Base é desenvolvido e mantido com o suporte da infraestrutura Raikken.</strong>
</p>

<p align="center">
  <a href="https://raikken.com.br/">
    <img src="https://i.ibb.co/0jNnzJRP/IMG-20260227-WA0243.jpg" width="200"/>
  </a>
</p>

|                                  Raikken Host                                  |                                 ⚡ Raikken API                                 |
| :----------------------------------------------------------------------------: | :----------------------------------------------------------------------------: |
|              Hospede seu bot com estabilidade e suporte dedicado               |                IA's, downloads, sistemas próprios e muito mais                 |
|                   [🌐 Acessar site](https://raikken.com.br/)                   |               [📄 Ver documentação](https://raikken.com.br/docs)               |
| [💬 Grupo oficial](https://chat.whatsapp.com/BzSDYUHbjHGF6gQmJfh2C7?mode=gi_t) | [💬 Grupo oficial](https://chat.whatsapp.com/BzSDYUHbjHGF6gQmJfh2C7?mode=gi_t) |

## 🚀 Instalação

`Baixe o bot`
📦 [Download direto da V1 (zip)](https://github.com/szkkj/Subaru-Base/archive/refs/tags/v4.2.3.zip)

`Comandos para o termux`

```bash
termux-setup-storage
```

```bash
pkg update && pkg upgrade && pkg install -y git nodejs ffmpeg imagemagick yarn
```

## 🧩 Instalação via Git

1️⃣ Clone o repositório

```bash
git clone https://github.com/szkkj/Subaru-Base
```

2️⃣ Acesse a pasta

```bash
cd Subaru-Base/
```

3️⃣Instale as dependências (se necessário)

```bash
npm install
```

4️⃣ Configure
Edite o arquivo `./dono/configs/settings.json:`

`É de grande importância mudar o donoLid e o donoNmr!`

```json
{
  "engine": "baileys",
  "prefix": "!",
  "botName": "Subaru-Base",
  "donoName": "Seu Nome",
  "donoNmr": "5512999999999",
  "donoLid": "99999999999@lid",
  "botLid": "99999999999@lid",
  "RaikkenKey": "SUA_API_KEY",
  "baseRaikken": "https://api.raikken.com.br"
}
```

> [!NOTE]
> Por padrão, o `Subaru-Base` está com o número do desenvolvedor nas configurações, substitua antes de ligar! O próprio sempre irá enviar uma mensagem no privado avisando que foi reiniciado. 

5️⃣ Estrutura do Subaru-Base

```
📁 Subaru-Base/
├── 📄 index.js
├── 📄 conection.js
├── 📄 package.json
├── 📄 README.md
│
├── 📂 dono/
│   ├── 📂 plugins/
│   └── 📂 configs/
│        ├── 📂 session/
│        ├── 📂 novidades/
│        ├── 📄 settings.json
│        ├── 📄 menus.js
│        └── 📄 links.json
│
├── 📂 src/
│   ├── 📄 exports.js
│   ├── 📄 functions.js
│   └── 📄 fileSz.js
│
├── 📂 database/
│   ├── 📂 grupos/
│   ├── 📂 users/
│   ├── 📂 countmessage/
│   ├── 📂 audios/
│   ├── 📂 imgs/
│   ├── 📂 videos/
│   ├── 📂 textos/
│   ├── 📂 tictactoe/
│   ├── 📂 temp/
│   ├── 📂 docs/
│   ├── 📂 outros/
│   │   ├── 📂 sticker/
│   │   └── 📄 similaridade.js
│   └── 📂 dev/
│       ├── 📄 cacheService.js
│       ├── 📄 botoes.js
│       └── 📂 .scripts/
│           └── 📄 engine.js # unifica as engines Baileys e zapo-js
│
└── 📂 node_modules/
```

5️⃣ Inicie o bot
`sh start.sh`

> [!WARNING]
> ⚠️ O bot só responde o `lid` do dono, por isso você deve atualizar. Esse número aparece no console, quando qualquer mensagem é recebida. Após atualizar o lid, use o comando: `!banchat 0`, pois o bot estará inativo em grupos por padrão.

`💡 Dica:`
Se quiser atualizar o bot no futuro, entre na pasta e use:
`git pull` ou use o comando: `!checarversao`

### ▶️ Uso

Inicie o bot com uma das opções:
`npm start` # Login via Pairing Code
`node conection.js` # Login via QR Code
`node conection.js --code` # Pairing Code (manual)
`sh start.sh` # Ambos (recomendado)

A engine usada (Baileys ou zapo-js) é definida pela chave `"engine"` em `dono/configs/settings.json` — veja [🔌 Engines: Baileys & zapo-js](#-engines-baileys--zapo-js).

Depois, use os comandos no WhatsApp conforme o prefixo definido.

> [!WARNING]
> ⚠️Por padrão, o bot está com o banchat (ignorar comandos) ativos, use o comando: !banchat 0 para ativar no grupo!
> Exemplos:
> !menu → Mostra o menu
> !sticker → Cria figurinha
> !jogodavelha @membro → Inicia jogo da velha
> !minhaatividade → Mostra suas estatísticas
> !play → Toca música
> !tinder → Funções de Tinder
> !ban → bane o mencionado

> [!WARNING]
> ⚠️ Os comandos por API não funcionam por precisar de uma key, para obter uma nova, entre em contato: WhatsApp

## ⚡ Deploy

O bot pode ser hospedado em:
Ambiente Suporte  
🧩 Termux ✅  
🖥️ Pterodactyl ✅  
🐧 VPS/Linux ✅

## 🤖 Botvip

<p align="center">
  <img src="https://i.postimg.cc/nLSX0VRb/20251021-223500.png" alt="Finn - Bot" width="400"/>
</p>

Cansado desses bots ruins que não protegem seu grupo, que não tem atualização constante e que não tem suporte? Obtenha agora mesmo o Finn-Bot!
`Mais de 40 grupos` adiquiriram e não se arrependeram! Entre em contato já.

<p align="center">
  <a href="https://wa.me/559292678251">
    <img src="https://img.shields.io/badge/💬%20Falar%20com%20o%20dono-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>

## 👤 Créditos

Base: Baileys & zapo-js
Criação: Sz
Integração IA: Raikken-API

## 📜 Licença

Distribuído sob a Licença MIT.
Sinta-se livre para modificar, melhorar e usar.

## 💀 Considerações — By Sz

Pra ser bem sincero, nem tava nos meus planos escrever esse texto aqui, mas acho que seria injusto não registrar umas coisas importantes.
Então bora lá:

Agradecimentos especiais a: Spiral, Reis, Creeper, Thzy, Riki e Duarte, que testaram, deram feedback e ajudaram o bot a ficar como tá hoje.
E claro, Anguish, cuja base inspirou o multi menu usado aqui. 💪

A todos que esperaram esse projeto — obrigado de verdade!
E se você tá lendo até o fim... pô, muito obrigado mesmo
Tamo junto, e se curtir, dá aquela força e segue aí!

<p align="center">
  <a href="https://wa.me/559292678251">
    <img src="https://img.shields.io/badge/💬%20Falar%20com%20o%20dono-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
  <a href="https://github.com/szkkj/Subaru-Base/">
    <img src="https://img.shields.io/badge/⭐%20Github%20do%20projeto-181717?style=for-the-badge&logo=github" />
  </a>
