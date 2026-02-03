const os = require("os")
const path = require("path")
const { sendInteractiveMessage, InteractiveValidationError } = require(path.join(__dirname, '../../../database/dev/botoes.js'))

function formatUptime(seconds) {
const days = Math.floor(seconds / (3600 * 24))
const hours = Math.floor((seconds % (3600 * 24)) / 3600)
const minutes = Math.floor((seconds % 3600) / 60)
const secs = Math.floor(seconds % 60)
return `${days}d ${hours}h ${minutes}m ${secs}s`
}

function countFilesInDir(dirPath) {
try {
return fs.readdirSync(dirPath).length
} catch {
return 0
}
}

module.exports = {
name: "ping",
run: async ({ subaru, msg, from, sender, isGroup, pushname, seloSz, react, reply, prefix }) => {
try {
const fs = require("fs")
const start = Date.now()
await react("⚡")
const end = Date.now()
const latency = end - start

const homeDir = process.env.HOME || process.env.USERPROFILE || "/"
const tmpDir = os.tmpdir()
const tmpFileCount = countFilesInDir(tmpDir)
const hostname = os.hostname()
const nodeVersion = process.version
const cwd = process.cwd()
const botUptime = process.uptime()
const serverUptime = os.uptime()

const totalMem = os.totalmem() / 1024 / 1024
const freeMem = os.freemem() / 1024 / 1024
const usedMem = totalMem - freeMem
const memPercentage = ((usedMem / totalMem) * 100).toFixed(1)

const cpuModel = os.cpus()[0]?.model || "Unknown"
const osRelease = os.release()
const osType = os.type()

const content = {
text: `┌ ◦ *[ ꜱᴇʀᴠᴇʀ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ ]*\n` +
`│ ◦ *ʀᴜɴɴɪɴɢ ᴏɴ* : VPS\n` +
`│ ◦ *ʜᴏᴍᴇ ᴅɪʀ* : ${homeDir}\n` +
`│ ◦ *ᴛᴍᴘ ᴅɪʀ* : ${tmpDir} *( ${tmpFileCount} ꜰɪʟᴇꜱ )*\n` +
`│ ◦ *ʜᴏꜱᴛɴᴀᴍᴇ* : ${hostname}\n` +
`│ ◦ *ɴᴏᴅᴇ ᴠᴇʀꜱɪᴏɴ* : ${nodeVersion}\n` +
`│ ◦ *ᴄᴡᴅ* : ${cwd}\n` +
`│\n` +
`├ ◦ *[ ᴍᴀɴᴀɢᴇᴍᴇɴᴛ ꜱᴇʀᴠᴇʀ ]*\n` +
`│ ◦ *ʙᴏᴛ ꜱᴘᴇᴇᴅ* : ${latency} ms\n` +
`│ ◦ *ᴜᴘᴛɪᴍᴇ ʙᴏᴛ* : ${formatUptime(botUptime)}\n` +
`│ ◦ *ᴜᴘᴛɪᴍᴇ ꜱᴇʀᴠᴇʀ* : ${formatUptime(serverUptime)}\n` +
`│ ◦ *ᴍᴇᴍᴏʀʏ* : ${usedMem.toFixed(1)}MiB / ${totalMem.toFixed(0)}MiB (${memPercentage}%)\n` +
`│ ◦ *ᴄᴘᴜ* : ${cpuModel}\n` +
`│ ◦ *ʀᴇʟᴇᴀꜱᴇ* : ${osRelease}\n` +
`│ ◦ *ᴛʏᴘᴇ* : ${osType}\n` +
`└—`,
footer: "Subaru-Base • Sz",
interactiveButtons: [
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "🌐 Visit Repository",
url: "https://github.com/szkkj/Subaru-Base"
})
}
]
}

await sendInteractiveMessage(subaru, from, content, {
additionalAttributes: {},
useCachedGroupMetadata: true
})

} catch (error) {
if (error instanceof InteractiveValidationError) {
console.error(`❌ Erro no plugin ping`, error)
const errorText = `❌ Erro na validação:\n${error.message}\n\n` +
 `*Server Information*\n` +
 `• Running On : VPS\n` +
 `• Bot Speed : ${end - start} ms\n` +
 `• Node Version : ${process.version}\n` +
 `• Uptime : ${formatUptime(process.uptime())}`
await reply(errorText)
} else {
console.error(`❌ Erro no plugin ping`, error)
await reply("❌ Erro ao executar o comando ping.")
}
}
}
}