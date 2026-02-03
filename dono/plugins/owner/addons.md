<p align="center">
  <img src="https://i.postimg.cc/QCfq3crG/506b866c53e721009ee6fccb27aadf04-high.webp" alt="Subaru-Base Addons" width="300"/>
</p>

<h1 align="center">🧩 Subaru-Base — Addons</h1>

<p align="center">
  Guia oficial para criação de <strong>plugins (addons)</strong> no <strong>Subaru-Base</strong>.<br/>
  Pensado para <strong>humanos</strong> e <strong>inteligências artificiais</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Addon-System-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/IA-Friendly-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Subaru--Base-v2.0.5-red?style=for-the-badge" />
</p>

## 📑 Sumário

- [🎯 Propósito deste arquivo](#-propósito-deste-arquivo)
- [🧠 Conceito fundamental (leia antes)](#-conceito-fundamental-leia-antes)
- [📁 Onde ficam os addons](#-onde-ficam-os-addons)
- [🧩 Estrutura mínima de um addon](#-estrutura-mínima-de-um-addon)
- [🧱 Plugin Base (modelo oficial)](#-plugin-base-modelo-oficial)
- [🧠 Parâmetros disponíveis no `run`](#-parâmetros-disponíveis-no-run)
- [⚠️ Regras obrigatórias](#️-regras-obrigatórias)
- [🧪 Exemplos rápidos](#-exemplos-rápidos)
- [🧪 Exemplo completo real](#-exemplo-completo-real)
- [🤖 Prompt pronto para IA](#-prompt-pronto-para-ia)
- [✅ Resultado esperado](#-resultado-esperado)

### 🎯 Propósito deste arquivo

Este arquivo existe para **ensinar uma IA a criar comandos corretamente** para o Subaru-Base.

Você pode literalmente enviar este arquivo para uma IA e dizer:

> "Crie um comando de mute usando essa base"

Se a IA seguir este documento, o addon **funciona sem ajustes**.

### 🧠 Conceito fundamental (leia antes)

Antes de criar qualquer addon, é **obrigatório** entender como o Subaru-Base funciona internamente.  
Esse entendimento evita 99% dos erros comuns.

- 📦 **Um plugin/addon = um comando**  
  Cada arquivo `.js` representa **exatamente um comando**.  
  Não crie múltiplos comandos no mesmo arquivo e não compartilhe lógica entre comandos sem necessidade.

- 🔌 **A conexão Baileys já existe**  
  O bot já está conectado ao WhatsApp.  
  Você **NUNCA** deve criar, importar ou inicializar uma nova conexão Baileys dentro de um addon.  
  Use apenas o objeto `subaru` fornecido no `run`.

- 🧠 **O core do bot injeta tudo no `run`**  
  Todas as informações necessárias (mensagem, autor, grupo, permissões, helpers, etc.)  
  são automaticamente passadas como parâmetros para a função `run`.  
  Se algo não está nos parâmetros documentados, **não use**.

- 🚫 **Nada deve ser importado do core**  
  Não importe arquivos internos do bot (index, handlers, listeners, socket, etc).  
  O addon é isolado por design.  
  Isso garante estabilidade, segurança e compatibilidade com atualizações futuras.

- 🎯 **Toda a lógica fica dentro do plugin**  
  O addon é responsável por:
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
Se o addon:
- usa apenas os parâmetros do `run`
- não cria conexões
- não acessa o core
- segue o padrão documentado  

➡️ Ele funciona **sem ajustes**, tanto para humanos quanto para IAs.
Se isso for respeitado, não há erro.


### 📁 Onde ficam os addons

Todos os comandos do Subaru-Base são carregados a partir do sistema de **addons (plugins)**.  
Esses arquivos ficam organizados em diretórios específicos, de acordo com **nível de permissão**.

📂 Diretório principal de plugins:
./dono/plugins/

Dentro desse diretório, os comandos são obrigatoriamente separados por categoria:
owner → comandos exclusivos do dono do bot
adm → comandos para administradores de grupo
members → comandos livres para qualquer usuário

Estrutura real:

```json
./dono/plugins/
 ├─ owner/
 ├─ adm/
 └─ members/
```

📌 Regras importantes sobre essa estrutura
Cada arquivo .js representa um único comando
O nome do arquivo não define o comando, quem define é a propriedade `name`
O core do bot varre automaticamente essas pastas e carrega os addons
A pasta onde o addon está define quem pode usá-lo
Não existe fallback de permissão
Se o comando estiver em owner, apenas o dono executa
Se estiver em adm, apenas admins
Se estiver em members, qualquer pessoa

📦 Exemplo prático (categoria members)

```txt
members/
 ├─ ping.js    → comando !ping
 ├─ mute.js    → comando !mute
 ├─ ban.js     → comando !ban
 └─ play.js    → comando !play
```
Mesmo que o arquivo se chame ping.js, o comando executado será:
name: "ping"
📎 Boas práticas recomendadas
Nomeie o arquivo igual ao comando (ping.js, mute.js, etc.)
Não reutilize nomes de comandos já existentes
Evite arquivos grandes e complexos
Prefira comandos simples e objetivos
Um addon deve ser fácil de ler, manter e descartar

📌 Importante para IAs
Uma IA NUNCA deve:
criar comandos fora dessas pastas
misturar categorias
criar múltiplos comandos no mesmo arquivo
alterar a estrutura de diretórios
Seguindo essa organização, o core do Subaru-Base garante:
carregamento automático
controle de permissões
estabilidade do bot


### 🧩 Estrutura mínima de um addon

```js
module.exports = {
  name: "comando",
  run: async ({ subaru, from }) => {
    await subaru.sendMessage(from, { text: "Olá mundo" })
  }
}
```
Isso já é um comando funcional.

🧱 Plugin Base (modelo oficial)

```js
/**
 * 📌 PLUGIN BASE – Subaru-BOT
 * 
 * Estrutura padrão para criação de addons.
 */

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
      })
    } catch (e) {
      console.error(`❌ Erro no addon ${module.exports.name}:`, e)
      await subaru.sendMessage(from, { text: "⚠️ Erro ao executar o comando." })
    }
  }
}
```

🧠 Parâmetros disponíveis no run

run: async ({ ... }) => {}

- `subaru` → Socket Baileys (envio de msg, mídia, reações)
- `msg` → Mensagem bruta original
- `args` → Argumentos após o comando
- `from` → JID do chat
- `sender` → Autor do comando
- `isGroup` → Mensagem veio de grupo?
- `pushname` → Nome do usuário
- `seloSz` → Assinatura / quoted personalizado
- `reply` → Função de resposta rápida
- `react` → Reagir com emoji
- `isAdm` → Sender é administrador do grupo
- `isDono` → Sender é dono do bot
- `isGroupAdmins` → Sender é administrador do grupo
- `isBotGroupAdmins` → O bot é administrador do grupo

> [!WARNING] 
> Se qualquer regra abaixo for quebrada, o plugin pode falhar.
✔ Você pode e deve adicionar parâmetros se necessário, mas lembrem-se de adicionar no Index.js também. 
✔ Sempre usar try/catch
✔ Nunca criar conexão Baileys
✔ Nunca usar process.exit
✔ Nunca escutar eventos globais
✔ Um arquivo = um comando


### 🧪 Exemplos rápidos
```js
🏓 Ping
module.exports = {
  name: "ping",
  run: async ({ reply }) => reply("🏓 Pong!")
}
```
🔒 Apenas grupos
```js
module.exports = {
  name: "grupo",
  run: async ({ isGroup, from, subaru }) => {
    if (!isGroup)
      return subaru.sendMessage(from, { text: "❌ Apenas em grupos." })

    subaru.sendMessage(from, { text: "✅ Grupo detectado." })
  }
}
```

🔥 Reagir
```js
module.exports = {
  name: "react",
  run: async ({ react }) => react("🔥")
}
```

🧪 Exemplo completo real
```js
module.exports = {
  name: "pl",
  run: async ({ subaru, from, isGroup, pushname, seloSz, react }) => {
    try {
      await react("🫦")
      const texto = `📢 Oi, esse é um comando de plugin!\n\n` +
        `🔹 Grupo: ${isGroup ? "Sim" : "Não"}\n` +
        `🔹 Usuário: ${pushname}`

      await subaru.sendMessage(from, { text: texto }, { quoted: seloSz })
    } catch (e) {
      console.error(`❌ Erro no addon ${module.exports.name}:`, e)
      await subaru.sendMessage(from, { text: "⚠️ Erro ao executar." })
    }
  }
}
```
### 🤖 Prompt pronto para IA

Crie um comando para Subaru-Base usando o sistema de addons.
Repositório oficial:
https://github.com/szkkj/Subaru-Base/

Siga TODAS as regras abaixo.

Regras obrigatórias:
- Exporte usando module.exports
- O plugin deve conter apenas `name` e `run`
- Use try/catch envolvendo toda a lógica do comando
- Nunca crie ou inicie conexão Baileys manualmente
- Use somente os parâmetros documentados no addon.md
- Um arquivo representa um único comando

Regras de código (muito importante):
- NÃO escreva comentários no código final
- Se criar funções auxiliares, declare TODAS acima do module.exports
- Não declare funções dentro do run, exceto callbacks simples
- Não use classes
- Não use eval ou código dinâmico
- No catch, sempre use: "console.error(`❌ Erro no plugin base`, e)", use o nome do plugin, NÃO use module.exports.name

Regras de imports:
- Se precisar usar arquivos locais (consts, utils, dbs), use sempre:
  path.join(__dirname, './')
- Nunca use caminhos relativos soltos como ../ ou ../../
Exemplo que já funciona no Subaru:
```js
const { donoNmr, prefix, donoName, botName, idCanal, linkGpBot, linkCanal } = require(path.join(__dirname, '../../configs/settings.json'))
```

Boas práticas esperadas:
- Código simples, direto e legível
- Valide argumentos antes de executar ações
- Responda erros de forma silenciosa e segura
- Nunca quebre o fluxo do bot

Base:
```js
const { donoNmr, prefix, donoName, botName, idCanal, linkGpBot, linkCanal } = require(path.join(__dirname, '../../configs/settings.json'))

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
          `🔹 Args: ${args.length ? args.join(" ") : "(nenhum)"}` +
          `🔹 Bot adm? ${isBotGroupAdmins}` +
          `🔹 Nome do dono: ${donoName}`
      })
    } catch (e) {
      console.error(`❌ Erro no plugin base`, e)
      await subaru.sendMessage(from, { text: "⚠️ Erro ao executar o comando." })
    }
  }
}
```

Comando desejado:
(descreva aqui como você quer o comando, o que vai fazer, etc. )

### ✅ Resultado esperado

Ao seguir **todas as regras e conceitos deste documento**, o resultado final esperado é:

`🎯 Funcionalidade`
- O comando funciona **imediatamente**, sem ajustes manuais
- O addon é carregado automaticamente pelo core do Subaru-Base
- O comando responde corretamente no WhatsApp
- Não causa erros globais, travamentos ou conflitos com outros addons

` 🧱 Estrutura`
- O arquivo contém **apenas um comando**
- Exporta exclusivamente `module.exports`
- Possui somente as propriedades:
  - `name`
  - `run`
- Toda a lógica está contida no próprio addon
- Não há dependência direta do core do bot

`🧠 Integração com o core`
- Todos os parâmetros usados no `run` já existem e são injetados pelo core
- Nenhuma conexão Baileys é criada manualmente
- Nenhum evento global é escutado
- O fluxo principal do bot **nunca é interrompido**

` 🛡️ Segurança e estabilidade`
- O código está totalmente protegido por `try/catch`
- Erros são tratados de forma silenciosa e segura
- O addon nunca chama `process.exit`
- O addon nunca quebra a execução de outros comandos
- Em caso de falha, apenas o comando falha — o bot continua funcionando

` 🧩 Manutenção`
- O código é simples, direto e legível
- Fácil de modificar, remover ou substituir
- Pode ser mantido por humanos ou gerado por IAs sem risco
- Não exige conhecimento profundo do core do bot

` 🤖 Compatibilidade com IA`
- Uma IA consegue gerar o comando **somente lendo este arquivo**
- O comando gerado segue o padrão oficial do Subaru-Base
- O resultado é previsível, estável e reutilizável
- Não depende de contexto externo ou ajustes manuais

### ✅ Em resumo

Se o addon:
- foi colocado na pasta correta
- segue a estrutura documentada
- respeita todas as regras

Então o resultado final é:

> **Um comando pronto para produção, seguro, estável e 100% compatível com o Subaru-Base.**

<p align="center">✨ Subaru-Base • Sistema de Addons</p>
