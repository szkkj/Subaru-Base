<p align="center">
  <img src="https://i.postimg.cc/QCfq3crG/506b866c53e721009ee6fccb27aadf04-high.webp" alt="Subaru-Base plugins" width="300"/>
</p>

<h1 align="center">🧩 Subaru-Base — plugins</h1>

<p align="center">
  Guia oficial para criação de <strong>plugins</strong> no <strong>Subaru-Base</strong>.<br/>
  Pensado para <strong>humanos</strong> e <strong>inteligências artificiais</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/plugin-System-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/IA-Friendly-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Subaru--Base-v4.0.0-red?style=for-the-badge" />
  <img src="https://img.shields.io/badge/ESM-Module-green?style=for-the-badge" />
</p>

## 📑 Sumário

- [🎯 Propósito deste arquivo](#-propósito-deste-arquivo)
- [🧠 Conceito fundamental (leia antes)](#-conceito-fundamental-leia-antes)
- [📁 Onde ficam os plugins](#-onde-ficam-os-plugins)
- [🟢 Padrão ESM (atual — use este)](#-padrão-esm-atual--use-este)
  - [🧩 Estrutura mínima ESM](#-estrutura-mínima-esm)
  - [🧱 Plugin Base ESM (modelo oficial)](#-plugin-base-esm-modelo-oficial)
  - [🧪 Exemplos rápidos ESM](#-exemplos-rápidos-esm)
  - [🧪 Exemplo completo real ESM](#-exemplo-completo-real-esm)
  - [🤖 Prompt pronto para IA (ESM)](#-prompt-pronto-para-ia-esm)
- [🟡 Padrão CJS (legado)](#-padrão-cjs-legado)
  - [🧩 Estrutura mínima CJS](#-estrutura-mínima-cjs)
  - [🧱 Plugin Base CJS (modelo legado)](#-plugin-base-cjs-modelo-legado)
  - [🧪 Exemplos rápidos CJS](#-exemplos-rápidos-cjs)
  - [🤖 Prompt pronto para IA (CJS)](#-prompt-pronto-para-ia-cjs)
- [🧠 Parâmetros disponíveis no `run`](#-parâmetros-disponíveis-no-run)
- [⚠️ Regras obrigatórias](#️-regras-obrigatórias)
- [✅ Resultado esperado](#-resultado-esperado)

---

### 🎯 Propósito deste arquivo

Este arquivo existe para **ensinar uma IA a criar comandos corretamente** para o Subaru-Base.

Você pode literalmente enviar este arquivo para uma IA e dizer:

> "Crie um comando de mute usando essa base"

Se a IA seguir este documento, o plugin **funciona sem ajustes**.

---

### 🧠 Conceito fundamental (leia antes)

Antes de criar qualquer plugin, é **obrigatório** entender como o Subaru-Base funciona internamente.  
Esse entendimento evita 99% dos erros comuns.

- 📦 **Um plugin = um comando**  
  Cada arquivo representa **exatamente um comando**.  
  Não crie múltiplos comandos no mesmo arquivo e não compartilhe lógica entre comandos sem necessidade.

- 🔌 **A conexão Baileys já existe**  
  O bot já está conectado ao WhatsApp.  
  Você **NUNCA** deve criar, importar ou inicializar uma nova conexão Baileys dentro de um plugin.  
  Use apenas o objeto `finn` fornecido no `run`.

- 🧠 **O core do bot injeta tudo no `run`**  
  Todas as informações necessárias (mensagem, autor, grupo, permissões, helpers, etc.)  
  são automaticamente passadas como parâmetros para a função `run`.  
  Se algo não está nos parâmetros documentados, **não use**.

- 🚫 **Nada deve ser importado do core**  
  Não importe arquivos internos do bot (index, handlers, listeners, socket, etc).  
  O plugin é isolado por design.

- 🎯 **Toda a lógica fica dentro do plugin**  
  O plugin é responsável por:
  - validar permissões
  - validar argumentos
  - executar ações
  - responder o usuário
  - tratar erros  

  O core **não corrige** erros do seu comando.

```json 
- 📁 **Estrutura do Subaru-Base**
Subaru-Base/
📁 database/
├── 📁 grupos/
├── 📁 imgs/
├── 📁 dev/
│   ├── 📁 botoes.js/
│   ├── 📁 cacheService.js/
├── 📁 outros/
├── 📁 textos/
├── 📁 tictactoe/
├── 📁 users/
└── 📁 videos/
│
├── 📁 dono/
│   ├── 📁 plugins/
│   │   ├── 📁 adm/
│   │   ├── 📁 members/
│   │   └── 📁 owner/
│   ├── 📄 config.js
│   └── 📄 functions.js
│
├── 📁 node_modules/
│
├── 📄 README.md
├── 📄 conection.js
├── 📄 index.js
├── 📄 package.json
├── 📄 package-lock.json
└── 📄 start.sh
```

📌 **Resumo importante:**  
Se o plugin:
- usa apenas os parâmetros do `run`
- não cria conexões
- não acessa o core
- segue o padrão documentado  

➡️ Ele funciona **sem ajustes**, tanto para humanos quanto para IAs.

---

### 📁 Onde ficam os plugins

Todos os comandos do Subaru-Base são carregados a partir do sistema de **plugins**.  
Esses arquivos ficam organizados em diretórios específicos, de acordo com **nível de permissão**.

📂 Diretório principal de plugins:
```
./dono/plugins/
```

Dentro desse diretório, os comandos são obrigatoriamente separados por categoria:
- `owner` → comandos exclusivos do dono do bot
- `adm` → comandos para administradores de grupo
- `members` → comandos livres para qualquer usuário

```json
./dono/plugins/
 ├─ owner/
 ├─ adm/
 └─ members/
```

📌 **Regras importantes sobre essa estrutura**
- Cada arquivo representa um único comando
- O nome do arquivo não define o comando — quem define é a propriedade `name`
- O core do bot varre automaticamente essas pastas e carrega os plugins
- A pasta onde o plugin está define quem pode usá-lo
- Não existe fallback de permissão

```txt
members/
 ├─ ping.js    → comando !ping
 ├─ mute.js    → comando !mute
 ├─ ban.js     → comando !ban
 └─ play.js    → comando !play
```

---

## 🟢 Padrão ESM (atual — use este)

> O Subaru-Base v4.0.0+ usa `"type": "module"` no `package.json`.  
> **Todo plugin novo deve seguir o padrão ESM abaixo.**

### 🧩 Estrutura mínima ESM

```js
export const name = "comando";
export const run = async ({ finn, from }) => {
  await finn.sendMessage(from, { text: "Olá mundo" });
};
```

Isso já é um comando funcional.

---

### 🧱 Plugin Base ESM (modelo oficial)

```js
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { prefix, botName, donoName, donoNmr, idCanal } = require(path.join(__dirname, '../../configs/settings.json'));

export const name = "base";
export const run = async ({ finn, msg, args, from, sender, isGroup, pushname, reply, seloSz, react, isAdm, isDono, isGroupAdmins, isBotGroupAdmins }) => {
  try {
    await finn.sendMessage(from, {
      text:
        `📢 Olá ${pushname}!\n\n` +
        `👉 Comando: *${name}*\n` +
        `🔹 Autor: ${sender.split("@")[0]}\n` +
        `🔹 Grupo: ${isGroup ? "Sim" : "Não"}\n` +
        `🔹 Args: ${args.length ? args.join(" ") : "(nenhum)"}\n` +
        `🔹 Bot adm? ${isBotGroupAdmins}\n` +
        `🔹 Nome do dono: ${donoName}`
    });
  } catch (e) {
    console.error(`❌ Erro no plugin base`, e);
    await finn.sendMessage(from, { text: "⚠️ Erro ao executar o comando." });
  }
};
```

---

### 🧪 Exemplos rápidos ESM

**🏓 Ping**
```js
export const name = "ping";
export const run = async ({ reply }) => reply("🏓 Pong!");
```

**🔒 Apenas grupos**
```js
export const name = "grupo";
export const run = async ({ isGroup, from, finn }) => {
  if (!isGroup) return finn.sendMessage(from, { text: "❌ Apenas em grupos." });
  finn.sendMessage(from, { text: "✅ Grupo detectado." });
};
```

**🔥 Reagir**
```js
export const name = "react";
export const run = async ({ react }) => react("🔥");
```

---

### 🧪 Exemplo completo real ESM

```js
export const name = "pl";
export const run = async ({ finn, from, isGroup, pushname, seloSz, react }) => {
  try {
    await react("🫦");
    const texto =
      `📢 Oi, esse é um comando de plugin!\n\n` +
      `🔹 Grupo: ${isGroup ? "Sim" : "Não"}\n` +
      `🔹 Usuário: ${pushname}`;

    await finn.sendMessage(from, { text: texto }, { quoted: seloSz });
  } catch (e) {
    console.error(`❌ Erro no plugin pl`, e);
    await finn.sendMessage(from, { text: "⚠️ Erro ao executar." });
  }
};
```

---

### 🤖 Prompt pronto para IA (ESM)

```
Crie um comando para Subaru-Base usando o sistema de plugins ESM.
Repositório oficial: https://github.com/szkkj/Subaru-Base/

Siga TODAS as regras abaixo.

Regras obrigatórias:
- Use export const name e export const run (padrão ESM)
- O plugin deve conter apenas `name` e `run` exportados
- Use try/catch envolvendo toda a lógica do comando
- Nunca crie ou inicie conexão Baileys manualmente
- Use somente os parâmetros documentados no plugins.md
- Um arquivo representa um único comando
- O objeto do bot se chama `finn`, não `subaru`

Regras de código:
- NÃO escreva comentários no código final
- Se criar funções auxiliares, declare TODAS acima dos exports
- Não declare funções dentro do run, exceto callbacks simples
- Não use classes
- Não use eval ou código dinâmico
- No catch, sempre use: console.error(`❌ Erro no plugin nomeDoPlugin`, e)

Regras de imports:
- Use import estático no topo do arquivo
- Para arquivos locais (settings, JSONs), use createRequire:

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { prefix, botName } = require(path.join(__dirname, '../../configs/settings.json'));

Base:
```js
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { prefix, botName, donoName, donoNmr, idCanal } = require(path.join(__dirname, '../../configs/settings.json'));

export const name = "base";
export const run = async ({ finn, msg, args, from, sender, isGroup, pushname, reply, seloSz, react, isAdm, isDono, isGroupAdmins, isBotGroupAdmins }) => {
  try {
    await finn.sendMessage(from, {
      text:
        `📢 Olá ${pushname}!\n\n` +
        `👉 Comando: *${name}*\n` +
        `🔹 Autor: ${sender.split("@")[0]}\n` +
        `🔹 Grupo: ${isGroup ? "Sim" : "Não"}\n` +
        `🔹 Args: ${args.length ? args.join(" ") : "(nenhum)"}\n` +
        `🔹 Bot adm? ${isBotGroupAdmins}\n` +
        `🔹 Nome do dono: ${donoName}`
    });
  } catch (e) {
    console.error(`❌ Erro no plugin base`, e);
    await finn.sendMessage(from, { text: "⚠️ Erro ao executar o comando." });
  }
};
```

Comando desejado:
(descreva aqui como você quer o comando, o que vai fazer, etc.)
```

---

## 🟡 Padrão CJS (legado)

> [!WARNING]
> O padrão CJS ainda é suportado, mas **somente se o arquivo for salvo com a extensão `.cjs`**.  
> Com `"type": "module"` no `package.json`, arquivos `.js` são tratados como ESM automaticamente.  
> **Se criar um plugin CJS e salvar como `.js`, o bot vai quebrar.**  
> Use `.cjs` obrigatoriamente para plugins no padrão antigo.

### 🧩 Estrutura mínima CJS

```js
// salvar como: comando.cjs
module.exports = {
  name: "comando",
  run: async ({ subaru, from }) => {
    await subaru.sendMessage(from, { text: "Olá mundo" });
  }
};
```

---

### 🧱 Plugin Base CJS (modelo legado)

```js
// salvar como: base.cjs
module.exports = {
  name: "base",
  run: async ({ subaru, msg, args, from, sender, isGroup, pushname, reply, seloSz, react, isAdm, isDono, isGroupAdmins, isBotGroupAdmins }) => {
    try {
      await subaru.sendMessage(from, {
        text:
          `📢 Olá ${pushname}!\n\n` +
          `👉 Comando: *${module.exports.name}*\n` +
          `🔹 Autor: ${sender.split("@")[0]}\n` +
          `🔹 Grupo: ${isGroup ? "Sim" : "Não"}\n` +
          `🔹 Args: ${args.length ? args.join(" ") : "(nenhum)"}`
      });
    } catch (e) {
      console.error(`❌ Erro no plugin base`, e);
      await subaru.sendMessage(from, { text: "⚠️ Erro ao executar o comando." });
    }
  }
};
```

---

### 🧪 Exemplos rápidos CJS

**🏓 Ping**
```js
// ping.cjs
module.exports = {
  name: "ping",
  run: async ({ reply }) => reply("🏓 Pong!")
};
```

**🔒 Apenas grupos**
```js
// grupo.cjs
module.exports = {
  name: "grupo",
  run: async ({ isGroup, from, subaru }) => {
    if (!isGroup) return subaru.sendMessage(from, { text: "❌ Apenas em grupos." });
    subaru.sendMessage(from, { text: "✅ Grupo detectado." });
  }
};
```

**🔥 Reagir**
```js
// react.cjs
module.exports = {
  name: "react",
  run: async ({ react }) => react("🔥")
};
```

---

### 🤖 Prompt pronto para IA (CJS)

```
Crie um comando para Subaru-Base usando o padrão CJS legado.
IMPORTANTE: salve o arquivo com extensão .cjs obrigatoriamente.

Regras obrigatórias:
- Use module.exports com name e run
- Use try/catch envolvendo toda a lógica
- Nunca crie ou inicie conexão Baileys manualmente
- Um arquivo representa um único comando
- O arquivo DEVE ter extensão .cjs

Base:
```js
const { donoNmr, prefix, donoName, botName, idCanal } = require(path.join(__dirname, '../../configs/settings.json'));

module.exports = {
  name: "base",
  run: async ({ subaru, msg, args, from, sender, isGroup, pushname, reply, seloSz, react, isAdm, isDono, isGroupAdmins, isBotGroupAdmins }) => {
    try {
      // lógica aqui
    } catch (e) {
      console.error(`❌ Erro no plugin base`, e);
      await subaru.sendMessage(from, { text: "⚠️ Erro ao executar o comando." });
    }
  }
};
```

Comando desejado:
(descreva aqui como você quer o comando)
```

---

### 🧠 Parâmetros disponíveis no `run`

> Válidos para **ESM e CJS**. No ESM o bot se chama `finn`, no CJS se chama `subaru`.

| Parâmetro | Descrição |
|-----------|-----------|
| `finn` / `subaru` | Socket Baileys (envio de msg, mídia, reações) |
| `msg` | Mensagem bruta original |
| `args` | Argumentos após o comando |
| `from` | JID do chat |
| `sender` | Autor do comando |
| `isGroup` | Mensagem veio de grupo? |
| `pushname` | Nome do usuário |
| `seloSz` | Assinatura / quoted personalizado |
| `reply` | Função de resposta rápida |
| `react` | Reagir com emoji |
| `isAdm` | Sender é administrador do grupo |
| `isDono` | Sender é dono do bot |
| `isGroupAdmins` | Sender é administrador do grupo |
| `isBotGroupAdmins` | O bot é administrador do grupo |
| `isImage` | Mensagem é uma imagem? |
| `isVideo` | Mensagem é um vídeo? |
| `isSticker` | Mensagem é um sticker? |
| `isAudio` | Mensagem é um áudio? |
| `isDocument` | Mensagem é um documento? |
| `isVisuU2` | Mensagem é visualização única (View Once V2)? |
| `isContact` | Mensagem é um contato? |
| `isLocation` | Mensagem é uma localização? |
| `isProduct` | Mensagem é um produto (WhatsApp Business)? |
| `isMedia` | Mensagem contém algum tipo de mídia? |
| `quoted` | Mensagem citada (reply), se existir |
| `quotedType` | Tipo da mensagem citada |
| `isQuotedMsg` | Reply é uma mensagem simples (conversation)? |
| `isQuotedText` | Reply é texto expandido (extendedTextMessage)? |
| `isQuotedImage` | Reply é uma imagem? |
| `isQuotedVideo` | Reply é um vídeo? |
| `isQuotedAudio` | Reply é um áudio? |
| `isQuotedDocument` | Reply é um documento? |
| `isQuotedSticker` | Reply é um sticker? |
| `isQuotedContact` | Reply é um contato? |
| `isQuotedLocation` | Reply é uma localização? |
| `isQuotedViewOnce` | Reply é mensagem de visualização única? |
| `isQuotedDocW` | Reply é documento com legenda? |
| `imgCaption` | Legenda da imagem |
| `vidCaption` | Legenda do vídeo |

---

### ⚠️ Regras obrigatórias

> [!WARNING]
> Se qualquer regra abaixo for quebrada, o plugin pode falhar.

- ✔ Sempre usar `try/catch`
- ✔ Nunca criar conexão Baileys
- ✔ Nunca usar `process.exit`
- ✔ Nunca escutar eventos globais
- ✔ Um arquivo = um comando
- ✔ Plugins ESM salvos como `.js`, plugins CJS salvos como `.cjs`
- ✔ Você pode adicionar parâmetros ao `run`, mas lembre-se de adicioná-los também no `index.js`

---

### ✅ Resultado esperado

Ao seguir **todas as regras e conceitos deste documento**, o resultado final esperado é:

**🎯 Funcionalidade**
- O comando funciona **imediatamente**, sem ajustes manuais
- O plugin é carregado automaticamente pelo core do Subaru-Base
- O comando responde corretamente no WhatsApp
- Não causa erros globais, travamentos ou conflitos com outros plugins

**🧱 Estrutura**
- O arquivo contém **apenas um comando**
- ESM: exporta `export const name` e `export const run`
- CJS: exporta `module.exports` — arquivo `.cjs`
- Toda a lógica está contida no próprio plugin
- Não há dependência direta do core do bot

**🛡️ Segurança e estabilidade**
- O código está totalmente protegido por `try/catch`
- Erros são tratados de forma silenciosa e segura
- O plugin nunca chama `process.exit`
- Em caso de falha, apenas o comando falha — o bot continua funcionando

**🤖 Compatibilidade com IA**
- Uma IA consegue gerar o comando **somente lendo este arquivo**
- O comando gerado segue o padrão oficial do Subaru-Base
- O resultado é previsível, estável e reutilizável

---
    
### ✅ Em resumo

Se o plugin:
- foi colocado na pasta correta
- segue a estrutura documentada (ESM `.js` ou CJS `.cjs`)
- respeita todas as regras

Então o resultado final é:

> **Um comando pronto para produção, seguro, estável e 100% compatível com o Subaru-Base.**

<p align="center">✨ Subaru-Base • Sistema de plugins</p>
