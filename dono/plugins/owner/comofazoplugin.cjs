/**
 * 📌 PLUGIN BASE – Subaru-BOT
 * 
 * 👉 Estrutura padrão para criação de novos plugins.
 * 
 * Cada plugin precisa exportar um objeto com:
 * - name → nome do comando (sem prefixo)
 * - run  → função principal executada quando o comando é chamado
 * 
 * 🔹 Dentro do `run`, você recebe os seguintes parâmetros já prontos:
 * 
 * { 
 * subaru→ conexão baileys (socket do bot, usado pra enviar msg, áudio, etc)
 * msg  → mensagem original bruta (útil pra pegar dados avançados)
 * args → array com tudo que foi digitado após o comando (ex: "!cmd oi 123" → ["oi","123"])
 * from → JID do chat (ex: "551299999999@s.whatsapp.net" ou ID de grupo)
 * sender→ JID do autor da msg (quem enviou o comando)
 * isGroup  → boolean (true se a msg veio de grupo, false se for PV)
 * pushname → nome de exibição do usuário
 * seloSz→ var personalizada, se você quiser usar como marca d’água / assinatura kkk
 *}
 * 
 * ⚠️ Observações importantes:
 * - Sempre envolva sua lógica num try/catch → evita crash no bot caso dê erro.
 * - Se o plugin não usar `args`, não tem problema → ele vem vazio [] por padrão.
 * - `from` é o que você sempre usa no `sendMessage` → é o chat de destino.
 * - `sender.split("@")[0]` dá o número cru do usuário.
 * 
 * ✅ Passo a passo pra criar um plugin:
 * 1. Copie este arquivo e salve com outro nome (ex: "ping.js")
 * 2. Mude o valor de `name` para o comando que você quer
 * 3. Edite a função `run` com a lógica do seu comando
 * 4. Teste digitando no WhatsApp: <prefixo><nome-do-comando>
 
 Exemplo:

module.exports = {
  name: "base", // 👉 nome do comando (exemplo: se prefixo for "!", o comando é "!base")  
  run: async ({ subaru, msg, args, from, sender, isGroup, pushname, seloSz, reply }) => {
try {
  // 🔹 Exemplo prático de resposta
  await subaru.sendMessage(from, {
text: `📢 Olá ${pushname}!\n\n` +
  `👉 Você usou o comando *${module.exports.name}*.\n` +
  `🔹 Autor: ${sender.split("@")[0]}\n` +
  `🔹 Grupo: ${isGroup ? "Sim" : "Não"}\n` +
  `🔹 Args: ${args.length ? args.join(" ") : "(nenhum)"}\n` +
  `✨ Selo: ${seloSz || "não definido"}`
  });

  /**
*  Aqui é onde você cria a lógica do seu plugin:
* 
* - if/else → tratar argumentos
* - chamadas de API com axios
* - manipular JSON local (dbs do bot)
* - interações com stickers, áudios, imagens, etc
* 
* Exemplos rápidos:
* 
* if (!args[0]) {
*return subaru.sendMessage(from, { text: "⚠️ Você precisa passar um argumento!" });
* }
* 
* const termo = args.join(" ");
* await subaru.sendMessage(from, { text: `🔍 Você pesquisou por: ${termo}` });
  
} catch (e) {
  console.error(`❌ Erro no plugin ${module.exports.name}:`, e);
  await subaru.sendMessage(from, { text: "⚠️ Ocorreu um erro ao executar o comando." });
}
  }
};
*
*/

module.exports = {
  name: "pl",
  run: async ({ subaru, from, isGroup, pushname, seloSz, react }) => {
    try {
    await react("🫦");
      const texto = 
`📢 Oi, esse é um comando de plugin!

🔹 Nome do grupo: ${isGroup ? "Grupo detectado ✅" : "Não é grupo 🚫"}
🔹 Usuário: ${pushname}`
      await subaru.sendMessage(from, { text: texto }, { quoted: seloSz });

    } catch (e) {
      console.error(`❌ Erro no plugin ${module.exports.name}:`, e);
      await subaru.sendMessage(from, { text: "⚠️ Ocorreu um erro ao executar o comando." });
    }
  }
};