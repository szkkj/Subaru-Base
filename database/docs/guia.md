# 📘 Guia de Referência Rápida para Desenvolvedores de Comandos — Subaru-Base

Bem-vindo(a) à documentação oficial dos facilitadores de envio de mensagens da **Subaru-Base**!

Essas funções foram criadas para que você possa responder aos comandos de forma limpa, rápida e com a garantia de que o sistema de **LID (Linked ID)** do WhatsApp está sendo usado corretamente.

> ⚡ **Dica profissional:** Todas as funções a seguir são acessíveis diretamente dentro do seu handler de comando. Elas utilizam o objeto `subaru` (a conexão Baileys) e já tratam internamente a presença, a digitação e o formato correto das mensagens.

---

## 📋 Tabela Comparativa de Mídia

| Tipo de Mídia       | Função de Envio Rápido          | Suporte a Legenda? | Formato do Arquivo      |
|---------------------|---------------------------------|--------------------|-------------------------|
| Imagem              | `enviarImg(link)`               | ❌ Não             | URL (JPEG, PNG)         |
| Imagem              | `enviarImg2(link, legenda)`     | ✅ Sim             | URL (JPEG, PNG)         |
| Vídeo               | `enviarVd(link)`                | ❌ Não             | URL (MP4)               |
| Vídeo               | `enviarVd2(link, legenda)`      | ✅ Sim             | URL (MP4)               |
| Áudio (Gravado)     | `enviarAd(link)`                | ❌ Não             | URL (MP3)               |
| Figurinha (Imagem)  | `sendImageAsSticker2(...)`      | ✅ Metadados       | Buffer, URL ou Arquivo  |
| Figurinha (Vídeo)   | `sendVideoAsSticker2(...)`      | ✅ Metadados       | Buffer, URL ou Arquivo  |

---

## 📨 Facilitadores de Mensagens

### 1. Enviando Mensagens de Texto

| Campo              | Detalhe |
|--------------------|---------|
| **Sintaxe**        | `reply(texto)` |
| **Parâmetros**     | `texto` *(string)* — A mensagem que você deseja enviar. |
| **Suporte LID/Menções** | ✅ Sim — inclua `@` seguido do número para mencionar usuários. |

**Explicação:** Envia uma resposta estilizada, simulando um encaminhamento de canal. Útil para respostas padrão do bot.

```javascript
reply("Olá, bem-vindo ao Subaru-Base!")
```

---

### 2. Enviando Mensagens de Texto Simples (sem Estilo)

| Campo              | Detalhe |
|--------------------|---------|
| **Sintaxe**        | `enviar(texto)` |
| **Parâmetros**     | `texto` *(string)* — A mensagem a ser enviada. |
| **Suporte LID/Menções** | ✅ Sim |

**Explicação:** Envia uma mensagem de texto sem nenhum estilo adicional, apenas com o `quoted` da mensagem original. É a opção mais básica e direta.

```javascript
enviar("Comando executado com sucesso!")
```

---

### 3. Enviando Imagem (Apenas Mídia)

| Campo          | Detalhe |
|----------------|---------|
| **Sintaxe**    | `enviarImg(link)` |
| **Parâmetros** | `link` *(string)* — URL pública da imagem (JPEG, PNG). |

**Explicação:** Envia uma imagem a partir de um link. O WhatsApp faz o download automaticamente.

```javascript
enviarImg("https://i.imgur.com/exemplo.jpg")
```

---

### 4. Enviando Imagem com Legenda

| Campo              | Detalhe |
|--------------------|---------|
| **Sintaxe**        | `enviarImg2(link, texto)` |
| **Parâmetros**     | `link` *(string)* — URL pública da imagem. `texto` *(string)* — Legenda que aparecerá abaixo da imagem. |
| **Suporte LID/Menções** | ✅ Sim — inclua `@` no texto da legenda. |

```javascript
enviarImg2("https://i.imgur.com/exemplo.jpg", "Veja essa imagem incrível!")
```

---

### 5. Enviando Vídeo (Apenas Mídia)

| Campo          | Detalhe |
|----------------|---------|
| **Sintaxe**    | `enviarVd(link)` |
| **Parâmetros** | `link` *(string)* — URL pública do vídeo (MP4). |

**Explicação:** Envia um vídeo sem legenda. O WhatsApp fará o streaming do arquivo.

```javascript
enviarVd("https://exemplo.com/video.mp4")
```

---

### 6. Enviando Vídeo com Legenda

