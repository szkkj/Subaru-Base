import { FIELD_P, GROUP_L } from '../math/constants.js';
export function mod(value, modulus = FIELD_P) {
    const remainder = value % modulus;
    return remainder >= 0n ? remainder : remainder + modulus;
}
export function modGroup(value) {
    return mod(value, GROUP_L);
}
