const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const CACHE_DIR = path.join(__dirname, './cache/group_metadata');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

class CacheService {
constructor() {
this.groupMetaMap = new Map();
}

_getPath(groupId) {
return path.join(CACHE_DIR, `${groupId}.json`);
}

saveGroupMetadata(groupId, data) {
try {
const filePath = this._getPath(groupId);
const dataToSave = {
...data,
lastUpdated: moment().toISOString()
};
fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
this.groupMetaMap.set(groupId, dataToSave);
} catch (err) {
console.error(`❌ Erro ao salvar metadata em cache (${groupId}):`, err);
}
}

getGroupMetadata(groupId) {
const filePath = this._getPath(groupId);
if (!groupId.endsWith("@g.us")) return;

try {
if (fs.existsSync(filePath)) {
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
this.groupMetaMap.set(groupId, data);
return data;
}
} catch (err) {
console.warn(`⚠️ Erro lendo metadata JSON (${groupId}):`, err);
}
if (this.groupMetaMap.has(groupId)) {
return this.groupMetaMap.get(groupId);
}

return null;
}

listAllGroupsFromCache() {
try {
if (!fs.existsSync(CACHE_DIR)) {
return [];
}

const files = fs.readdirSync(CACHE_DIR);
const groups = [];

for (const file of files) {
if (file.endsWith('.json')) {
const groupId = file.replace('.json', '');
const filePath = path.join(CACHE_DIR, file);

try {
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

groups.push({
id: groupId,
name: data.subject || 'Sem nome',
participants: data.participants?.length || 0,
admins: data.participants?.filter(p => p.admin).length || 0,
lastUpdated: data.lastUpdated || 'N/A'
});

} catch (err) {
console.warn(`Erro ao ler arquivo ${file}:`, err.message);
}
}
}

return groups;

} catch (err) {
console.error('Erro ao listar grupos do cache:', err);
return [];
}
}

async listAllGroupsFromAPI(conn) {
try {
const groupList = await conn.groupFetchAllParticipating();
const groups = [];

if (!groupList || typeof groupList !== 'object') {
return groups;
}

for (const [groupId, groupData] of Object.entries(groupList)) {
try {
this.saveGroupMetadata(groupId, groupData);

groups.push({
id: groupId,
name: groupData.subject || 'Sem nome',
participants: groupData.participants?.length || 0,
admins: groupData.participants?.filter(p => p.admin).length || 0,
isAnnouncement: groupData.announcement || false
});

} catch (err) {
console.warn(`Erro ao processar grupo ${groupId}:`, err.message);
}
}

return groups;

} catch (err) {
console.error('Erro ao listar grupos da API:', err);
return [];
}
}

async listAllGroups(conn, useCache = true) {
try {
let groups = [];

if (useCache) {
groups = this.listAllGroupsFromCache();

if (groups.length === 0 && conn) {
groups = await this.listAllGroupsFromAPI(conn);
}
} else if (conn) {
groups = await this.listAllGroupsFromAPI(conn);
}

if (!Array.isArray(groups)) {
return [];
}

return groups.sort((a, b) => a.name.localeCompare(b.name));

} catch (err) {
console.error('Erro ao listar grupos:', err);
return [];
}
}


async updateFromAPI(groupId, conn) {
try {
const meta = await conn.groupMetadata(groupId);
this.saveGroupMetadata(groupId, meta);
return meta;
} catch (err) {
console.error(`❌ Erro ao buscar metadata via API (${groupId}):`, err);
return null;
}
}

clearCache(groupId) {
const filePath = this._getPath(groupId);
if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
this.groupMetaMap.delete(groupId);
}
}

const cacheService = new CacheService();
module.exports = { cacheService };