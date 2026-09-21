"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ED25519_SPKI_PREFIX = exports.ED25519_PKCS8_PREFIX = exports.X25519_SPKI_PREFIX = exports.X25519_PKCS8_PREFIX = void 0;
const bytes_1 = require("../../util/bytes");
exports.X25519_PKCS8_PREFIX = (0, bytes_1.hexToBytes)('302e020100300506032b656e04220420');
exports.X25519_SPKI_PREFIX = (0, bytes_1.hexToBytes)('302a300506032b656e032100');
exports.ED25519_PKCS8_PREFIX = (0, bytes_1.hexToBytes)('302e020100300506032b657004220420');
exports.ED25519_SPKI_PREFIX = (0, bytes_1.hexToBytes)('302a300506032b6570032100');