| Campo              | Detalhe |
|--------------------|---------|
| **Sintaxe**        | `enviarVd2(link, texto)` |
| **Parâmetros**     | `link` *(string)* — URL pública do vídeo. `texto` *(string)* — Legenda que aparecerá abaixo do vídeo. |
| **Suporte LID/Menções** | ✅ Sim |

```javascript
enviarVd2("https://exemplo.com/video.mp4", "Assista a este clipe!")
```

---

### 7. Enviando Áudio como Gravação de Voz

| Campo          | Detalhe |
|----------------|---------|
| **Sintaxe**    | `enviarAd(link)` |
| **Parâmetros** | `link` *(string)* — URL pública do áudio (MP3). |

**Explicação:** Envia um arquivo de áudio com `ptt: true` *(Push To Talk)*, fazendo com que o WhatsApp o reproduza como mensagem de voz gravada.

```javascript
enviarAd("https://exemplo.com/audio.mp3")
```

---

### 8. Reagindo a Mensagens

| Campo          | Detalhe |
|----------------|---------|
| **Sintaxe**    | `react(emoji)` ou `reagir(emoji)` |
| **Parâmetros** | `emoji` *(string)* — O emoji usado como reação (ex: `"✅"`, `"❤️"`). |

**Explicação:** Adiciona uma reação à mensagem que acionou o comando. Útil para feedback visual rápido.

```javascript
react("✅")
```

**Atalhos prontos:**

| Função            | Reação |
|-------------------|--------|
| `successReact()`  | ✅     |
| `waitReact()`     | ⏳     |
| `warningReact()`  | ⚠️     |
| `errorReact()`    | ❌     |

---

### 9. Enviando Figurinhas (Stickers)

| Campo          | Detalhe |
|----------------|---------|
| **Sintaxe**    | `sendImageAsSticker2(subaru, from, fonte, quoted, options)` |
| **Parâmetros** | `subaru` — objeto da conexão (já disponível no escopo). `from` — ID do chat (já disponível como `from`). `fonte` — Buffer, URL ou caminho do arquivo de imagem. `quoted` — a mensagem citada (use `info` para a mensagem atual). `options` *(opcional)* — objeto com `packname` e `author`. |

**Explicação:** Converte uma imagem em figurinha e a envia.

```javascript
await sendImageAsSticker2(subaru, from, "https://i.imgur.com/exemplo.jpg", info, {
    packname: "Meu Bot",
    author: "Subaru"
})
```

---

### 10. Enviando Texto com Menções Específicas

| Campo          | Detalhe |
|----------------|---------|
| **Sintaxe**    | `mentions(teks, membrosGrupo, id)` |
| **Parâmetros** | `teks` *(string)* — Texto a enviar (pode conter `@` para menções). `membrosGrupo` *(array)* — Lista de JIDs dos membros. `id` *(string \| null)* — ID opcional para controle interno (geralmente `null`). |

**Explicação:** Menciona um ou mais usuários de forma programática. A função identifica automaticamente os LIDs a partir das tags `@` no texto.

```javascript
await mentions("@pessoa1 @pessoa2 vejam isso!", groupMembers, null)
```

---

## 💡 Dicas de Ouro

### 1. O Poder do Objeto `quoted`

Sempre que você quiser que o bot responda diretamente a uma mensagem, basta usar o objeto `info` como `quoted`. Todos os facilitadores já fazem isso automaticamente. Se for usar `subaru.sendMessage` diretamente:

```javascript
subaru.sendMessage(from, { text: "Resposta!" }, { quoted: info })
```

---

### 2. Entendendo o LID

O WhatsApp moderno utiliza **LIDs (Linked IDs)** para identificar usuários em grupos. Ao criar menções com `@`, a Subaru-Base converte automaticamente o número para o LID correto.

> Você não precisa se preocupar com a formatação técnica — apenas use `@` seguido do número, ex: `@5511999999999`.

---

### 3. Presença e Digitação

Os facilitadores `reply` e `reply2` já simulam `"digitando..."` via `sendPresenceUpdate('composing')`. Se criar sua própria função:

```javascript
await subaru.sendPresenceUpdate('composing', from);
await new Promise(r => setTimeout(r, 1000)); // Pequena pausa
```

---

### 4. Tratamento de Erros

É uma boa prática envolver os facilitadores em um bloco `try...catch`, especialmente ao lidar com downloads de links externos.

```javascript
try {
    await enviarImg("https://link-qualquer.com/imagem.jpg");
} catch (e) {
    errorReact();
    reply("❌ Não foi possível carregar a imagem.");
}
```
