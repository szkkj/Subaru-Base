<p align="center">
  <img src="https://i.postimg.cc/QCfq3crG/506b866c53e721009ee6fccb27aadf04-high.webp" alt="Subaru-Base - Natal" width="400"/>
</p>

<h1 align="center">🤖 Subaru-Base - Edição de natal</h1>

<p align="center">
  Um bot para WhatsApp baseado em <strong>Baileys</strong>, com foco em automação de grupos, brincadeiras, sistemas anti-mídia, jogos, figurinhas, inteligência artificial e muito mais!
</p>

<p align="center">
  <a href="https://github.com/WhiskeySockets/Baileys"><img src="https://img.shields.io/badge/Baileys-Library-blue?style=for-the-badge&logo=whatsapp" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" /></a>
</p>


## ✨ Funcionalidades
`🎵 Música & Mídia`
- Play de áudio/vídeo  
- Downloads de *YouTube*, *TikTok*, *Instagram*, *Facebook*, *Twitter*
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

`🎭 Brincadeiras`
- `chance`, `comer`, `capinarlote`, `pgpeito`, `pgbunda`, `sentar`, etc  
- Respostas interativas e vídeos engraçados  
- Rankings de “gado”, “gay”, “corno”, etc  

`📝 Utilidades`
- Conversão de mídia em *figurinhas*
- Sistema de *contagem de mensagens* (`!minhaatividade`)
- *Boas-vindas automáticas*
- *IA estilo SimSimi* (via [Raikken API](https://raikken-api.speedhosting.cloud))
- *Menu interativo com botões*

## 🚀 Instalação
`Baixe o bot`
📦 [Download direto V1 (MEGA)](https://mega.nz/file/3DxTWBqA#sAYDC5Xvy-oYMuXYAAdIUi1iBiArTSScpG-vuJ0dOvc)

`Comandos para o termux`
```bash
termux-setup-storage
````

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
  "prefix": "!",
  "botName": "Subaru-Base",
  "donoName": "Seu Nome",
  "donoNmr": "5512999999999",
  "donoLid": "99999999999@lid",
  "botLid": "99999999999@lid",
  "RaikkenKey": "SUA_API_KEY",
  "baseRaikken": "https://raikken-api.speedhosting.cloud"
}
```
> [!WARNING] 
> ⚠️ Os comandos por API não funcionam por precisar de uma key, para obter uma nova, entre em contato: WhatsApp

5️⃣ Inicie o bot
`sh start.sh`

> [!WARNING] 
> ⚠️ O bot só responde o `lid` do dono, por isso você deve atualiza. Esse número aparece no console, quando qualquer mensagem é recebida. Após atualizar o lid, use o comando: `!banchat 0`, pois o bot estará inativo em grupos por padrão. 

`💡 Dica:`
Se quiser atualizar o bot no futuro, entre na pasta e use:
`git pull` ou use o comando: `!checarversao`

### ▶️ Uso
Inicie o bot com uma das opções:
`npm start`                # Login via Pairing Code
`node conection.js`        # Login via QR Code
`node conection.js --code`  # Pairing Code (manual)
`sh start.sh`              # Ambos (recomendado)

Depois, use os comandos no WhatsApp conforme o prefixo definido.

> [!WARNING] 
> ⚠️Por padrão, o bot está com o banchat (ignorar comandos) ativos, use o comando: !banchat 0 para ativar no grupo!
Exemplos:
!menu              → Mostra o menu
!sticker           → Cria figurinha
!jogodavelha @membro → Inicia jogo da velha
!minhaatividade    → Mostra suas estatísticas
!play              → Toca música
!tinder            → Funções de Tinder
!ban            → bane o mencionado

## ⚡ Deploy
O bot pode ser hospedado em:
Ambiente	Suporte  
🧩 Termux	✅  
🖥️ Pterodactyl	✅  
🐧 VPS/Linux	✅  
☁️ Heroku	⚠️ (requer ajustes)  


## 👤 Créditos
Base: Baileys
Criação: Sz
Integração IA: Raikken-API

## 📜 Licença
Distribuído sob a Licença MIT.
Sinta-se livre para modificar, melhorar e usar.

## 💀 Considerações — By Sz
Pra ser bem sincero, nem tava nos meus planos escrever esse texto aqui, mas acho que seria injusto não registrar umas coisas importantes.
Então bora lá 👇

Agradecimentos especiais a: Spiral, Reis, Creeper, Thzy, Riki e Duarte, que testaram, deram feedback e ajudaram o bot a ficar como tá hoje.
E claro, Anguish, cuja base inspirou o multi menu usado aqui. 💪

A todos que esperaram esse projeto — obrigado de verdade!
E se você tá lendo até o fim... pô, muito obrigado mesmo 😂
Tamo junto, e se curtir, dá aquela força e segue o canal!

<p align="center">
  <a href="https://wa.me/559292678251">
    <img src="https://img.shields.io/badge/💬%20Falar%20com%20o%20dono-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
  <a href="https://github.com/szkkj/Subaru-Base/">
    <img src="https://img.shields.io/badge/⭐%20Github%20do%20projeto-181717?style=for-the-badge&logo=github" />
  </a>
</p>