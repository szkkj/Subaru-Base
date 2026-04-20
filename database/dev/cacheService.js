import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LRU from 'pixl-cache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, './cache/group_metadata');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

class CacheService {
    constructor() {
        this.cache = new LRU({
            maxItems: 50,
            maxAge: 3600
        });
    }

    _getPath(groupId) {
        return path.join(CACHE_DIR, `${groupId}.json`);
    }

    saveGroupMetadata(groupId, data) {
        try {
            const dataToSave = { ...data, lastUpdated: Date.now() };
            this.cache.set(groupId, dataToSave);
            const filePath = this._getPath(groupId);
            fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), "utf8");
        } catch (err) {
            console.error(`❌ Erro ao salvar metadata em cache (${groupId}):`, err);
        }
    }

    getGroupMetadata(groupId) {
        if (!groupId.endsWith("@g.us")) return null;
        let data = this.cache.get(groupId);
        if (data) return data;

        const filePath = this._getPath(groupId);
        try {
            if (fs.existsSync(filePath)) {
                data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.cache.set(groupId, data);
                return data;
            }
        } catch (err) {
            console.warn(`⚠️ Erro lendo metadata JSON (${groupId}):`, err);
        }
        return null;
    }

    listAllGroupsFromCache() {
        try {
            if (!fs.existsSync(CACHE_DIR)) return [];
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
            if (!groupList || typeof groupList !== 'object') return groups;

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
                if (groups.length === 0 && conn) groups = await this.listAllGroupsFromAPI(conn);
            } else if (conn) {
                groups = await this.listAllGroupsFromAPI(conn);
            }
            if (!Array.isArray(groups)) return [];
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
        this.cache.delete(groupId);
    }
}

const cacheService = new CacheService();
export { cacheService };