<p align="center">
  <img src="https://i.postimg.cc/nLSX0VRb/20251021-223500.png" alt="Finn Bot" width="400"/>
</p>

<h1 align="center">🤖 ẉ.co/𝕱ī𝖓𝖓.𝕿𝖍𝖊.𝕳𝖚𝖒𝖆𝖓</h1>

<p align="center">
  Um bot para WhatsApp baseado em <strong>Baileys</strong>, com foco em automação de grupos, RPG, pet virtual, brincadeiras, sistemas anti‑mídia, jogos, figurinhas, inteligência artificial e muito mais!
</p>

<p align="center">
  <a href="https://github.com/WhiskeySockets/Baileys"><img src="https://img.shields.io/badge/Baileys-Library-blue?style=for-the-badge&logo=whatsapp" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Status-Online-brightgreen?style=for-the-badge" /></a>
</p>

> **⚠️ AVISO DE CONFIDENCIALIDADE – LEIA ATENTAMENTE**  
> Este material contém informações sobre um bot proprietário, desenvolvido sob a infraestrutura **Raikken Core**.  
> **Não compartilhe, não distribua e não utilize qualquer parte deste código ou documentação sem autorização expressa do autor.**  
> O vazamento ou uso não autorizado acarretará medidas legais e a imediata descontinuação do suporte.


