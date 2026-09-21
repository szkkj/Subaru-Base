"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaAppStateSyncClient = exports.parseSyncResponse = exports.WaAppStateCrypto = exports.decodeAppStateSyncKeys = exports.decodeAppStateCollections = exports.decodeAppStateFingerprint = exports.encodeAppStateFingerprint = exports.APP_STATE_EMPTY_LT_HASH = void 0;
var constants_1 = require("./constants");
Object.defineProperty(exports, "APP_STATE_EMPTY_LT_HASH", { enumerable: true, get: function () { return constants_1.APP_STATE_EMPTY_LT_HASH; } });
var encoding_1 = require("./parsers/encoding");
Object.defineProperty(exports, "encodeAppStateFingerprint", { enumerable: true, get: function () { return encoding_1.encodeAppStateFingerprint; } });
Object.defineProperty(exports, "decodeAppStateFingerprint", { enumerable: true, get: function () { return encoding_1.decodeAppStateFingerprint; } });
Object.defineProperty(exports, "decodeAppStateCollections", { enumerable: true, get: function () { return encoding_1.decodeAppStateCollections; } });
Object.defineProperty(exports, "decodeAppStateSyncKeys", { enumerable: true, get: function () { return encoding_1.decodeAppStateSyncKeys; } });
__exportStar(require("./utils"), exports);
var WaAppStateCrypto_1 = require("./crypto/WaAppStateCrypto");
Object.defineProperty(exports, "WaAppStateCrypto", { enumerable: true, get: function () { return WaAppStateCrypto_1.WaAppStateCrypto; } });
var response_parser_1 = require("./parsers/response-parser");
Object.defineProperty(exports, "parseSyncResponse", { enumerable: true, get: function () { return response_parser_1.parseSyncResponse; } });
var WaAppStateSyncClient_1 = require("./sync/WaAppStateSyncClient");
Object.defineProperty(exports, "WaAppStateSyncClient", { enumerable: true, get: function () { return WaAppStateSyncClient_1.WaAppStateSyncClient; } });
