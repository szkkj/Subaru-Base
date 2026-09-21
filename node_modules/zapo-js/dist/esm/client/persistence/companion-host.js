import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { base64ToBytes, bytesToBase64 } from '../../util/bytes.js';
/**
 * File-backed {@link CompanionHostPersistence}: stores the ADV epoch as JSON at
 * `filePath` (the companion identity keys are base64-encoded). Zero native
 * dependencies - the state is tiny (the epoch header plus the linked-companion
 * list). For a database-backed store, implement the two-method
 * `CompanionHostPersistence` contract directly against your DB; there is no need
 * for a dedicated core store domain.
 */
export function createFileCompanionHostPersistence(filePath) {
    return {
        async load() {
            let raw;
            try {
                raw = await readFile(filePath, 'utf8');
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    return null;
                }
                throw error;
            }
            const parsed = JSON.parse(raw);
            return {
                rawId: parsed.rawId,
                currentKeyIndex: parsed.currentKeyIndex,
                companions: parsed.companions.map((companion) => ({
                    deviceJid: companion.deviceJid,
                    keyIndex: companion.keyIndex,
                    companionIdentityPublicKey: base64ToBytes(companion.companionIdentityPublicKey),
                    addedAtSeconds: companion.addedAtSeconds
                }))
            };
        },
        async save(state) {
            const serialized = {
                rawId: state.rawId,
                currentKeyIndex: state.currentKeyIndex,
                companions: state.companions.map((companion) => ({
                    deviceJid: companion.deviceJid,
                    keyIndex: companion.keyIndex,
                    companionIdentityPublicKey: bytesToBase64(companion.companionIdentityPublicKey),
                    addedAtSeconds: companion.addedAtSeconds
                }))
            };
            await mkdir(dirname(filePath), { recursive: true });
            const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
            await writeFile(tempPath, JSON.stringify(serialized), 'utf8');
            await rename(tempPath, filePath);
        }
    };
}