## 📋 Sumário
- [⚡ Estatísticas Gerais](#-estatísticas-gerais)
- [✨ Funcionalidades](#-funcionalidades)
  - [🎵 Música & Mídia](#-música--mídia)
  - [🛡️ Sistema Anti](#️-sistema-anti)
  - [🎮 Jogos & RPG](#-jogos--rpg)
  - [🎭 Brincadeiras](#-brincadeiras)
  - [📝 Utilidades](#-utilidades)
  - [🤖 Sub‑bots](#-subbots)
- [📁 Estrutura de Pastas](#-estrutura-de-pastas)
- [🚀 Como Executar](#-como-executar)
- [🌐 Powered by Raikken](#-powered-by-raikken)
- [🤖 Bot Vip](#-bot-vip)
- [👤 Créditos](#-créditos)
- [📜 Licença](#-licença)

## ⚡ Estatísticas Gerais

```bash
┏═╾•°•֡͜❀⃘ 𝙰𝙳𝚅𝙴𝙽𝚃𝚄𝚁𝙴 𝚃𝙸𝙼𝙴 ❀֡͜•°•═┓
┃╭╾ᷓ┉᪲❀•═•°•✧໋֢֓⚔️⃘໋ᩚ✧•°•═╾•❀┉᪲╾ᷓ╮
││ 📜 Cases: 520
││ 🧪 Scrapers: 16
││ 👥 Plugins‑Members: 14
││ 🤖 Plugins‑Subbots: 66
││ ⚙️ Plugins‑ADM: 6
││ 👑 Plugins‑Owner: 21
││ 
││ *_🔹 Total geral: 643 comandos_*
│╰╾ᷓ┉᪲❀•═•°•✧໋֢֓👑໋ᩚ✧•°•═╾•❀┉᪲╾ᷓ╯
┗═╾•°•֡͜❀⃘ 𝙰𝙳𝚅𝙴𝙽𝚃𝚄𝚁𝙴 𝚃𝙸𝙼𝙴 ❀֡͜•°•═┛
```



✨ Funcionalidades

🎵 Música & Mídia

· Download de áudio/vídeo do YouTube, TikTok, Instagram, Facebook, Twitter
· Conversão para áudio (.mp3, .ogg) ou documento
· Busca e reprodução de músicas (!play, !playSearch)

🛡️ Sistema Anti

· Antilink (comum, apostas, wa.me, canais, modo hard)
· Anti‑imagem, Anti‑vídeo, Anti‑figurinha, Anti‑documento, Anti‑contato, Anti‑localização
· Antipagamento (requestPaymentMessage)
· Antihidetag (detecta menções em massa, inclusive em mensagens de pagamento e status de grupo)
· Antistatus de grupo (groupStatusMessageV2)
· Antispam, cooldown e bloqueio automático (banchat)

🎮 Jogos & RPG

· RPG completo: registro, exploração, loja, eventos, pet virtual (adotar, equipar, alimentar)
· Jogo da velha (tictactoe)
· Pedra, papel e tesoura (ppt)
· Dama e Xadrez
· Sistema NoFap com patentes motivacionais

🎭 Brincadeiras

· chance, comer, capinarlote, pgpeito, pgbunda, sentar, abraco, trisal
· Rankings de “gado”, “gay”, “corno”, “feio”, etc.
· Respostas interativas com vídeos e áudios engraçados

📝 Utilidades

· Conversão de mídia em figurinha (!sticker, !stickerperfil)
· Sistema de contagem de mensagens (!minhaatividade)
· Boas‑vindas automáticas com imagem/vídeo/figurinha
· IA estilo SimSimi (via Raikken API)
· Menu interativo com botões e listas
· Calendário, correios, clima, busca de trabalho (Gupy, Workana)

🤖 Sub‑bots

· Mais de 66 comandos carregados dinamicamente em ./dono/plugins/comandos-subbots/
· Exemplos: sticker, play, instagram, tiktok, twitter, mediafire, google drive, gupy, voz-ia, removebg, stalkwa, infoscanal


📁 Estrutura de Pastas (Resumida)

```
.
├── conection.js                 # Conexão principal com o WhatsApp (Baileys)
├── index.js                     # Gerenciador de comandos e eventos
├── start.sh                     # Script de inicialização
├── package.json                 # Dependências
├── database/                    # Dados persistentes
│   ├── grupos/                  # Configurações por grupo (JSON)
│   ├── users/                   # Usuários, leveling, VIP, ausentes
│   ├── rpg/                     # Sistema de RPG
│   ├── tictactoe/               # Jogo da velha
│   ├── textos/                  # Mensagens, saudações, help, personalidades
│   ├── dev/                     # Cache, botoes.js, cacheService.js, disconect.js, scget
│   ├── scrapers/                # Módulos de download (ig, tt, fb, drive, etc.)
│   ├── audios/                  # Áudios para respostas
│   ├── imgs/                    # Imagens do bot
│   ├── temp/                    # Arquivos temporários
│   └── ticket/                  # Sistema de tickets
├── dono/                        # Núcleo do bot
│   ├── functions.js             # Funções auxiliares (middlewares, parser)
│   ├── exports-consts.js        # Constantes globais
│   ├── replys.js                # Mensagens padrão
│   ├── fileSz.js                # Funções adicionais
│   ├── configs/                 # Configurações, sessão, personalidade
│   └── plugins/                 # Comandos organizados por permissão
│       ├── adm/                 # Comandos de admin (6)
│       ├── members/             # Comandos para membros (14)
│       ├── owner/               # Comandos exclusivos do dono (21)
│       └── comandos-subbots/    # Sub‑bots (66)
├── node_modules/                # Dependências NPM
└── yt-dlp                       # Binário para downloads de mídia
```

A lista completa de arquivos e pastas está disponível apenas para mantenedores.


🚀 Como Executar

🔧 Pré‑requisitos

· Node.js v18 ou superior (recomendado v20)
· Gerenciador de pacotes npm ou yarn
· FFmpeg instalado no sistema (para conversão de áudio/vídeo)

▶️ Inicialização

1. Acesse a pasta raiz do bot.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Edite o arquivo ./dono/configs/settings.json com suas credenciais e preferências (especialmente donoLid e donoNmr).
4. Execute o bot com uma das opções:
   ```bash
   npm start                # Login via Pairing Code (recomendado)
   node conection.js        # Login via QR Code
   node conection.js --code # Pairing Code manual
   sh start.sh              # Script de inicialização (ambos)
   ```
5. Escaneie o QR Code ou insira o código de pareamento no WhatsApp.

[!WARNING]
⚠️ O bot inicia com banchat ativo (ignora comandos no grupo).
Use !banchat 0 no grupo para ativá‑lo.

Exemplos de comandos

```
!menu                 → Mostra o menu principal
!sticker              → Cria figurinha a partir de uma imagem/vídeo
!play                 → Toca música (YouTube)
!instagram            → Baixa vídeo/imagem do Instagram
!minhaatividade       → Mostra suas estatísticas de mensagens
!adotarpet            → Adota um pet virtual
!equipar [item]       → Equipa item no seu pet
!antilink 1           → Ativa o bloqueio de links comuns no grupo
!ban @membro          → Bane o membro mencionado
```


🌐 Powered by Raikken

<p align="center">
  <strong>O Finn Bot é desenvolvido e mantido com o suporte da infraestrutura Raikken Core.</strong>
</p>

<p align="center">
  <a href="https://raikken.com.br/">
    <img src="https://i.postimg.cc/fbBCDL1Q/images-11.jpg" width="200"/>
  </a>
</p>

Raikken Host ⚡ Raikken API
Hospede seu bot com estabilidade e suporte dedicado IA's, downloads, sistemas próprios e muito mais
🌐 Acessar site 📄 Ver documentação
💬 Grupo oficial 💬 Grupo oficial


🤖 Bot Vip

<p align="center">
  <img src="https://i.postimg.cc/nLSX0VRb/20251021-223500.png" alt="Finn - Bot" width="400"/>
</p>

Cansado desses bots ruins que não protegem seu grupo, que não têm atualização constante e que não oferecem suporte? Adquira agora mesmo o Finn Bot!
Mais de 110 grupos já adquiriram e não se arrependeram. Entre em contato já.

<p align="center">
  <a href="https://wa.me/559292678251">
    <img src="https://img.shields.io/badge/💬%20Falar%20com%20o%20dono-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
</p>


👤 Créditos

· Base: Baileys
· Criação e desenvolvimento: Sz
· Integração com API: Raikken-API


📜 Licença

Distribuído sob a Licença MIT.
Sinta‑se livre para modificar, melhorar e usar, desde que mantidos os créditos originais e o aviso de confidencialidade.


<p align="center">
  <a href="https://wa.me/559292678251">
    <img src="https://img.shields.io/badge/💬%20Falar%20com%20o%20dono-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
</p>
