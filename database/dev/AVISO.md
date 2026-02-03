# 📘 Tutorial – Uso do módulo de mensagens interativas (Baileys)

Este documento explica **como usar o arquivo de validação e envio de botões interativos**, de forma **simples, didática e prática**.

O foco é entender **quando usar cada função**, **como montar o payload** e **como interpretar erros**.

## 📌 O que é esse arquivo?

Em uma frase:

> Ele **valida**, **converte** e **envia mensagens interativas (botões)** no WhatsApp usando **Baileys**, evitando payloads inválidos.

Ele resolve três problemas comuns:

* Payload mal formatado
* Botões inválidos para o WhatsApp
* Debug difícil quando algo dá errado

## 🧠 Ideia central (fluxo geral)

```
Seu código
  ↓
sendButtons() ou sendInteractiveMessage()
  ↓
valida payload
  ↓
converte para interactiveMessage
  ↓
envia via Baileys
```

Se algo estiver errado 👉 o código **lança um erro explicativo**.

## 1️⃣ InteractiveValidationError (erro customizado)

### Para que serve?

Sempre que algo falha, você recebe um erro estruturado contendo:

* contexto do erro
* lista de erros
* avisos (warnings)
* exemplo de payload válido

### Exemplo de uso:

```js
try {
  await sendButtons(sock, jid, data)
} catch (err) {
  if (err instanceof InteractiveValidationError) {
    console.log(err.formatDetailed())
  } else {
    console.error(err)
  }
}
```

`formatDetailed()` imprime tudo organizado no terminal.

## 2️⃣ Qual função usar?

### ✅ Uso comum (recomendado)

```js
sendButtons(sock, jid, data)
```

Use essa função em **90% dos casos**.

### ⚠️ Uso avançado

```js
sendInteractiveMessage(sock, jid, content)
```

Use apenas quando:

* você já tem `interactiveButtons` prontos
* precisa de controle total do payload

## 3️⃣ Usando `sendButtons` (modo simples)

### Exemplo mínimo funcional

```js
await sendButtons(sock, '5511999999999@s.whatsapp.net', {
  text: 'Escolha uma opção',
  footer: 'Meu bot',
  buttons: [
    { id: '1', text: 'Opção 1' },
    { id: '2', text: 'Opção 2' }
  ]
})
```

📌 Esse formato (`id` + `text`) é o **legado**. O código converte automaticamente para `quick_reply`.

### Exemplo com botão de link (CTA URL)

```js
await sendButtons(sock, jid, {
  text: 'Acesse o site',
  buttons: [
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: 'Visitar',
        url: 'https://example.com'
      })
    }
  ]
})
```

📌 Tipos aceitos no `sendButtons`:

* `cta_url`
* `cta_copy`
* `cta_call`

Qualquer outro tipo gera erro.

## 4️⃣ Usando `sendInteractiveMessage` (modo avançado)

```js
await sendInteractiveMessage(sock, jid, {
  text: 'Escolha uma ação',
  footer: 'Rodapé',
  interactiveButtons: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: 'Oi',
        id: 'hello'
      })
    },
    {
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: 'Copiar código',
        copy_code: 'ABC123'
      })
    }
  ]
})
```

Essa função:

1. valida o payload
2. converte para `interactiveMessage`
3. valida novamente
4. envia

## 5️⃣ Validações automáticas (importante)

O código valida automaticamente:

* `text` obrigatório
* botões não vazios
* nomes de botões permitidos
* JSON válido em `buttonParamsJson`
* campos obrigatórios por tipo de botão

### Exemplo de regra:

```js
cta_url → display_text + url
```

Erro típico:

```
button[0] (cta_url) missing required field 'url'
```

## 6️⃣ Tipos de botão suportados

### Quick Reply

Campos obrigatórios:

* `display_text`
* `id`

```js
name: 'quick_reply'
```

### CTA

* `cta_url`
* `cta_copy`
* `cta_call`

### Native Flow / Avançados

Alguns exemplos:

* `single_select`
* `send_location`
* `cta_catalog`
* `mpm`
* `wa_payment_transaction_details`

📌 Os campos obrigatórios ficam definidos em:

```js
REQUIRED_FIELDS_MAP
```

## 7️⃣ Como os erros aparecem

Exemplo real:

```
[InteractiveValidationError] Buttons payload invalid (sendButtons.validateSendButtonsPayload)
Errors:
  - button[0] name 'xyz' not allowed
Example payload:
{ ... }
```

👉 Isso facilita muito o debug.

## 8️⃣ Quando usar cada função

| Situação                   | Função                       |
| -------------------------- | ---------------------------- |
| Enviar botões simples      | `sendButtons`                |
| Payload já pronto          | `sendInteractiveMessage`     |
| Apenas validar payload     | `validateSendButtonsPayload` |
| Limpar / normalizar botões | `validateAuthoringButtons`   |

## 🧩 Fluxo mental recomendado

```
1. Monte o payload simples
2. Deixe o validador reclamar
3. Corrija apenas o que o erro pedir
4. Nunca pule a validação
```

## ✅ Conclusão

Esse módulo serve para:

* reduzir erros silenciosos
* padronizar envio de botões
* facilitar manutenção
* deixar o código mais seguro

Se você seguir o fluxo recomendado, **quase nunca terá erro em produção**.

📎 Dica final: transforme esse arquivo em um helper central do projeto e **nunca envie botões direto pelo Baileys**.
