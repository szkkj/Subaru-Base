"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndStoreInitialKeys = createAndStoreInitialKeys;
const keygen_1 = require("../registration/keygen");
/**
 * Bootstraps a fresh Signal identity: generates registration info, the first
 * signed prekey, and the first one-time prekey, then persists them in order
 * so a partial commit can never split bootstrap state.
 */
async function createAndStoreInitialKeys(store, preKeyStore) {
    const [registrationInfo, firstPreKey] = await Promise.all([
        (0, keygen_1.generateRegistrationInfo)(),
        (0, keygen_1.generatePreKeyPair)(1)
    ]);
    const signedPreKey = await (0, keygen_1.generateSignedPreKey)(1, registrationInfo.identityKeyPair.privKey);
    // Keep writes ordered so partial commit failures don't leave split registration bootstrap state.
    await store.setRegistrationInfo(registrationInfo);
    await store.setSignedPreKey(signedPreKey);
    // putPreKey (idempotent), not getOrGenSinglePreKey: a fixed-keyId generator
    // collides with a stale keyId 1 and would spin forever inside getOrGen*.
    await preKeyStore.putPreKey(firstPreKey);
    return {
        registrationInfo,
        signedPreKey,
        firstPreKey
    };
}
