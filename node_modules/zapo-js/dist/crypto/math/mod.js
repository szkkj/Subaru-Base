"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mod = mod;
exports.modGroup = modGroup;
const constants_1 = require("../math/constants");
function mod(value, modulus = constants_1.FIELD_P) {
    const remainder = value % modulus;
    return remainder >= 0n ? remainder : remainder + modulus;
}
function modGroup(value) {
    return mod(value, constants_1.GROUP_L);
}
