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
exports.toUserJid = exports.splitJid = exports.signalAddressKey = exports.parseSignalAddressFromJid = exports.parsePhoneJid = exports.parseJidFull = exports.normalizeRecipientJid = exports.normalizeDeviceJid = exports.isUserJid = exports.isStatusBroadcastJid = exports.isNewsletterJid = exports.isLidJid = exports.isHostedServer = exports.isHostedDeviceJid = exports.isHostedDeviceId = exports.isGroupOrBroadcastJid = exports.isGroupJid = exports.isBroadcastJid = exports.isBotJid = exports.getLoginIdentity = exports.canonicalizeSignalServer = exports.canonicalizeSignalJid = exports.buildDeviceJid = exports.applyDeviceToJid = void 0;
__exportStar(require("./constants"), exports);
var jid_1 = require("./jid");
Object.defineProperty(exports, "applyDeviceToJid", { enumerable: true, get: function () { return jid_1.applyDeviceToJid; } });
Object.defineProperty(exports, "buildDeviceJid", { enumerable: true, get: function () { return jid_1.buildDeviceJid; } });
Object.defineProperty(exports, "canonicalizeSignalJid", { enumerable: true, get: function () { return jid_1.canonicalizeSignalJid; } });
Object.defineProperty(exports, "canonicalizeSignalServer", { enumerable: true, get: function () { return jid_1.canonicalizeSignalServer; } });
Object.defineProperty(exports, "getLoginIdentity", { enumerable: true, get: function () { return jid_1.getLoginIdentity; } });
Object.defineProperty(exports, "isBotJid", { enumerable: true, get: function () { return jid_1.isBotJid; } });
Object.defineProperty(exports, "isBroadcastJid", { enumerable: true, get: function () { return jid_1.isBroadcastJid; } });
Object.defineProperty(exports, "isGroupJid", { enumerable: true, get: function () { return jid_1.isGroupJid; } });
Object.defineProperty(exports, "isGroupOrBroadcastJid", { enumerable: true, get: function () { return jid_1.isGroupOrBroadcastJid; } });
Object.defineProperty(exports, "isHostedDeviceId", { enumerable: true, get: function () { return jid_1.isHostedDeviceId; } });
Object.defineProperty(exports, "isHostedDeviceJid", { enumerable: true, get: function () { return jid_1.isHostedDeviceJid; } });
Object.defineProperty(exports, "isHostedServer", { enumerable: true, get: function () { return jid_1.isHostedServer; } });
Object.defineProperty(exports, "isLidJid", { enumerable: true, get: function () { return jid_1.isLidJid; } });
Object.defineProperty(exports, "isNewsletterJid", { enumerable: true, get: function () { return jid_1.isNewsletterJid; } });
Object.defineProperty(exports, "isStatusBroadcastJid", { enumerable: true, get: function () { return jid_1.isStatusBroadcastJid; } });
Object.defineProperty(exports, "isUserJid", { enumerable: true, get: function () { return jid_1.isUserJid; } });
Object.defineProperty(exports, "normalizeDeviceJid", { enumerable: true, get: function () { return jid_1.normalizeDeviceJid; } });
Object.defineProperty(exports, "normalizeRecipientJid", { enumerable: true, get: function () { return jid_1.normalizeRecipientJid; } });
Object.defineProperty(exports, "parseJidFull", { enumerable: true, get: function () { return jid_1.parseJidFull; } });
Object.defineProperty(exports, "parsePhoneJid", { enumerable: true, get: function () { return jid_1.parsePhoneJid; } });
Object.defineProperty(exports, "parseSignalAddressFromJid", { enumerable: true, get: function () { return jid_1.parseSignalAddressFromJid; } });
Object.defineProperty(exports, "signalAddressKey", { enumerable: true, get: function () { return jid_1.signalAddressKey; } });
Object.defineProperty(exports, "splitJid", { enumerable: true, get: function () { return jid_1.splitJid; } });
Object.defineProperty(exports, "toUserJid", { enumerable: true, get: function () { return jid_1.toUserJid; } });
