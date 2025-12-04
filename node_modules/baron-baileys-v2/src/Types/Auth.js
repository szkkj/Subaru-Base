"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// Factory functions for creating auth-related objects
function createKeyPair(publicKey, privateKey) {
  return {
    public: publicKey,
    private: privateKey,
  };
}

function createSignedKeyPair(keyPair, signature, keyId, timestampS) {
  return {
    keyPair,
    signature,
    keyId,
    timestampS,
  };
}

// Export type definitions (for documentation purposes)
exports.SignalDataTypeMap = {
  "pre-key": "KeyPair",
  session: "Uint8Array",
  "sender-key": "Uint8Array",
  "sender-key-memory": "object",
  "app-state-sync-key": "proto.Message.IAppStateSyncKeyData",
  "app-state-sync-version": "LTHashState",
  "lid-mapping": "string",
  "device-list": "Array",
  tctoken: "object",
};
exports.SignalDataSet = undefined;
exports.Awaitable = undefined;

// Export the factory functions
exports.createKeyPair = createKeyPair;
exports.createSignedKeyPair = createSignedKeyPair;
