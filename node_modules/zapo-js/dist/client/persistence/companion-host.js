"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFileCompanionHostPersistence = createFileCompanionHostPersistence;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const bytes_1 = require("../../util/bytes");
/**
 * File-backed {@link CompanionHostPersistence}: stores the ADV epoch as JSON at
 * `filePath` (the companion identity keys are base64-encoded). Zero native
 * dependencies - the state is tiny (the epoch header plus the linked-companion
 * list). For a database-backed store, implement the two-method
 * `CompanionHostPersistence` contract directly against your DB; there is no need
 * for a dedicated core store domain.
 */
function createFileCompanionHostPersistence(filePath) {
    return {
        async load() {
            let raw;
            try {
                raw = await (0, promises_1.readFile)(filePath, 'utf8');
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
                    companionIdentityPublicKey: (0, bytes_1.base64ToBytes)(companion.companionIdentityPublicKey),
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
                    companionIdentityPublicKey: (0, bytes_1.bytesToBase64)(companion.companionIdentityPublicKey),
                    addedAtSeconds: companion.addedAtSeconds
                }))
            };
            await (0, promises_1.mkdir)((0, node_path_1.dirname)(filePath), { recursive: true });
            const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
            await (0, promises_1.writeFile)(tempPath, JSON.stringify(serialized), 'utf8');
            await (0, promises_1.rename)(tempPath, filePath);
        }
    };
}
